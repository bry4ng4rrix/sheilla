/* Données de démonstration — ne jamais exécuter sur une base de production. */
import {
  type ContractType,
  type Gender,
  type LeaveStatus,
  type LeaveType,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  type RoleCode,
} from "../src/lib/permissions";
import { addDays, localDay, dayKey } from "../src/lib/dates";
import {
  evaluateDay,
  resolvePlan,
  shiftWindow,
  type ScheduleDef,
  type ShiftDef,
} from "../src/server/services/attendance-engine";
// même client que l'application : fichier SQLite en local, Turso si TURSO_DATABASE_URL est défini
import { prisma } from "../src/lib/prisma";

if (
  process.env.NODE_ENV === "production" &&
  !process.argv.includes("--force")
) {
  console.error("Refus : seed de démonstration interdit en production.");
  process.exit(1);
}
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@jirama.mg";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD;
if (!ADMIN_PASSWORD || !DEMO_PASSWORD) {
  console.error(
    "Définissez SEED_ADMIN_PASSWORD et SEED_DEMO_PASSWORD dans .env avant le seed.",
  );
  process.exit(1);
}

// Générateur pseudo-aléatoire déterministe : même jeu de données à chaque seed
let s = 42;
const rand = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

const D = (v: string) => new Date(`${v}T00:00:00.000Z`);

async function reset() {
  // ordre inverse des dépendances
  await prisma.$transaction([
    prisma.announcementRead.deleteMany(),
    prisma.announcementAttachment.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.attendanceEvent.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.employeeSchedule.deleteMany(),
    prisma.leaveDecision.deleteMany(),
    prisma.leaveAttachment.deleteMany(),
    prisma.leaveRequest.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.contract.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.team.deleteMany(),
    prisma.workSchedule.deleteMany(),
    prisma.shift.deleteMany(),
    prisma.position.deleteMany(),
    prisma.department.deleteMany(),
    prisma.holiday.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.role.deleteMany(),
    prisma.systemSetting.deleteMany(),
  ]);
}

async function main() {
  await reset();

  // ── RBAC
  const perms = await Promise.all(
    Object.entries(PERMISSIONS).map(([code, description]) =>
      prisma.permission.create({ data: { code, description } }),
    ),
  );
  const roles = {} as Record<RoleCode, string>;
  for (const code of Object.keys(ROLE_PERMISSIONS) as RoleCode[]) {
    const role = await prisma.role.create({
      data: {
        code,
        name: ROLE_LABELS[code],
        permissions: {
          create: perms
            .filter((p) => ROLE_PERMISSIONS[code].includes(p.code as never))
            .map((p) => ({ permissionId: p.id })),
        },
      },
    });
    roles[code] = role.id;
  }

  // ── Paramètres & jours fériés (Madagascar 2026)
  await prisma.systemSetting.createMany({
    data: [
      { key: "company.name", value: "JIRAMA Antsirabe" },
      { key: "leave.annualDays", value: "30" },
      { key: "leave.workingDays", value: "0,1,2,3,4" },
      { key: "attendance.overtimeThreshold", value: "30" },
      { key: "attendance.missingCheckoutGrace", value: "120" },
    ],
  });
  const holidays: [string, string][] = [
    ["2026-01-01", "Jour de l'An"],
    ["2026-03-29", "Commémoration des Martyrs"],
    ["2026-04-06", "Lundi de Pâques"],
    ["2026-05-01", "Fête du Travail"],
    ["2026-05-14", "Ascension"],
    ["2026-05-25", "Lundi de Pentecôte"],
    ["2026-06-26", "Fête de l'Indépendance"],
    ["2026-08-15", "Assomption"],
    ["2026-11-01", "Toussaint"],
    ["2026-12-25", "Noël"],
  ];
  await prisma.holiday.createMany({
    data: holidays.map(([d, name]) => ({ date: D(d), name })),
  });

  // ── Organisation
  const depData: [string, string, string, string[]][] = [
    [
      "DIST",
      "Service Distribution",
      "Réseaux d'eau et d'électricité, branchements et dépannages.",
      [
        "Plombier",
        "Électricien",
        "Monteur de ligne",
        "Chef d'équipe dépannage",
      ],
    ],
    [
      "PROD",
      "Service Production",
      "Station de traitement d'eau et centrale hydroélectrique.",
      ["Agent de production eau", "Opérateur de centrale", "Chef de quart"],
    ],
    [
      "ADMFIN",
      "Service Administratif & Financier",
      "Ressources humaines, comptabilité et logistique.",
      [
        "Gestionnaire financier",
        "Comptable",
        "Responsable RH",
        "Assistant administratif",
      ],
    ],
    [
      "COM",
      "Service Commercial & Clientèle",
      "Relève, facturation et relation client.",
      ["Releveur de compteur", "Agent commercial", "Chargé de recouvrement"],
    ],
    [
      "MED",
      "Service Médico-social",
      "Santé au travail du personnel.",
      ["Médecin d'entreprise", "Infirmier"],
    ],
  ];
  const positions: Record<string, string> = {};
  const departments: Record<string, string> = {};
  for (const [code, name, description, titles] of depData) {
    const d = await prisma.department.create({
      data: { code, name, description },
    });
    departments[code] = d.id;
    for (const title of titles)
      positions[title] = (
        await prisma.position.create({ data: { title, departmentId: d.id } })
      ).id;
  }

  // ── Horaires
  const shiftRows: ShiftDef[] = [
    {
      code: "J",
      name: "Journée",
      startTime: "07:30",
      endTime: "16:00",
      graceMinutes: 10,
      color: "#EF8200",
    },
    {
      code: "M",
      name: "Matin",
      startTime: "06:00",
      endTime: "14:00",
      graceMinutes: 10,
      color: "#0EA5E9",
    },
    {
      code: "A",
      name: "Après-midi",
      startTime: "14:00",
      endTime: "22:00",
      graceMinutes: 10,
      color: "#8B5CF6",
    },
    {
      code: "N",
      name: "Nuit",
      startTime: "22:00",
      endTime: "06:00",
      graceMinutes: 10,
      color: "#1E293B",
    },
  ];
  for (const sh of shiftRows) await prisma.shift.create({ data: sh });
  const shiftMap = new Map(shiftRows.map((x) => [x.code, x]));

  const standard = await prisma.workSchedule.create({
    data: {
      name: "Standard bureau",
      category: "STANDARD",
      kind: "WEEKLY",
      pattern: "J,J,J,J,J,R,R",
      isDefault: true,
      description: "Lundi au vendredi, 07h30 – 16h00.",
    },
  });
  const rotation = await prisma.workSchedule.create({
    data: {
      name: "Rotation 3×8 continue",
      category: "ROTATING",
      kind: "CYCLE",
      pattern: "M,M,A,A,N,N,R,R",
      cycleStart: D("2026-01-05"),
      description:
        "Service continu 24h/24 : 2 matins, 2 après-midi, 2 nuits, 2 repos.",
    },
  });
  const shifted = await prisma.workSchedule.create({
    data: {
      name: "Terrain décalé",
      category: "SHIFTED",
      kind: "WEEKLY",
      pattern: "M,M,M,M,M,M,R",
      description: "Équipes de dépannage, du lundi au samedi dès 06h00.",
    },
  });
  await prisma.workSchedule.create({
    data: {
      name: "Veille de nuit",
      category: "NIGHT",
      kind: "WEEKLY",
      pattern: "N,N,N,N,R,R,R",
      description: "Gardiennage et surveillance de nuit.",
    },
  });

  const teams: Record<
    string,
    { id: string; schedule: ScheduleDef; offset: number }
  > = {};
  for (const [i, name] of [
    "Équipe A",
    "Équipe B",
    "Équipe C",
    "Équipe D",
  ].entries()) {
    const t = await prisma.team.create({
      data: {
        name: `Centrale — ${name}`,
        departmentId: departments.PROD,
        scheduleId: rotation.id,
        rotationOffset: i * 2,
        description: "Quart de la station de production.",
      },
    });
    teams[name] = { id: t.id, schedule: rotation, offset: i * 2 };
  }
  const depannage = await prisma.team.create({
    data: {
      name: "Brigade de dépannage",
      departmentId: departments.DIST,
      scheduleId: shifted.id,
      description: "Interventions réseau.",
    },
  });

  // ── Employés
  type E = [
    string,
    string,
    Gender,
    string,
    string,
    ContractType,
    string | null,
  ];
  const people: E[] = [
    [
      "RAKOTOMALALA",
      "Sheilla",
      "F",
      "Responsable RH",
      "2018-03-12",
      "CDI",
      null,
    ],
    [
      "ANDRIANAIVO",
      "Tiana",
      "M",
      "Gestionnaire financier",
      "2015-06-01",
      "CDI",
      null,
    ],
    [
      "RAZAFINDRAKOTO",
      "Hery",
      "M",
      "Plombier",
      "2019-09-16",
      "CDI",
      "depannage",
    ],
    [
      "RANDRIANASOLO",
      "Mamy",
      "M",
      "Électricien",
      "2017-01-09",
      "CDI",
      "depannage",
    ],
    ["RASOANAIVO", "Voahangy", "F", "Comptable", "2020-02-03", "CDI", null],
    [
      "RAKOTONIRINA",
      "Fanja",
      "F",
      "Releveur de compteur",
      "2021-04-12",
      "CDD",
      null,
    ],
    [
      "RANDRIAMAMPIONONA",
      "Lova",
      "M",
      "Monteur de ligne",
      "2016-11-21",
      "CDI",
      "depannage",
    ],
    [
      "RAHARISON",
      "Nirina",
      "F",
      "Médecin d'entreprise",
      "2014-08-04",
      "CDI",
      null,
    ],
    [
      "ANDRIAMIHAJA",
      "Toky",
      "M",
      "Opérateur de centrale",
      "2018-05-14",
      "CDI",
      "Équipe A",
    ],
    [
      "RAVELOMANANA",
      "Haja",
      "M",
      "Agent de production eau",
      "2019-07-01",
      "CDI",
      "Équipe A",
    ],
    [
      "RAZANAMPARANY",
      "Onja",
      "F",
      "Chef de quart",
      "2013-10-07",
      "CDI",
      "Équipe B",
    ],
    [
      "RAKOTOARISOA",
      "Fidy",
      "M",
      "Opérateur de centrale",
      "2020-01-13",
      "CDI",
      "Équipe B",
    ],
    [
      "RANAIVOSON",
      "Rado",
      "M",
      "Agent de production eau",
      "2022-03-01",
      "CDD",
      "Équipe C",
    ],
    [
      "RABEARIVELO",
      "Mialy",
      "F",
      "Opérateur de centrale",
      "2017-09-18",
      "CDI",
      "Équipe C",
    ],
    [
      "RAJAONARISON",
      "Andry",
      "M",
      "Chef de quart",
      "2012-02-20",
      "CDI",
      "Équipe D",
    ],
    [
      "RAMAROSON",
      "Zo",
      "M",
      "Agent de production eau",
      "2023-06-05",
      "CDD",
      "Équipe D",
    ],
    [
      "RASOLOFONIRINA",
      "Hanta",
      "F",
      "Agent commercial",
      "2018-11-05",
      "CDI",
      null,
    ],
    [
      "RAKOTOVAO",
      "Njaka",
      "M",
      "Chargé de recouvrement",
      "2021-08-23",
      "CDI",
      null,
    ],
    [
      "RAFANOMEZANTSOA",
      "Ony",
      "F",
      "Assistant administratif",
      "2022-10-03",
      "CDD",
      null,
    ],
    [
      "RAKOTOZAFY",
      "Tojo",
      "M",
      "Chef d'équipe dépannage",
      "2011-04-11",
      "CDI",
      "depannage",
    ],
    ["RAVAOARIMANANA", "Lalao", "F", "Infirmier", "2019-03-25", "CDI", null],
    [
      "ANDRIANJAFY",
      "Kanto",
      "M",
      "Releveur de compteur",
      "2024-01-08",
      "STAGE",
      null,
    ],
    [
      "RAKOTONDRABE",
      "Miora",
      "F",
      "Agent commercial",
      "2025-02-17",
      "CDD",
      null,
    ],
    [
      "RAJAOBELINA",
      "Solofo",
      "M",
      "Électricien",
      "2025-09-01",
      "CDD",
      "depannage",
    ],
    ["RANDRIANARIVONY", "Tahina", "F", "Comptable", "2026-03-02", "CDD", null],
    [
      "RAZAFIMAHEFA",
      "Jaona",
      "M",
      "Plombier",
      "2026-07-06",
      "STAGE",
      "depannage",
    ],
  ];
  const employees: {
    id: string;
    firstName: string;
    lastName: string;
    teamKey: string | null;
    hireDate: Date;
    gender: Gender;
  }[] = [];
  for (const [
    i,
    [lastName, firstName, gender, title, hire, contractType, teamKey],
  ] of people.entries()) {
    const teamId =
      teamKey === "depannage"
        ? depannage.id
        : teamKey
          ? teams[teamKey].id
          : null;
    const e = await prisma.employee.create({
      data: {
        matricule: `JA-${(1001 + i).toString()}`,
        lastName,
        firstName,
        gender,
        birthDate: D(
          `${1970 + Math.floor(rand() * 30)}-${String(1 + Math.floor(rand() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rand() * 27)).padStart(2, "0")}`,
        ),
        address:
          pick([
            "Lot II A 45 Antsenakely",
            "Mahazoarivo",
            "Antsongo Atsimo",
            "Ambohimena",
            "Tsaramandroso",
            "Andrangy",
            "Mandaniresaka",
          ]) + ", Antsirabe",
        phone: `+261 34 ${Math.floor(10 + rand() * 89)} ${Math.floor(100 + rand() * 899)} ${Math.floor(10 + rand() * 89)}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@jirama.mg`,
        positionId: positions[title],
        teamId,
        hireDate: D(hire),
        contractType,
        contracts: { create: { type: contractType, startDate: D(hire) } },
      },
    });
    employees.push({
      id: e.id,
      firstName,
      lastName,
      teamKey,
      hireDate: D(hire),
      gender,
    });
  }
  // un ancien agent parti : son historique reste consultable (RG08)
  const left = await prisma.employee.create({
    data: {
      matricule: "JA-0987",
      lastName: "RAMANANTSOA",
      firstName: "Patrick",
      gender: "M",
      positionId: positions["Électricien"],
      hireDate: D("2009-05-04"),
      contractType: "CDI",
      status: "LEFT",
      departureDate: D("2026-06-30"),
      deletedAt: D("2026-06-30"),
      address: "Antsirabe",
      contracts: {
        create: {
          type: "CDI",
          startDate: D("2009-05-04"),
          endDate: D("2026-06-30"),
        },
      },
    },
  });

  // ── Comptes
  const [hr, tiana, hery, toky] = [
    employees[0],
    employees[1],
    employees[2],
    employees[8],
  ];
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD!, 12);
  const demoHash = await bcrypt.hash(DEMO_PASSWORD!, 12);
  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: "Administrateur système",
      passwordHash: adminHash,
      roleId: roles.ADMIN,
    },
  });
  const hrUser = await prisma.user.create({
    data: {
      email: "rh@jirama.mg",
      name: "Sheilla Rakotomalala",
      passwordHash: demoHash,
      roleId: roles.HR,
      employeeId: hr.id,
    },
  });
  const empUsers: Record<string, string> = {};
  for (const e of employees.slice(1)) {
    const u = await prisma.user.create({
      data: {
        email: `${e.firstName.toLowerCase()}.${e.lastName.toLowerCase()}@jirama.mg`,
        name: `${e.firstName} ${e.lastName}`,
        passwordHash: demoHash,
        roleId: roles.EMPLOYEE,
        employeeId: e.id,
      },
    });
    empUsers[e.id] = u.id;
  }
  await prisma.user.create({
    data: {
      email: "patrick.ramanantsoa@jirama.mg",
      name: "Patrick Ramanantsoa",
      passwordHash: demoHash,
      roleId: roles.EMPLOYEE,
      employeeId: left.id,
      isActive: false,
    },
  });

  // ── Congés
  const today = localDay();
  const holidaySet = new Set(holidays.map(([d]) => d));
  const leaves: {
    emp: (typeof employees)[number];
    type: LeaveType;
    start: number;
    len: number;
    status: LeaveStatus;
    reason: string;
    comment?: string;
  }[] = [
    {
      emp: tiana,
      type: "ANNUAL",
      start: -2,
      len: 5,
      status: "APPROVED",
      reason: "Congé annuel — voyage familial à Fianarantsoa.",
    },
    {
      emp: hery,
      type: "ANNUAL",
      start: 10,
      len: 7,
      status: "PENDING",
      reason: "Congé annuel pour travaux de la maison familiale.",
    },
    {
      emp: employees[4],
      type: "SICK",
      start: -20,
      len: 3,
      status: "APPROVED",
      reason: "Arrêt maladie prescrit par le médecin.",
    },
    {
      emp: employees[5],
      type: "EXCEPTIONAL",
      start: 3,
      len: 1,
      status: "PENDING",
      reason: "Convocation administrative à la mairie.",
    },
    {
      emp: employees[16],
      type: "ANNUAL",
      start: -40,
      len: 10,
      status: "APPROVED",
      reason: "Congé annuel.",
    },
    {
      emp: employees[17],
      type: "EXCEPTIONAL",
      start: -12,
      len: 1,
      status: "REJECTED",
      reason: "Événement familial.",
      comment:
        "Période d'inventaire : présence indispensable ce jour-là. Merci de reprogrammer.",
    },
    {
      emp: employees[22],
      type: "MATERNITY",
      start: -30,
      len: 98,
      status: "APPROVED",
      reason: "Congé maternité légal (14 semaines).",
    },
    {
      emp: employees[6],
      type: "ANNUAL",
      start: 20,
      len: 4,
      status: "PENDING",
      reason: "Congé annuel — fin d'année.",
    },
    {
      emp: employees[18],
      type: "ANNUAL",
      start: -60,
      len: 3,
      status: "CANCELLED",
      reason: "Déplacement personnel.",
    },
    {
      emp: toky,
      type: "PATERNITY",
      start: -8,
      len: 3,
      status: "APPROVED",
      reason: "Naissance de mon enfant.",
    },
    {
      emp: employees[20],
      type: "ANNUAL",
      start: 5,
      len: 2,
      status: "PENDING",
      reason: "Démarches personnelles.",
    },
  ];
  for (const l of leaves) {
    const start = addDays(today, l.start);
    const end = addDays(start, l.len - 1);
    let days = 0;
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const wd = (d.getUTCDay() + 6) % 7;
      if (
        ["SICK", "MATERNITY", "PATERNITY"].includes(l.type) ||
        (wd < 5 && !holidaySet.has(dayKey(d)))
      )
        days++;
    }
    await prisma.leaveRequest.create({
      data: {
        employeeId: l.emp.id,
        type: l.type,
        startDate: start,
        endDate: end,
        days,
        reason: l.reason,
        status: l.status,
        createdAt: addDays(start, -7),
        cancelledAt: l.status === "CANCELLED" ? addDays(start, -3) : null,
        decisions:
          l.status === "APPROVED" || l.status === "REJECTED"
            ? {
                create: {
                  decision: l.status,
                  comment: l.comment,
                  decidedById: hrUser.id,
                  decidedAt: addDays(start, -5),
                },
              }
            : undefined,
      },
    });
  }
  // historique des demandes sur 12 mois pour les graphiques
  for (let m = 1; m <= 11; m++) {
    for (let k = 0; k < 2 + Math.floor(rand() * 4); k++) {
      const emp = pick(employees.slice(1));
      const start = addDays(today, -m * 30 - Math.floor(rand() * 25));
      if (start < emp.hireDate) continue;
      const len = 1 + Math.floor(rand() * 4);
      const status: LeaveStatus = rand() < 0.8 ? "APPROVED" : "REJECTED";
      await prisma.leaveRequest.create({
        data: {
          employeeId: emp.id,
          type: pick<LeaveType>(["ANNUAL", "ANNUAL", "SICK", "EXCEPTIONAL"]),
          startDate: start,
          endDate: addDays(start, len - 1),
          days: len,
          reason: "Demande historique",
          status,
          createdAt: addDays(start, -5),
          decisions: {
            create: {
              decision: status,
              comment:
                status === "REJECTED"
                  ? "Effectif insuffisant sur la période."
                  : null,
              decidedById: hrUser.id,
              decidedAt: addDays(start, -3),
            },
          },
        },
      });
    }
  }

  // ── Pointages des 60 derniers jours, générés à partir du vrai planning
  const approved = await prisma.leaveRequest.findMany({
    where: { status: "APPROVED" },
  });
  const now = new Date();
  let records = 0;
  for (const e of employees) {
    const team =
      e.teamKey === "depannage"
        ? { schedule: shifted as ScheduleDef, offset: 0 }
        : e.teamKey
          ? teams[e.teamKey]
          : null;
    for (let d = addDays(today, -60); d <= today; d = addDays(d, 1)) {
      if (d < e.hireDate) continue;
      if (
        approved.some(
          (l) => l.employeeId === e.id && l.startDate <= d && l.endDate >= d,
        )
      )
        continue;
      const plan = resolvePlan({
        day: d,
        overrides: [],
        individual: null,
        team: team ? { schedule: team.schedule, offset: team.offset } : null,
        fallback: standard as ScheduleDef,
        isHoliday: holidaySet.has(dayKey(d)),
        shifts: shiftMap,
      });
      if (!plan.shift) continue;
      const w = shiftWindow(d, plan.shift);
      if (w.start > now) continue;
      const r = rand();
      if (r < 0.04) continue; // absence injustifiée
      const late =
        r < 0.16 ? 12 + Math.floor(rand() * 50) : -Math.floor(rand() * 15);
      const checkIn = new Date(w.start.getTime() + late * 60_000);
      let checkOut: Date | null = new Date(
        w.end.getTime() + Math.floor(rand() * 25 - 5) * 60_000,
      );
      if (rand() < 0.03)
        checkOut = new Date(
          w.end.getTime() + (45 + Math.floor(rand() * 90)) * 60_000,
        ); // dépassement
      if (rand() < 0.03 || checkOut > now)
        checkOut = checkOut > now ? null : rand() < 0.5 ? null : checkOut; // oubli de sortie
      const res = evaluateDay({
        day: d,
        shift: plan.shift,
        checkIn,
        checkOut,
        leave: null,
        now,
      });
      await prisma.attendanceRecord.create({
        data: {
          employeeId: e.id,
          date: d,
          checkIn,
          checkOut,
          status: res.status === "UPCOMING" ? "PRESENT" : res.status,
          lateMinutes: res.lateMinutes,
          overtimeMinutes: res.overtimeMinutes,
          anomalies: res.anomalies.join(",") || null,
          events: {
            create: [
              {
                employeeId: e.id,
                type: "IN",
                timestamp: checkIn,
                source: "SELF",
              },
              ...(checkOut
                ? [
                    {
                      employeeId: e.id,
                      type: "OUT" as const,
                      timestamp: checkOut,
                      source: "SELF" as const,
                    },
                  ]
                : []),
            ],
          },
        },
      });
      records++;
    }
  }
  // astreintes de la brigade de dépannage sur les 2 prochains week-ends
  const sat = addDays(today, (12 - today.getUTCDay()) % 7 || 7);
  for (const [i, emp] of [
    employees[3],
    employees[6],
    employees[19],
    employees[2],
  ].entries()) {
    await prisma.employeeSchedule.create({
      data: {
        employeeId: emp.id,
        date: addDays(sat, i < 2 ? i : 7 + i - 2),
        kind: "ON_CALL",
        note: "Astreinte dépannage réseau",
      },
    });
  }

  // ── Annonces
  const ann = [
    {
      title: "Coupure programmée du réseau d'eau — quartier Antsenakely",
      type: "URGENT",
      days: -1,
      content:
        "Dans le cadre des travaux de renforcement de la conduite principale, une coupure d'eau est programmée ce samedi de 08h00 à 15h00 dans le quartier d'Antsenakely.\n\nLes équipes de la brigade de dépannage sont mobilisées. Merci d'informer les usagers qui se présentent à l'agence.",
    },
    {
      title: "Note de service : nouveau dispositif de pointage",
      type: "NOTE_SERVICE",
      days: -6,
      content:
        "À compter de ce mois, chaque agent enregistre son entrée et sa sortie depuis son espace personnel sur l'application GRH.\n\nLes agents postés (centrale, station de traitement) pointent au début et à la fin de leur quart, y compris pour les postes de nuit. Toute anomalie sera traitée par le service RH.",
    },
    {
      title: "Campagne de visite médicale annuelle",
      type: "COMMUNIQUE",
      days: -12,
      content:
        "Le service médico-social organise la visite médicale annuelle obligatoire. Les convocations par service seront affichées. Merci de vous présenter à jeun.",
    },
    {
      title: "Fête de fin d'année du personnel",
      type: "GENERAL",
      days: -3,
      content:
        "Le comité d'entreprise a le plaisir d'inviter l'ensemble du personnel et leurs familles à la fête de fin d'année. Programme et inscriptions auprès du service administratif.",
    },
  ] as const;
  for (const a of ann) {
    const created = await prisma.announcement.create({
      data: {
        title: a.title,
        type: a.type,
        content: a.content,
        status: "PUBLISHED",
        authorId: hrUser.id,
        publishedAt: addDays(now, a.days),
        createdAt: addDays(now, a.days),
      },
    });
    await prisma.announcementRead.createMany({
      data: Object.values(empUsers)
        .slice(0, Math.floor(rand() * 15))
        .map((userId) => ({ announcementId: created.id, userId })),
    });
  }
  await prisma.announcement.create({
    data: {
      title: "Calendrier des congés de fin d'année (brouillon)",
      type: "NOTE_SERVICE",
      content: "Projet de calendrier à valider avec les chefs de service.",
      status: "DRAFT",
      authorId: hrUser.id,
    },
  });

  // ── Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: hrUser.id,
        title: "Nouvelle demande de congé",
        message: "Hery Razafindrakoto — Congé annuel (5 j)",
        link: "/hr/leave-requests",
      },
      {
        userId: hrUser.id,
        title: "Anomalies de pointage",
        message: "Des oublis de sortie sont à traiter.",
        link: "/attendance/anomalies",
      },
      {
        userId: empUsers[hery.id],
        title: "Nouvelle annonce",
        message: "Coupure programmée du réseau d'eau — quartier Antsenakely",
        link: "/announcements",
      },
      {
        userId: empUsers[tiana.id],
        title: "Demande de congé validée",
        message: "Congé annuel validé par le service RH.",
        link: "/leaves",
        readAt: now,
      },
      {
        userId: admin.id,
        title: "Bienvenue",
        message: "La plateforme GRH JIRAMA Antsirabe est initialisée.",
        link: "/dashboard",
      },
    ],
  });
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "system.seed",
      entity: "System",
      after: JSON.stringify({ employees: employees.length, records }),
    },
  });

  console.log(
    `✔ Seed terminé : ${employees.length + 1} employés, ${records} pointages.`,
  );
  console.log(
    `  Admin : ${ADMIN_EMAIL}  |  RH : rh@jirama.mg  |  Employé : hery.razafindrakoto@jirama.mg`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  addDays,
  dayKey,
  hhmmToMinutes,
  localDay,
  localTimeOn,
  parseDay,
} from "@/lib/dates";
import {
  cancelLeave,
  decideLeave,
  submitLeave,
} from "@/server/services/leaves";
import { buildSheet, correctDay, punch } from "@/server/services/attendance";
import { buildReport } from "@/server/services/reports";
import { toPdf, toXlsx } from "@/server/services/report-render";

let hrUser: { id: string; employeeId: string | null };
let emp: { id: string; userId: string };
let nightEmp: { id: string; userId: string };
const today = localDay();
// lundi suffisamment loin dans le futur pour être un jour ouvrable sans férié
const monday = addDays(today, 7 + ((8 - today.getUTCDay()) % 7));

beforeAll(async () => {
  const roles = await Promise.all(
    ["ADMIN", "HR", "EMPLOYEE"].map((code) =>
      prisma.role.create({ data: { code, name: code } }),
    ),
  );
  const dep = await prisma.department.create({
    data: { code: "PROD", name: "Service Production" },
  });
  const pos = await prisma.position.create({
    data: { title: "Opérateur", departmentId: dep.id },
  });
  await prisma.shift.createMany({
    data: [
      { code: "J", name: "Journée", startTime: "07:30", endTime: "16:00" },
      { code: "N", name: "Nuit", startTime: "22:00", endTime: "06:00" },
    ],
  });
  await prisma.workSchedule.create({
    data: {
      name: "Standard",
      category: "STANDARD",
      kind: "WEEKLY",
      pattern: "J,J,J,J,J,R,R",
      isDefault: true,
    },
  });
  const nights = await prisma.workSchedule.create({
    data: {
      name: "Nuits",
      category: "NIGHT",
      kind: "WEEKLY",
      pattern: "N,N,N,N,N,N,N",
    },
  });

  const mk = async (matricule: string, roleIdx: number, extra = {}) => {
    const e = await prisma.employee.create({
      data: {
        matricule,
        firstName: matricule,
        lastName: "Test",
        gender: "F",
        positionId: pos.id,
        hireDate: parseDay("2020-01-01"),
        contractType: "CDI",
        ...extra,
      },
    });
    const u = await prisma.user.create({
      data: {
        email: `${matricule.toLowerCase()}@test.mg`,
        name: matricule,
        passwordHash: "x",
        roleId: roles[roleIdx].id,
        employeeId: e.id,
      },
    });
    return { id: e.id, userId: u.id };
  };
  const hr = await mk("RH-1", 1);
  hrUser = { id: hr.userId, employeeId: hr.id };
  emp = await mk("EMP-1", 2);
  nightEmp = await mk("EMP-2", 2, { scheduleId: nights.id });
});

describe("congés — workflow complet", () => {
  let requestId: string;

  it("soumission : durée calculée et RH notifié", async () => {
    const r = await submitLeave({
      employeeId: emp.id,
      userId: emp.userId,
      type: "ANNUAL",
      startDate: dayKey(monday),
      endDate: dayKey(addDays(monday, 6)),
      reason: "Vacances",
      files: [],
    });
    requestId = r.id;
    expect(r.days).toBe(5);
    expect(r.status).toBe("PENDING");
    expect(
      await prisma.notification.count({ where: { userId: hrUser.id } }),
    ).toBe(1);
  });

  it("chevauchement refusé", async () => {
    await expect(
      submitLeave({
        employeeId: emp.id,
        userId: emp.userId,
        type: "EXCEPTIONAL",
        startDate: dayKey(addDays(monday, 2)),
        endDate: dayKey(addDays(monday, 2)),
        reason: "RDV médical",
        files: [],
      }),
    ).rejects.toThrow(/chevauche/);
  });

  it("congé maladie sans justificatif refusé", async () => {
    await expect(
      submitLeave({
        employeeId: emp.id,
        userId: emp.userId,
        type: "SICK",
        startDate: dayKey(addDays(monday, 14)),
        endDate: dayKey(addDays(monday, 15)),
        reason: "Grippe",
        files: [],
      }),
    ).rejects.toThrow(/certificat/);
  });

  it("solde insuffisant refusé", async () => {
    await expect(
      submitLeave({
        employeeId: emp.id,
        userId: emp.userId,
        type: "ANNUAL",
        startDate: dayKey(addDays(monday, 21)),
        endDate: dayKey(addDays(monday, 80)),
        reason: "Long congé",
        files: [],
      }),
    ).rejects.toThrow(/Solde/);
  });

  it("une demande en attente ne vaut pas absence autorisée (RG04)", async () => {
    const sheet = await buildSheet(
      monday,
      monday,
      { id: emp.id },
      addDays(monday, 2),
    );
    expect(sheet[0].status).toBe("ABSENT");
  });

  it("refus sans motif impossible (RG05)", async () => {
    await expect(
      decideLeave({
        id: requestId,
        decision: "REJECTED",
        comment: "",
        actor: hrUser,
      }),
    ).rejects.toThrow(/RG05/);
  });

  it("un agent RH ne statue pas sur sa propre demande", async () => {
    const own = await submitLeave({
      employeeId: hrUser.employeeId!,
      userId: hrUser.id,
      type: "EXCEPTIONAL",
      startDate: dayKey(monday),
      endDate: dayKey(monday),
      reason: "Démarche",
      files: [],
    });
    await expect(
      decideLeave({
        id: own.id,
        decision: "APPROVED",
        comment: null,
        actor: hrUser,
      }),
    ).rejects.toThrow(/propre demande/);
  });

  it("validation : décision tracée, employé notifié, audit journalisé", async () => {
    await decideLeave({
      id: requestId,
      decision: "APPROVED",
      comment: null,
      actor: hrUser,
    });
    const r = await prisma.leaveRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { decisions: true },
    });
    expect(r.status).toBe("APPROVED");
    expect(r.decisions[0].decidedById).toBe(hrUser.id);
    expect(
      await prisma.notification.count({ where: { userId: emp.userId } }),
    ).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: { action: "leave.approve", entityId: requestId },
      }),
    ).toBe(1);
  });

  it("une demande traitée ne peut plus changer ni être annulée", async () => {
    await expect(
      decideLeave({
        id: requestId,
        decision: "REJECTED",
        comment: "Changement d'avis",
        actor: hrUser,
      }),
    ).rejects.toThrow(/déjà été traitée/);
    await expect(cancelLeave(requestId, emp.id, emp.userId)).rejects.toThrow(
      /en attente/,
    );
  });

  it("le congé validé apparaît dans la feuille de présence", async () => {
    const sheet = await buildSheet(
      monday,
      monday,
      { id: emp.id },
      addDays(monday, 2),
    );
    expect(sheet[0].status).toBe("LEAVE");
  });
});

describe("règles d'intégrité", () => {
  it("RG01 : matricule unique", async () => {
    const pos = await prisma.position.findFirstOrThrow();
    await expect(
      prisma.employee.create({
        data: {
          matricule: "EMP-1",
          firstName: "X",
          lastName: "Y",
          gender: "M",
          positionId: pos.id,
          hireDate: new Date(),
          contractType: "CDI",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
  it("RG02 : un dossier employé ne peut avoir qu'un compte", async () => {
    const role = await prisma.role.findFirstOrThrow();
    await expect(
      prisma.user.create({
        data: {
          email: "doublon@test.mg",
          name: "D",
          passwordHash: "x",
          roleId: role.id,
          employeeId: emp.id,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});

describe("pointages", () => {
  const night = addDays(today, -3);

  it("poste de nuit : la sortie du lendemain clôt la journée de la veille", async () => {
    await punch({
      employeeId: nightEmp.id,
      type: "IN",
      at: localTimeOn(night, hhmmToMinutes("22:20")),
      source: "HR",
      actorId: hrUser.id,
    });
    const rec = await punch({
      employeeId: nightEmp.id,
      type: "OUT",
      at: localTimeOn(night, 24 * 60 + hhmmToMinutes("06:03")),
      source: "HR",
      actorId: hrUser.id,
    });
    expect(dayKey(rec.date)).toBe(dayKey(night));
    expect(rec.status).toBe("LATE");
    expect(rec.lateMinutes).toBe(20);
  });

  it("double entrée en libre-service refusée", async () => {
    const d = addDays(today, -2);
    await punch({
      employeeId: nightEmp.id,
      type: "IN",
      at: localTimeOn(d, hhmmToMinutes("21:55")),
      source: "SELF",
      actorId: nightEmp.userId,
    });
    await expect(
      punch({
        employeeId: nightEmp.id,
        type: "IN",
        at: localTimeOn(d, hhmmToMinutes("22:05")),
        source: "SELF",
        actorId: nightEmp.userId,
      }),
    ).rejects.toThrow(/déjà/);
  });

  it("correction RH : anciennes valeurs conservées dans l'audit", async () => {
    const d = addDays(today, -2);
    await correctDay({
      employeeId: nightEmp.id,
      day: d,
      checkIn: localTimeOn(d, hhmmToMinutes("21:55")),
      checkOut: localTimeOn(d, 24 * 60 + hhmmToMinutes("06:00")),
      manualStatus: null,
      note: "Oubli de sortie confirmé",
      actorId: hrUser.id,
    });
    const log = await prisma.auditLog.findFirstOrThrow({
      where: { action: "attendance.update" },
      orderBy: { createdAt: "desc" },
    });
    expect(JSON.parse(log.before!).checkOut).toBeNull();
    expect(JSON.parse(log.after!).checkOut).not.toBeNull();
  });

  it("un jour non planifié n'est jamais compté absent", async () => {
    // EMP-1 suit le planning standard : samedi et dimanche = repos
    const saturday = addDays(monday, -2);
    const sheet = await buildSheet(
      saturday,
      addDays(saturday, 1),
      { id: emp.id },
      addDays(monday, 1),
    );
    expect(sheet.map((r) => r.status)).toEqual(["OFF", "OFF"]);
  });
});

describe("rapports", () => {
  it("génère les données, le PDF et le fichier Excel", async () => {
    const report = await buildReport("leaves", {
      from: addDays(monday, -1),
      to: addDays(monday, 10),
    });
    expect(report.rows.length).toBeGreaterThanOrEqual(1);
    expect(report.totals?.jours).toBeGreaterThanOrEqual(5);
    const pdf = await toPdf(report, {
      company: "JIRAMA Antsirabe",
      author: "Test",
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const xlsx = await toXlsx(report, {
      company: "JIRAMA Antsirabe",
      author: "Test",
    });
    expect(xlsx.subarray(0, 2).toString()).toBe("PK");
  });
  it("rapport de présence agrégé par agent", async () => {
    const report = await buildReport("attendance", {
      from: addDays(today, -5),
      to: today,
    });
    expect(report.rows.find((r) => r.matricule === "EMP-2")).toBeTruthy();
  });
});

describe("inscription avec validation par l'administrateur", () => {
  it("crée un compte inactif en attente, sans dossier rattaché, et notifie les admins", async () => {
    const { registerAccount } = await import("@/server/services/registration");
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: "ADMIN" } });
    const admin = await prisma.user.create({ data: { email: "admin@test.mg", name: "Admin", passwordHash: "x", roleId: adminRole.id } });
    await registerAccount({ name: "Nouvel Agent", email: "nouvel.agent@test.mg", matricule: "NEW-1", password: "Motdepasse2026" }, "ip-test");
    const u = await prisma.user.findUniqueOrThrow({ where: { email: "nouvel.agent@test.mg" } });
    expect(u.approvalStatus).toBe("PENDING");
    expect(u.isActive).toBe(false);
    expect(u.employeeId).toBeNull();
    expect(u.requestedMatricule).toBe("NEW-1");
    expect(await prisma.notification.count({ where: { userId: admin.id, link: "/admin/registrations" } })).toBe(1);
  });

  it("une adresse déjà utilisée est ignorée sans révéler l'existence du compte", async () => {
    const { registerAccount } = await import("@/server/services/registration");
    await expect(registerAccount({ name: "Usurpateur", email: "emp-1@test.mg", matricule: "EMP-1", password: "Motdepasse2026" }, "ip-test")).resolves.toBeUndefined();
    const u = await prisma.user.findUniqueOrThrow({ where: { email: "emp-1@test.mg" } });
    expect(u.approvalStatus).toBe("APPROVED");
    expect(u.name).toBe("EMP-1");
  });

  it("validation : rattachement au dossier (RG02) puis activation", async () => {
    const { approveRegistration } = await import("@/server/services/registration");
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@test.mg" } });
    const u = await prisma.user.findUniqueOrThrow({ where: { email: "nouvel.agent@test.mg" } });
    // un dossier déjà rattaché à un compte est refusé
    await expect(approveRegistration({ id: u.id, employeeId: emp.id, actorId: admin.id })).rejects.toThrow(/RG02/);
    const pos = await prisma.position.findFirstOrThrow();
    const dossier = await prisma.employee.create({ data: { matricule: "NEW-1", firstName: "Nouvel", lastName: "Agent", gender: "M", positionId: pos.id, hireDate: parseDay("2026-01-05"), contractType: "CDD" } });
    await approveRegistration({ id: u.id, employeeId: dossier.id, actorId: admin.id });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(after).toMatchObject({ approvalStatus: "APPROVED", isActive: true, employeeId: dossier.id });
    expect(await prisma.auditLog.count({ where: { action: "user.approve", entityId: u.id } })).toBe(1);
    await expect(approveRegistration({ id: u.id, employeeId: dossier.id, actorId: admin.id })).rejects.toThrow(/déjà été traitée/);
  });

  it("refus motivé : le compte reste bloqué et le motif est conservé", async () => {
    const { registerAccount, rejectRegistration } = await import("@/server/services/registration");
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@test.mg" } });
    await registerAccount({ name: "Inconnu", email: "inconnu@test.mg", matricule: "XX-9", password: "Motdepasse2026" }, "ip-test-2");
    const u = await prisma.user.findUniqueOrThrow({ where: { email: "inconnu@test.mg" } });
    await rejectRegistration({ id: u.id, note: "Matricule inconnu", actorId: admin.id });
    expect(await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).toMatchObject({ approvalStatus: "REJECTED", isActive: false, reviewNote: "Matricule inconnu" });
  });
});

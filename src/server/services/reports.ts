import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  addDays,
  dayKey,
  fmtDay,
  fmtMinutes,
  fmtTime,
  localDay,
  monthRange,
  parseDay,
} from "@/lib/dates";
import {
  CONTRACT_LABELS,
  EMPLOYEE_STATUS,
  GENDER_LABELS,
  LEAVE_STATUS,
  LEAVE_TYPE_LABELS,
} from "@/lib/labels";
import { buildSheet, summarize, type SheetRow } from "./attendance";

export type Column = {
  key: string;
  label: string;
  width?: number;
  align?: "left" | "right" | "center";
};
export type Report = {
  title: string;
  period: string;
  columns: Column[];
  rows: Record<string, string | number>[];
  totals: Record<string, string | number> | null;
  signature: boolean;
};

export const REPORT_TYPES = {
  employees: "Rapport des employés",
  attendance: "Rapport des présences",
  absences: "Rapport des absences",
  lates: "Rapport des retards",
  leaves: "Rapport des congés",
  departments: "Rapport par service",
  monthly: "Rapport mensuel",
} as const;
export type ReportType = keyof typeof REPORT_TYPES;

export type ReportFilters = {
  from: Date;
  to: Date;
  departmentId?: string;
  employeeId?: string;
  status?: string;
  leaveType?: string;
  month?: string; // YYYY-MM
};

export function parseFilters(
  sp: URLSearchParams | Record<string, string | string[] | undefined>,
): ReportFilters {
  const get = (k: string) => {
    const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k];
    return typeof v === "string" && v ? v : undefined;
  };
  const safe = (v?: string) => {
    try {
      return v ? parseDay(v) : null;
    } catch {
      return null;
    }
  };
  const today = localDay();
  let to = safe(get("to")) ?? today;
  let from = safe(get("from")) ?? addDays(to, -29);
  if (from > to) [from, to] = [to, from];
  if ((to.getTime() - from.getTime()) / 86_400_000 > 366)
    from = addDays(to, -366);
  const month = get("month");
  return {
    from,
    to,
    departmentId: get("department"),
    employeeId: get("employee"),
    status: get("status"),
    leaveType: get("type"),
    month: month && /^\d{4}-\d{2}$/.test(month) ? month : undefined,
  };
}

const empWhere = (f: ReportFilters): Prisma.EmployeeWhereInput => ({
  ...(f.departmentId ? { position: { departmentId: f.departmentId } } : {}),
  ...(f.employeeId ? { id: f.employeeId } : {}),
});
const name = (r: SheetRow) => `${r.employee.lastName} ${r.employee.firstName}`;
const periodLabel = (f: ReportFilters) =>
  `Du ${fmtDay(f.from)} au ${fmtDay(f.to)}`;

function perEmployee(
  sheet: SheetRow[],
  extra?: (rows: SheetRow[]) => Record<string, string | number>,
) {
  const groups = new Map<string, SheetRow[]>();
  for (const r of sheet)
    groups.set(r.employee.id, [...(groups.get(r.employee.id) ?? []), r]);
  return [...groups.values()].map((rows) => {
    const s = summarize(rows);
    return {
      matricule: rows[0].employee.matricule,
      agent: name(rows[0]),
      service: rows[0].employee.position.department.name.replace(
        /^Service /,
        "",
      ),
      planned: s.planned,
      present: s.present,
      late: s.late,
      absent: s.absent,
      leave: s.leave,
      rate: `${s.rate} %`,
      lateMin: fmtMinutes(s.lateMinutes),
      worked: `${Math.round(s.workedMinutes / 60)} h`,
      ...extra?.(rows),
    };
  });
}

const ATTENDANCE_COLS: Column[] = [
  { key: "matricule", label: "Matricule", width: 60 },
  { key: "agent", label: "Agent", width: 130 },
  { key: "service", label: "Service", width: 110 },
  { key: "planned", label: "Jours planifiés", align: "center", width: 55 },
  { key: "present", label: "Présences", align: "center", width: 55 },
  { key: "late", label: "Retards", align: "center", width: 50 },
  { key: "absent", label: "Absences", align: "center", width: 55 },
  { key: "leave", label: "Congés/autor.", align: "center", width: 60 },
  { key: "rate", label: "Taux", align: "right", width: 50 },
  { key: "lateMin", label: "Cumul retards", align: "right", width: 60 },
  { key: "worked", label: "Heures", align: "right", width: 45 },
];

function sumCols(rows: Record<string, string | number>[], keys: string[]) {
  return Object.fromEntries(
    keys.map((k) => [k, rows.reduce((s, r) => s + (Number(r[k]) || 0), 0)]),
  );
}

export async function buildReport(
  type: ReportType,
  f: ReportFilters,
): Promise<Report> {
  switch (type) {
    case "employees": {
      const employees = await prisma.employee.findMany({
        where: {
          ...empWhere(f),
          ...(f.status === "INACTIVE"
            ? { deletedAt: { not: null } }
            : f.status
              ? { status: f.status as never, deletedAt: null }
              : { deletedAt: null }),
        },
        include: { position: { include: { department: true } } },
        orderBy: [
          { position: { department: { name: "asc" } } },
          { lastName: "asc" },
        ],
      });
      const rows = employees.map((e) => ({
        matricule: e.matricule,
        nom: e.lastName,
        prenom: e.firstName,
        sexe: GENDER_LABELS[e.gender],
        service: e.position.department.name.replace(/^Service /, ""),
        poste: e.position.title,
        contrat: CONTRACT_LABELS[e.contractType],
        recrutement: fmtDay(e.hireDate),
        statut: e.deletedAt ? "Désactivé" : EMPLOYEE_STATUS[e.status].label,
      }));
      return {
        title: REPORT_TYPES.employees,
        period: `Situation au ${fmtDay(localDay())}`,
        columns: [
          { key: "matricule", label: "Matricule", width: 60 },
          { key: "nom", label: "Nom", width: 100 },
          { key: "prenom", label: "Prénom", width: 80 },
          { key: "sexe", label: "Sexe", width: 55 },
          { key: "service", label: "Service", width: 110 },
          { key: "poste", label: "Poste", width: 120 },
          { key: "contrat", label: "Contrat", width: 55 },
          { key: "recrutement", label: "Recrutement", width: 70 },
          { key: "statut", label: "Statut", width: 60 },
        ],
        rows,
        totals: {
          matricule: "TOTAL",
          nom: `${rows.length} agent(s)`,
          sexe: `${employees.filter((e) => e.gender === "F").length} F / ${employees.filter((e) => e.gender === "M").length} M`,
        },
        signature: false,
      };
    }
    case "attendance":
    case "monthly": {
      let range = { from: f.from, to: f.to };
      if (type === "monthly") {
        const [y, m] = (f.month ?? dayKey(localDay()).slice(0, 7))
          .split("-")
          .map(Number);
        range = monthRange(y, m - 1);
      }
      const sheet = await buildSheet(range.from, range.to, empWhere(f));
      const rows = perEmployee(sheet);
      const s = summarize(sheet);
      return {
        title:
          type === "monthly"
            ? `${REPORT_TYPES.monthly} — ${new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(range.from)}`
            : REPORT_TYPES.attendance,
        period: `Du ${fmtDay(range.from)} au ${fmtDay(range.to)}`,
        columns: ATTENDANCE_COLS,
        rows,
        totals: {
          matricule: "TOTAL",
          agent: `${rows.length} agent(s)`,
          ...sumCols(rows, ["planned", "present", "late", "absent", "leave"]),
          rate: `${s.rate} %`,
          lateMin: fmtMinutes(s.lateMinutes),
          worked: `${Math.round(s.workedMinutes / 60)} h`,
        },
        signature: true,
      };
    }
    case "absences":
    case "lates": {
      const sheet = await buildSheet(f.from, f.to, empWhere(f));
      const wanted = type === "absences" ? "ABSENT" : "LATE";
      const list = sheet
        .filter((r) => r.status === wanted)
        .sort(
          (a, b) =>
            a.day.getTime() - b.day.getTime() || name(a).localeCompare(name(b)),
        );
      const rows = list.map((r) => ({
        date: fmtDay(r.day),
        matricule: r.employee.matricule,
        agent: name(r),
        service: r.employee.position.department.name.replace(/^Service /, ""),
        prevu: r.plan.shift
          ? `${r.plan.shift.name} ${r.plan.shift.startTime}–${r.plan.shift.endTime}`
          : "—",
        arrivee: fmtTime(r.checkIn),
        retard: r.lateMinutes ? fmtMinutes(r.lateMinutes) : "—",
        observation: r.notes ?? "",
      }));
      const cols: Column[] = [
        { key: "date", label: "Date", width: 70 },
        { key: "matricule", label: "Matricule", width: 60 },
        { key: "agent", label: "Agent", width: 130 },
        { key: "service", label: "Service", width: 110 },
        { key: "prevu", label: "Poste prévu", width: 110 },
        ...(type === "lates"
          ? [
              {
                key: "arrivee",
                label: "Arrivée",
                width: 50,
                align: "center" as const,
              },
              {
                key: "retard",
                label: "Retard",
                width: 55,
                align: "right" as const,
              },
            ]
          : []),
        { key: "observation", label: "Observation", width: 120 },
      ];
      const totalLate = list.reduce((s, r) => s + r.lateMinutes, 0);
      return {
        title: REPORT_TYPES[type],
        period: periodLabel(f),
        columns: cols,
        rows,
        totals: {
          date: "TOTAL",
          agent: `${rows.length} ${type === "absences" ? "absence(s)" : "retard(s)"}`,
          ...(type === "lates" ? { retard: fmtMinutes(totalLate) } : {}),
        },
        signature: true,
      };
    }
    case "leaves": {
      const leaves = await prisma.leaveRequest.findMany({
        where: {
          startDate: { lte: f.to },
          endDate: { gte: f.from },
          ...(f.status ? { status: f.status as never } : {}),
          ...(f.leaveType ? { type: f.leaveType as never } : {}),
          employee: empWhere(f),
        },
        include: {
          employee: {
            include: { position: { include: { department: true } } },
          },
          decisions: {
            include: { decidedBy: { select: { name: true } } },
            orderBy: { decidedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { startDate: "asc" },
      });
      const rows = leaves.map((l) => ({
        matricule: l.employee.matricule,
        agent: `${l.employee.lastName} ${l.employee.firstName}`,
        service: l.employee.position.department.name.replace(/^Service /, ""),
        type: LEAVE_TYPE_LABELS[l.type],
        du: fmtDay(l.startDate),
        au: fmtDay(l.endDate),
        jours: l.days,
        statut: LEAVE_STATUS[l.status].label,
        decideur: l.decisions[0]?.decidedBy.name ?? "—",
      }));
      return {
        title: REPORT_TYPES.leaves,
        period: periodLabel(f),
        columns: [
          { key: "matricule", label: "Matricule", width: 55 },
          { key: "agent", label: "Agent", width: 120 },
          { key: "service", label: "Service", width: 100 },
          { key: "type", label: "Type", width: 105 },
          { key: "du", label: "Du", width: 65 },
          { key: "au", label: "Au", width: 65 },
          { key: "jours", label: "Jours", width: 40, align: "center" },
          { key: "statut", label: "Statut", width: 60 },
          { key: "decideur", label: "Décision par", width: 100 },
        ],
        rows,
        totals: {
          matricule: "TOTAL",
          agent: `${rows.length} demande(s)`,
          jours: rows.reduce((s, r) => s + r.jours, 0),
          statut: `${leaves.filter((l) => l.status === "APPROVED").length} validée(s)`,
        },
        signature: true,
      };
    }
    case "departments": {
      const [sheet, leaves] = await Promise.all([
        buildSheet(f.from, f.to, empWhere(f)),
        prisma.leaveRequest.findMany({
          where: {
            status: "APPROVED",
            startDate: { lte: f.to },
            endDate: { gte: f.from },
          },
          include: {
            employee: {
              include: { position: { include: { department: true } } },
            },
          },
        }),
      ]);
      const byDep = new Map<string, SheetRow[]>();
      for (const r of sheet) {
        const k = r.employee.position.department.name;
        byDep.set(k, [...(byDep.get(k) ?? []), r]);
      }
      const rows = [...byDep.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dep, rs]) => {
          const s = summarize(rs);
          return {
            service: dep,
            agents: new Set(rs.map((r) => r.employee.id)).size,
            planned: s.planned,
            present: s.present,
            late: s.late,
            absent: s.absent,
            rate: `${s.rate} %`,
            lateMin: fmtMinutes(s.lateMinutes),
            conges: leaves
              .filter((l) => l.employee.position.department.name === dep)
              .reduce((x, l) => x + l.days, 0),
          };
        });
      const s = summarize(sheet);
      return {
        title: REPORT_TYPES.departments,
        period: periodLabel(f),
        columns: [
          { key: "service", label: "Service", width: 170 },
          { key: "agents", label: "Agents", align: "center", width: 50 },
          {
            key: "planned",
            label: "Jours planifiés",
            align: "center",
            width: 70,
          },
          { key: "present", label: "Présences", align: "center", width: 60 },
          { key: "late", label: "Retards", align: "center", width: 55 },
          { key: "absent", label: "Absences", align: "center", width: 60 },
          { key: "rate", label: "Taux de présence", align: "right", width: 75 },
          { key: "lateMin", label: "Cumul retards", align: "right", width: 70 },
          {
            key: "conges",
            label: "Jours de congé",
            align: "center",
            width: 70,
          },
        ],
        rows,
        totals: {
          service: "TOTAL",
          ...sumCols(rows, [
            "agents",
            "planned",
            "present",
            "late",
            "absent",
            "conges",
          ]),
          rate: `${s.rate} %`,
          lateMin: fmtMinutes(s.lateMinutes),
        },
        signature: true,
      };
    }
  }
}

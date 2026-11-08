import "server-only";
import type {
  AttendanceStatus,
  Prisma,
  PunchSource,
  PunchType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { addDays, dayKey, localDay } from "@/lib/dates";
import { AUTHORIZATION_TYPES } from "./leave-rules";
import { getSettings } from "./settings";
import {
  evaluateDay,
  resolvePlan,
  workDayForCheckIn,
  type Anomaly,
  type DayResult,
  type Plan,
  type ScheduleDef,
  type ShiftDef,
} from "./attendance-engine";

const employeeInclude = {
  schedule: true,
  team: { include: { schedule: true } },
  position: { include: { department: true } },
} satisfies Prisma.EmployeeInclude;

export type PlannedEmployee = Prisma.EmployeeGetPayload<{
  include: typeof employeeInclude;
}>;

const asSchedule = (
  s: {
    kind: string;
    pattern: string;
    cycleStart: Date | null;
    isActive: boolean;
  } | null,
): ScheduleDef | null =>
  s && s.isActive
    ? {
        kind: s.kind as ScheduleDef["kind"],
        pattern: s.pattern,
        cycleStart: s.cycleStart,
      }
    : null;

/** Charge en une fois tout ce qu'il faut pour calculer le planning et les présences d'une période. */
export async function loadPlanning(
  from: Date,
  to: Date,
  employeeWhere: Prisma.EmployeeWhereInput = {},
) {
  const [shifts, fallback, employees, overrides, holidays, leaves, settings] =
    await Promise.all([
      prisma.shift.findMany({ where: { isActive: true } }),
      prisma.workSchedule.findFirst({
        where: { isDefault: true, isActive: true },
      }),
      prisma.employee.findMany({
        where: employeeWhere,
        include: employeeInclude,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.employeeSchedule.findMany({
        where: { date: { gte: from, lte: to } },
        include: { shift: true },
      }),
      prisma.holiday.findMany({ where: { date: { gte: from, lte: to } } }),
      prisma.leaveRequest.findMany({
        where: {
          status: "APPROVED",
          startDate: { lte: to },
          endDate: { gte: from },
        },
      }),
      getSettings(),
    ]);

  const shiftMap = new Map<string, ShiftDef>(shifts.map((s) => [s.code, s]));
  const holidaySet = new Set(holidays.map((h) => dayKey(h.date)));
  const overridesBy = new Map<
    string,
    { kind: "SHIFT" | "REST" | "ON_CALL"; shiftCode: string | null }[]
  >();
  for (const o of overrides) {
    const k = `${o.employeeId}|${dayKey(o.date)}`;
    overridesBy.set(k, [
      ...(overridesBy.get(k) ?? []),
      { kind: o.kind, shiftCode: o.shift?.code ?? null },
    ]);
  }
  const fallbackDef = asSchedule(fallback);

  function planOf(emp: PlannedEmployee, day: Date): Plan {
    const teamSchedule = emp.team?.isActive
      ? asSchedule(emp.team.schedule)
      : null;
    return resolvePlan({
      day,
      overrides: overridesBy.get(`${emp.id}|${dayKey(day)}`) ?? [],
      individual: asSchedule(emp.schedule),
      team: teamSchedule
        ? { schedule: teamSchedule, offset: emp.team!.rotationOffset }
        : null,
      fallback: fallbackDef,
      isHoliday: holidaySet.has(dayKey(day)),
      shifts: shiftMap,
    });
  }

  /** RG04 : seules les demandes VALIDÉES couvrent une absence. */
  function leaveOf(
    employeeId: string,
    day: Date,
  ): "LEAVE" | "AUTHORIZED" | null {
    const l = leaves.find(
      (x) =>
        x.employeeId === employeeId && x.startDate <= day && x.endDate >= day,
    );
    if (!l) return null;
    return AUTHORIZATION_TYPES.includes(l.type) ? "AUTHORIZED" : "LEAVE";
  }

  return {
    employees,
    planOf,
    leaveOf,
    settings,
    holidays: holidaySet,
    shifts: shiftMap,
  };
}

type Planning = Awaited<ReturnType<typeof loadPlanning>>;

function evaluateRecord(
  planning: Planning,
  emp: PlannedEmployee,
  record: {
    date: Date;
    checkIn: Date | null;
    checkOut: Date | null;
    resolvedAt: Date | null;
    events?: { type: PunchType }[];
  },
  now = new Date(),
): { plan: Plan; result: DayResult } {
  const plan = planning.planOf(emp, record.date);
  const ins = record.events?.filter((e) => e.type === "IN").length ?? 0;
  const outs = record.events?.filter((e) => e.type === "OUT").length ?? 0;
  const result = evaluateDay({
    day: record.date,
    shift: plan.shift,
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    multiplePunches: !record.resolvedAt && (ins > 1 || outs > 1),
    leave: planning.leaveOf(emp.id, record.date),
    now,
    overtimeThreshold: Number(
      planning.settings["attendance.overtimeThreshold"],
    ),
    missingCheckoutGrace: Number(
      planning.settings["attendance.missingCheckoutGrace"],
    ),
  });
  return { plan, result };
}

async function recompute(
  tx: Prisma.TransactionClient,
  recordId: string,
  planning: Planning,
) {
  const record = await tx.attendanceRecord.findUniqueOrThrow({
    where: { id: recordId },
    include: { events: true },
  });
  const emp = planning.employees.find((e) => e.id === record.employeeId);
  if (!emp) return record;
  const { result } = evaluateRecord(planning, emp, record);
  return tx.attendanceRecord.update({
    where: { id: recordId },
    data: {
      status: result.status === "UPCOMING" ? "PRESENT" : result.status,
      lateMinutes: result.lateMinutes,
      overtimeMinutes: result.overtimeMinutes,
      anomalies: result.anomalies.join(",") || null,
    },
  });
}

/** Enregistrement d'un pointage (employé lui-même ou saisie RH). */
export async function punch(params: {
  employeeId: string;
  type: PunchType;
  at?: Date;
  source: PunchSource;
  actorId: string;
  note?: string | null;
}) {
  const at = params.at ?? new Date();
  const today = localDay(at);
  const yesterday = addDays(today, -1);
  const planning = await loadPlanning(yesterday, today, {
    id: params.employeeId,
  });
  const emp = planning.employees[0];
  if (!emp || emp.deletedAt || emp.status !== "ACTIVE")
    throw new AppError("Employé inactif : pointage impossible.");

  return prisma.$transaction(async (tx) => {
    const open = await tx.attendanceRecord.findFirst({
      where: {
        employeeId: emp.id,
        date: { gte: yesterday },
        checkIn: { not: null },
        checkOut: null,
      },
      orderBy: { date: "desc" },
    });
    let recordId: string;

    if (params.type === "IN") {
      if (open && params.source === "SELF")
        throw new AppError(
          "Une entrée est déjà enregistrée : pointez d'abord votre sortie.",
        );
      const day = workDayForCheckIn(at, (d) => planning.planOf(emp, d));
      const existing = await tx.attendanceRecord.findUnique({
        where: { employeeId_date: { employeeId: emp.id, date: day } },
      });
      if (existing?.checkIn && params.source === "SELF")
        throw new AppError(
          "Vous avez déjà pointé votre entrée pour cette journée.",
        );
      const rec = existing
        ? await tx.attendanceRecord.update({
            where: { id: existing.id },
            data: { checkIn: existing.checkIn ?? at },
          })
        : await tx.attendanceRecord.create({
            data: {
              employeeId: emp.id,
              date: day,
              checkIn: at,
              status: "PRESENT",
            },
          });
      recordId = rec.id;
    } else {
      const target =
        open ??
        (await tx.attendanceRecord.findUnique({
          where: { employeeId_date: { employeeId: emp.id, date: today } },
        }));
      const rec = target
        ? await tx.attendanceRecord.update({
            where: { id: target.id },
            data: { checkOut: at },
          })
        : await tx.attendanceRecord.create({
            data: {
              employeeId: emp.id,
              date: today,
              checkOut: at,
              status: "ANOMALY",
            },
          });
      recordId = rec.id;
    }

    await tx.attendanceEvent.create({
      data: {
        employeeId: emp.id,
        recordId,
        type: params.type,
        timestamp: at,
        source: params.source,
        note: params.note,
        createdById: params.actorId,
      },
    });
    return recompute(tx, recordId, planning);
  });
}

/** Saisie / correction administrative d'une journée par les RH, avec conservation des anciennes valeurs. */
export async function correctDay(params: {
  employeeId: string;
  day: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  manualStatus: AttendanceStatus | null;
  note: string;
  actorId: string;
}) {
  const planning = await loadPlanning(params.day, params.day, {
    id: params.employeeId,
  });
  if (!planning.employees[0]) throw new AppError("Employé introuvable.", 404);
  if (params.checkIn && params.checkOut && params.checkOut <= params.checkIn)
    throw new AppError("La sortie doit être postérieure à l'entrée.");

  return prisma.$transaction(async (tx) => {
    const before = await tx.attendanceRecord.findUnique({
      where: {
        employeeId_date: { employeeId: params.employeeId, date: params.day },
      },
    });
    const data = {
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      manualStatus: params.manualStatus,
      notes: params.note,
      resolvedAt: new Date(),
      resolvedById: params.actorId,
    };
    const rec = before
      ? await tx.attendanceRecord.update({ where: { id: before.id }, data })
      : await tx.attendanceRecord.create({
          data: {
            ...data,
            employeeId: params.employeeId,
            date: params.day,
            status: "ABSENT",
          },
        });

    for (const [type, value, old] of [
      ["IN", params.checkIn, before?.checkIn],
      ["OUT", params.checkOut, before?.checkOut],
    ] as const) {
      if (value && value.getTime() !== old?.getTime()) {
        await tx.attendanceEvent.create({
          data: {
            employeeId: params.employeeId,
            recordId: rec.id,
            type,
            timestamp: value,
            source: "HR",
            note: params.note,
            createdById: params.actorId,
          },
        });
      }
    }
    const after = await recompute(tx, rec.id, planning);
    await audit(
      {
        userId: params.actorId,
        action: before ? "attendance.update" : "attendance.create",
        entity: "AttendanceRecord",
        entityId: rec.id,
        before: before && {
          checkIn: before.checkIn,
          checkOut: before.checkOut,
          status: before.manualStatus ?? before.status,
          notes: before.notes,
        },
        after: {
          checkIn: after.checkIn,
          checkOut: after.checkOut,
          status: after.manualStatus ?? after.status,
          notes: after.notes,
        },
      },
      tx,
    );
    return after;
  });
}

export type SheetRow = {
  employee: PlannedEmployee;
  day: Date;
  plan: Plan;
  status: DayResult["status"];
  lateMinutes: number;
  overtimeMinutes: number;
  workedMinutes: number;
  anomalies: Anomaly[];
  checkIn: Date | null;
  checkOut: Date | null;
  recordId: string | null;
  notes: string | null;
  resolved: boolean;
};

/**
 * Feuille de présence calculée : fusionne pointages réels, planning et congés validés.
 * Les absences sont déduites (pas de ligne en base) uniquement pour les jours réellement planifiés.
 * shortcut: calcul en mémoire jour × employé, suffisant pour quelques centaines d'agents ; matérialiser par un job nocturne au-delà.
 */
export async function buildSheet(
  from: Date,
  to: Date,
  employeeWhere: Prisma.EmployeeWhereInput = {},
  now = new Date(),
) {
  const planning = await loadPlanning(from, to, employeeWhere);
  const records = await prisma.attendanceRecord.findMany({
    where: {
      date: { gte: from, lte: to },
      employeeId: { in: planning.employees.map((e) => e.id) },
    },
    include: { events: { select: { type: true } } },
  });
  const recordBy = new Map(
    records.map((r) => [`${r.employeeId}|${dayKey(r.date)}`, r]),
  );
  const lastDay = localDay(now) < to ? localDay(now) : to;
  const rows: SheetRow[] = [];

  for (const emp of planning.employees) {
    for (let day = from; day <= lastDay; day = addDays(day, 1)) {
      const record = recordBy.get(`${emp.id}|${dayKey(day)}`);
      if (!record) {
        if (day < emp.hireDate) continue;
        if (emp.departureDate && day > emp.departureDate) continue;
        if (emp.deletedAt && day >= localDay(emp.deletedAt)) continue;
      }
      const { plan, result } = record
        ? evaluateRecord(planning, emp, record, now)
        : evaluateRecord(
            planning,
            emp,
            { date: day, checkIn: null, checkOut: null, resolvedAt: null },
            now,
          );
      rows.push({
        employee: emp,
        day,
        plan,
        status: record?.manualStatus ?? result.status,
        lateMinutes:
          record?.manualStatus && record.manualStatus !== "LATE"
            ? 0
            : result.lateMinutes,
        overtimeMinutes: result.overtimeMinutes,
        workedMinutes: result.workedMinutes,
        anomalies: record?.resolvedAt ? [] : result.anomalies,
        checkIn: record?.checkIn ?? null,
        checkOut: record?.checkOut ?? null,
        recordId: record?.id ?? null,
        notes: record?.notes ?? null,
        resolved: !!record?.resolvedAt,
      });
    }
  }
  return rows;
}

/** Lignes nécessitant un traitement RH. */
export function isAnomalyRow(r: SheetRow) {
  return (
    !r.resolved &&
    (r.status === "ABSENT" ||
      r.status === "ANOMALY" ||
      r.status === "LATE" ||
      r.anomalies.length > 0)
  );
}

export function summarize(rows: SheetRow[]) {
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const present = count("PRESENT") + count("LATE");
  const absent = count("ABSENT");
  const planned = present + absent + count("ANOMALY");
  return {
    present,
    absent,
    late: count("LATE"),
    anomaly: count("ANOMALY"),
    leave: count("LEAVE") + count("AUTHORIZED"),
    off: count("OFF"),
    planned,
    rate: planned ? Math.round((present / planned) * 1000) / 10 : 0,
    lateMinutes: rows.reduce((s, r) => s + r.lateMinutes, 0),
    workedMinutes: rows.reduce((s, r) => s + r.workedMinutes, 0),
  };
}

/** Situation du jour pour l'espace personnel : poste prévu, pointage en cours éventuel. */
export async function myToday(employeeId: string, now = new Date()) {
  const today = localDay(now);
  const yesterday = addDays(today, -1);
  const planning = await loadPlanning(yesterday, today, { id: employeeId });
  const emp = planning.employees[0];
  if (!emp) return null;
  const open = await prisma.attendanceRecord.findFirst({
    where: {
      employeeId,
      date: { gte: yesterday },
      checkIn: { not: null },
      checkOut: null,
    },
    orderBy: { date: "desc" },
  });
  const workDay =
    open?.date ?? workDayForCheckIn(now, (d) => planning.planOf(emp, d));
  const record =
    open ??
    (await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: workDay } },
    }));
  const plan = planning.planOf(emp, workDay);
  return {
    workDay,
    plan,
    record,
    leave: planning.leaveOf(employeeId, workDay),
    holiday: planning.holidays.has(dayKey(workDay)),
  };
}

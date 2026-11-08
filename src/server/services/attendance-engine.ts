import type { AttendanceStatus } from "@prisma/client";
import {
  addDays,
  daysBetween,
  hhmmToMinutes,
  localDay,
  localTimeOn,
  weekdayIndex,
} from "@/lib/dates";

export type ShiftDef = {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  color: string;
};
export type ScheduleDef = {
  kind: "WEEKLY" | "CYCLE";
  pattern: string;
  cycleStart: Date | null;
};
export type OverrideDef = {
  kind: "SHIFT" | "REST" | "ON_CALL";
  shiftCode: string | null;
};

export type Plan = {
  shift: ShiftDef | null;
  onCall: boolean;
  source: "override" | "individual" | "team" | "default" | "none";
};

export const REST = "R";

export function crossesMidnight(
  shift: Pick<ShiftDef, "startTime" | "endTime">,
) {
  return hhmmToMinutes(shift.endTime) <= hhmmToMinutes(shift.startTime);
}

/** Fenêtre réelle d'un poste ; un poste de nuit (fin <= début) se termine le lendemain. */
export function shiftWindow(
  day: Date,
  shift: Pick<ShiftDef, "startTime" | "endTime">,
) {
  const start = hhmmToMinutes(shift.startTime);
  let end = hhmmToMinutes(shift.endTime);
  if (end <= start) end += 24 * 60;
  return { start: localTimeOn(day, start), end: localTimeOn(day, end) };
}

export function shiftMinutes(shift: Pick<ShiftDef, "startTime" | "endTime">) {
  const w = shiftWindow(new Date(0), shift);
  return (w.end.getTime() - w.start.getTime()) / 60_000;
}

/** Code de poste prévu par un planning pour un jour donné. */
export function codeForDay(
  schedule: ScheduleDef,
  day: Date,
  offset = 0,
): string {
  const codes = schedule.pattern
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  if (!codes.length) return REST;
  if (schedule.kind === "WEEKLY") return codes[weekdayIndex(day)] ?? REST;
  const base = schedule.cycleStart ?? new Date(0);
  const idx =
    (((daysBetween(base, day) + offset) % codes.length) + codes.length) %
    codes.length;
  return codes[idx];
}

/**
 * Résolution du planning d'un employé pour un jour :
 * dérogation individuelle > planning individuel > planning de l'équipe (avec décalage) > planning par défaut.
 * Les jours fériés sont chômés pour les plannings hebdomadaires, travaillés pour les rotations (service continu).
 */
export function resolvePlan(input: {
  day: Date;
  overrides: OverrideDef[];
  individual: ScheduleDef | null;
  team: { schedule: ScheduleDef; offset: number } | null;
  fallback: ScheduleDef | null;
  isHoliday: boolean;
  shifts: Map<string, ShiftDef>;
}): Plan {
  const onCall = input.overrides.some((o) => o.kind === "ON_CALL");
  const direct = input.overrides.find((o) => o.kind !== "ON_CALL");
  if (direct) {
    const shift =
      direct.kind === "SHIFT" && direct.shiftCode
        ? (input.shifts.get(direct.shiftCode) ?? null)
        : null;
    return { shift, onCall, source: "override" };
  }
  const pick: [ScheduleDef, number, Plan["source"]] | null = input.individual
    ? [input.individual, 0, "individual"]
    : input.team
      ? [input.team.schedule, input.team.offset, "team"]
      : input.fallback
        ? [input.fallback, 0, "default"]
        : null;
  if (!pick) return { shift: null, onCall, source: "none" };
  const [schedule, offset, source] = pick;
  if (input.isHoliday && schedule.kind === "WEEKLY")
    return { shift: null, onCall, source };
  const code = codeForDay(schedule, input.day, offset);
  return {
    shift: code === REST ? null : (input.shifts.get(code) ?? null),
    onCall,
    source,
  };
}

export type Anomaly =
  | "MISSING_CHECKIN"
  | "MISSING_CHECKOUT"
  | "INCOHERENT"
  | "MULTIPLE_PUNCHES"
  | "OVERTIME"
  | "UNPLANNED";

export const ANOMALY_LABELS: Record<Anomaly, string> = {
  MISSING_CHECKIN: "Sortie sans entrée",
  MISSING_CHECKOUT: "Entrée sans sortie",
  INCOHERENT: "Horaires incohérents",
  MULTIPLE_PUNCHES: "Pointages multiples",
  OVERTIME: "Dépassement horaire",
  UNPLANNED: "Pointage hors planning",
};

/** Anomalies bloquantes (le statut devient ANOMALY) ; les autres sont informatives. */
const BLOCKING: Anomaly[] = [
  "MISSING_CHECKIN",
  "MISSING_CHECKOUT",
  "INCOHERENT",
  "MULTIPLE_PUNCHES",
];

export type DayResult = {
  status: AttendanceStatus | "UPCOMING";
  lateMinutes: number;
  overtimeMinutes: number;
  workedMinutes: number;
  anomalies: Anomaly[];
};

export function evaluateDay(input: {
  day: Date;
  shift: ShiftDef | null;
  checkIn: Date | null;
  checkOut: Date | null;
  multiplePunches?: boolean;
  leave: "LEAVE" | "AUTHORIZED" | null;
  now?: Date;
  overtimeThreshold?: number;
  missingCheckoutGrace?: number;
}): DayResult {
  const { day, shift, checkIn, checkOut, leave } = input;
  const now = input.now ?? new Date();
  const result: DayResult = {
    status: "PRESENT",
    lateMinutes: 0,
    overtimeMinutes: 0,
    workedMinutes: 0,
    anomalies: [],
  };

  // RG04 : seul un congé VALIDÉ arrive ici (les demandes en attente ne sont pas transmises)
  if (leave) return { ...result, status: leave };

  if (checkIn && checkOut) {
    if (checkOut <= checkIn) result.anomalies.push("INCOHERENT");
    else
      result.workedMinutes = Math.round(
        (checkOut.getTime() - checkIn.getTime()) / 60_000,
      );
  }
  if (input.multiplePunches) result.anomalies.push("MULTIPLE_PUNCHES");

  if (!shift) {
    // Non planifié ce jour-là : jamais "absent"
    if (!checkIn && !checkOut) return { ...result, status: "OFF" };
    result.anomalies.push("UNPLANNED");
    if (!checkIn) result.anomalies.push("MISSING_CHECKIN");
    else if (!checkOut && now.getTime() > checkIn.getTime() + 16 * 3_600_000)
      result.anomalies.push("MISSING_CHECKOUT");
    result.status = result.anomalies.some((a) => BLOCKING.includes(a))
      ? "ANOMALY"
      : "PRESENT";
    return result;
  }

  const w = shiftWindow(day, shift);
  if (!checkIn && !checkOut)
    return { ...result, status: now > w.end ? "ABSENT" : "UPCOMING" };

  if (!checkIn) result.anomalies.push("MISSING_CHECKIN");
  if (
    checkIn &&
    !checkOut &&
    now.getTime() >
      w.end.getTime() + (input.missingCheckoutGrace ?? 120) * 60_000
  ) {
    result.anomalies.push("MISSING_CHECKOUT");
  }
  if (checkIn) {
    const late = Math.floor((checkIn.getTime() - w.start.getTime()) / 60_000);
    if (late > shift.graceMinutes) result.lateMinutes = late;
  }
  if (checkOut) {
    const over = Math.floor((checkOut.getTime() - w.end.getTime()) / 60_000);
    if (over >= (input.overtimeThreshold ?? 30)) {
      result.overtimeMinutes = over;
      result.anomalies.push("OVERTIME");
    }
  }
  result.status = result.anomalies.some((a) => BLOCKING.includes(a))
    ? "ANOMALY"
    : result.lateMinutes
      ? "LATE"
      : "PRESENT";
  return result;
}

/**
 * Jour de travail auquel rattacher une ENTRÉE : la veille si un poste de nuit commencé la veille est encore en cours,
 * sinon le jour local courant.
 */
export function workDayForCheckIn(at: Date, planOf: (day: Date) => Plan): Date {
  const today = localDay(at);
  const yesterday = addDays(today, -1);
  const prev = planOf(yesterday).shift;
  if (prev && crossesMidnight(prev) && at < shiftWindow(yesterday, prev).end)
    return yesterday;
  return today;
}

import type { LeaveType } from "@prisma/client";
import { addDays, dayKey, weekdayIndex } from "@/lib/dates";

/** Types comptés en jours calendaires (arrêt maladie, maternité, paternité) ; les autres en jours ouvrables. */
export const CALENDAR_DAY_TYPES: LeaveType[] = [
  "SICK",
  "MATERNITY",
  "PATERNITY",
];

/** Types qui donnent un statut "Autorisation d'absence" plutôt que "Congé validé" dans les présences. */
export const AUTHORIZATION_TYPES: LeaveType[] = ["EXCEPTIONAL", "OTHER"];

export type Calendar = { workingDays: Set<number>; holidays: Set<string> };

export function countLeaveDays(
  type: LeaveType,
  start: Date,
  end: Date,
  cal: Calendar,
): number {
  if (end < start) return 0;
  let days = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (CALENDAR_DAY_TYPES.includes(type)) days++;
    else if (
      cal.workingDays.has(weekdayIndex(d)) &&
      !cal.holidays.has(dayKey(d))
    )
      days++;
  }
  return days;
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/** RG04 : seul le statut PENDING peut recevoir une décision ; seul PENDING peut être annulé par l'employé. */
export function assertTransition(
  from: string,
  to: "APPROVED" | "REJECTED" | "CANCELLED",
) {
  if (from !== "PENDING")
    throw new Error(`Transition interdite : ${from} → ${to}`);
}

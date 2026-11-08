import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/dates";
import type { Calendar } from "./leave-rules";

export const DEFAULT_SETTINGS = {
  "company.name": "JIRAMA Antsirabe",
  "leave.annualDays": "30",
  "leave.workingDays": "0,1,2,3,4",
  "attendance.overtimeThreshold": "30",
  "attendance.missingCheckoutGrace": "120",
};
export type SettingKey = keyof typeof DEFAULT_SETTINGS;

export async function getSettings(): Promise<Record<SettingKey, string>> {
  const rows = await prisma.systemSetting.findMany();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in out) out[r.key as SettingKey] = r.value;
  return out;
}

export async function getCalendar(from: Date, to: Date): Promise<Calendar> {
  const [settings, holidays] = await Promise.all([
    getSettings(),
    prisma.holiday.findMany({ where: { date: { gte: from, lte: to } } }),
  ]);
  return {
    workingDays: new Set(settings["leave.workingDays"].split(",").map(Number)),
    holidays: new Set(holidays.map((h) => dayKey(h.date))),
  };
}

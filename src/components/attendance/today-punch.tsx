import { fmtDay, fmtTime } from "@/lib/dates";
import { LEAVE_TYPE_LABELS } from "@/lib/labels";
import { myToday } from "@/server/services/attendance";
import { crossesMidnight } from "@/server/services/attendance-engine";
import { PunchCard } from "./punch-card";

export async function TodayPunch({
  employeeId,
  highlight,
}: {
  employeeId: string;
  highlight?: "IN" | "OUT";
}) {
  const t = await myToday(employeeId);
  if (!t) return null;
  const s = t.plan.shift;
  return (
    <PunchCard
      dayLabel={`Journée du ${fmtDay(t.workDay)}${t.holiday ? " · férié" : ""}`}
      shift={
        s
          ? {
              name: s.name,
              start: s.startTime,
              end: s.endTime,
              color: s.color,
              night: crossesMidnight(s),
            }
          : null
      }
      checkIn={t.record?.checkIn ? fmtTime(t.record.checkIn) : null}
      checkOut={t.record?.checkOut ? fmtTime(t.record.checkOut) : null}
      leave={
        t.leave === "LEAVE"
          ? "En congé validé"
          : t.leave === "AUTHORIZED"
            ? LEAVE_TYPE_LABELS.EXCEPTIONAL
            : null
      }
      onCall={t.plan.onCall}
      highlight={highlight}
    />
  );
}

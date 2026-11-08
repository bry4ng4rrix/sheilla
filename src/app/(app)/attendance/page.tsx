import type { Metadata } from "next";
import Link from "next/link";
import { Clock, History } from "lucide-react";
import { requirePage } from "@/lib/session";
import { addDays, fmtDay, localDay } from "@/lib/dates";
import { WEEKDAYS } from "@/lib/labels";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { EmptyState } from "@/components/shared/empty-state";
import { TodayPunch } from "@/components/attendance/today-punch";
import { SheetTable } from "@/components/attendance/sheet-table";
import { buttonVariants } from "@/components/ui/button";
import {
  buildSheet,
  loadPlanning,
  summarize,
} from "@/server/services/attendance";
import { crossesMidnight } from "@/server/services/attendance-engine";

export const metadata: Metadata = { title: "Mon pointage" };

export default async function MyAttendancePage() {
  const user = await requirePage("attendance.self");
  if (!user.employeeId)
    return (
      <EmptyState
        title="Compte non rattaché"
        description="Ce compte technique n'est associé à aucun dossier employé."
      />
    );
  const today = localDay();
  const [sheet, planning] = await Promise.all([
    buildSheet(addDays(today, -13), today, { id: user.employeeId }),
    loadPlanning(today, addDays(today, 6), { id: user.employeeId }),
  ]);
  const emp = planning.employees[0];
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i)).map(
    (d) => ({
      d,
      plan: planning.planOf(emp, d),
      leave: planning.leaveOf(emp.id, d),
    }),
  );
  const s = summarize(sheet);
  return (
    <>
      <PageHeader
        icon={<Clock />}
        title="Mon pointage"
        description="Enregistrez vos entrées et sorties, consultez votre planning"
        actions={
          <Link
            href="/attendance/history"
            className={buttonVariants({ variant: "outline" })}
          >
            <History /> Mon historique
          </Link>
        }
      />
      <TodayPunch employeeId={user.employeeId} />
      <Panel title="Mon planning des 7 prochains jours">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {week.map(({ d, plan, leave }, i) => (
            <div
              key={i}
              className={`rounded-xl border p-3 text-center ${i === 0 ? "border-orange-300 bg-orange-50" : ""}`}
            >
              <p className="text-xs font-bold text-muted-foreground uppercase">
                {WEEKDAYS[(d.getUTCDay() + 6) % 7]}
              </p>
              <p className="text-sm font-semibold">
                {fmtDay(d).replace(/ \d{4}$/, "")}
              </p>
              {leave ? (
                <p className="mt-2 rounded-lg bg-sky-100 py-2 text-xs font-bold text-sky-700">
                  Congé
                </p>
              ) : plan.shift ? (
                <div
                  className="mt-2 rounded-lg py-2 text-xs font-bold text-white"
                  style={{ background: plan.shift.color }}
                >
                  {plan.shift.name}
                  <p className="font-medium opacity-90">
                    {plan.shift.startTime}–{plan.shift.endTime}
                    {crossesMidnight(plan.shift) ? " (+1)" : ""}
                  </p>
                </div>
              ) : (
                <p className="mt-2 rounded-lg bg-stone-100 py-2 text-xs font-bold text-stone-500">
                  Repos
                </p>
              )}
              {plan.onCall && (
                <p className="mt-1 text-[10px] font-bold text-red-600">
                  ASTREINTE
                </p>
              )}
            </div>
          ))}
        </div>
      </Panel>
      <Panel
        title="14 derniers jours"
        description={`Taux de présence ${s.rate}% · ${s.late} retard(s) · ${s.absent} absence(s)`}
        bodyClassName="p-0"
      >
        <SheetTable rows={sheet.filter((r) => r.status !== "OFF").reverse()} />
      </Panel>
    </>
  );
}

import Link from "next/link";
import { Moon } from "lucide-react";
import { dayKey, fmtDay, fmtMinutes, fmtTime, toLocalInput } from "@/lib/dates";
import { ATTENDANCE_STATUS } from "@/lib/labels";
import {
  ANOMALY_LABELS,
  crossesMidnight,
} from "@/server/services/attendance-engine";
import type { SheetRow } from "@/server/services/attendance";
import { EnumBadge } from "@/components/shared/status-badge";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";
import { CorrectionDialog } from "./dialogs";

/** Feuille de présence (tableau) partagée entre historique, anomalies et fiche agent. */
export function SheetTable({
  rows,
  showEmployee,
  canCorrect,
}: {
  rows: SheetRow[];
  showEmployee?: boolean;
  canCorrect?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-stone-50/80 text-left text-xs font-semibold text-muted-foreground">
          <tr>
            {showEmployee && <th className="px-5 py-3">Agent</th>}
            <th className={showEmployee ? "py-3" : "px-5 py-3"}>Jour</th>
            <th>Poste prévu</th>
            <th>Entrée</th>
            <th>Sortie</th>
            <th className="hidden md:table-cell">Retard</th>
            <th className="hidden lg:table-cell">Observations</th>
            <th>Statut</th>
            {canCorrect && <th className="pr-5" />}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr
              key={`${r.employee.id}-${r.day.toISOString()}`}
              className="hover:bg-orange-50/30"
            >
              {showEmployee && (
                <td className="px-5 py-2.5">
                  <Link
                    href={`/employees/${r.employee.id}`}
                    className="flex items-center gap-2 font-semibold hover:text-orange-700"
                  >
                    <EmployeeAvatar
                      firstName={r.employee.firstName}
                      lastName={r.employee.lastName}
                      photoKey={r.employee.photoKey}
                      size="sm"
                    />
                    <span className="truncate">
                      {r.employee.lastName} {r.employee.firstName}
                    </span>
                  </Link>
                </td>
              )}
              <td
                className={
                  showEmployee
                    ? "py-2.5 whitespace-nowrap"
                    : "px-5 py-2.5 whitespace-nowrap font-medium"
                }
              >
                {fmtDay(r.day)}
              </td>
              <td className="whitespace-nowrap">
                {r.plan.shift ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: r.plan.shift.color }}
                    />
                    {r.plan.shift.startTime}–{r.plan.shift.endTime}
                    {crossesMidnight(r.plan.shift) && (
                      <Moon
                        className="size-3.5 text-indigo-500"
                        aria-label="Poste de nuit"
                      />
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Repos</span>
                )}
                {r.plan.onCall && (
                  <span className="ml-1 rounded bg-red-50 px-1 text-[10px] font-bold text-red-600">
                    ASTR.
                  </span>
                )}
              </td>
              <td className="tabular-nums">{fmtTime(r.checkIn)}</td>
              <td className="tabular-nums">{fmtTime(r.checkOut)}</td>
              <td className="hidden md:table-cell">
                {r.lateMinutes ? (
                  <span className="font-semibold text-amber-700">
                    {fmtMinutes(r.lateMinutes)}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="hidden max-w-56 lg:table-cell">
                <div className="flex flex-wrap gap-1">
                  {r.anomalies.map((a) => (
                    <span
                      key={a}
                      className="rounded bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700"
                    >
                      {ANOMALY_LABELS[a]}
                    </span>
                  ))}
                  {r.notes && (
                    <span
                      className="truncate text-xs text-muted-foreground"
                      title={r.notes}
                    >
                      {r.notes}
                    </span>
                  )}
                </div>
              </td>
              <td>
                <EnumBadge map={ATTENDANCE_STATUS} value={r.status} />
              </td>
              {canCorrect && (
                <td className="pr-5 text-right">
                  <CorrectionDialog
                    employeeId={r.employee.id}
                    employeeName={`${r.employee.firstName} ${r.employee.lastName}`}
                    date={dayKey(r.day)}
                    dateLabel={fmtDay(r.day)}
                    checkIn={toLocalInput(r.checkIn)}
                    checkOut={toLocalInput(r.checkOut)}
                    label={r.resolved ? "Modifier" : "Traiter"}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

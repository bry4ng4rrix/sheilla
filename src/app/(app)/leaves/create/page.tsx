import type { Metadata } from "next";
import { CalendarPlus } from "lucide-react";
import { requirePage } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { EmptyState } from "@/components/shared/empty-state";
import { LeaveForm } from "@/components/leaves/leave-form";
import { leaveBalance } from "@/server/services/leaves";
import { prisma } from "@/lib/prisma";
import { localDay } from "@/lib/dates";
import { WEEKDAYS } from "@/lib/labels";
import { getSettings } from "@/server/services/settings";
import { fmtDay } from "@/lib/dates";

export const metadata: Metadata = { title: "Nouvelle demande" };

export default async function CreateLeavePage() {
  const user = await requirePage("leaves.request");
  if (!user.employeeId)
    return (
      <EmptyState
        title="Compte non rattaché"
        description="Ce compte technique n'est associé à aucun dossier employé."
      />
    );
  const [b, holidays, settings] = await Promise.all([
    leaveBalance(user.employeeId),
    prisma.holiday.findMany({
      where: { date: { gte: localDay() } },
      orderBy: { date: "asc" },
      take: 5,
    }),
    getSettings(),
  ]);
  return (
    <>
      <PageHeader
        icon={<CalendarPlus />}
        title="Nouvelle demande"
        description="Congé ou autorisation d'absence"
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel>
          <LeaveForm available={b.remaining - b.pending} />
        </Panel>
        <div className="space-y-6">
          <Panel title="Mon solde">
            <p className="text-4xl font-extrabold text-orange-600">
              {b.remaining - b.pending}{" "}
              <span className="text-base font-semibold text-muted-foreground">
                jours
              </span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600"
                style={{
                  width: `${Math.min(100, (b.used / Math.max(1, b.entitlement)) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {b.used} pris · {b.pending} en attente · {b.entitlement} par an
            </p>
          </Panel>
          <Panel title="Calendrier de référence">
            <p className="text-xs text-muted-foreground">
              Jours ouvrables :{" "}
              {settings["leave.workingDays"]
                .split(",")
                .map((d) => WEEKDAYS[Number(d)])
                .join(", ")}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {holidays.map((h) => (
                <li key={h.id} className="flex justify-between">
                  <span>{h.name}</span>
                  <span className="text-muted-foreground">
                    {fmtDay(h.date)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

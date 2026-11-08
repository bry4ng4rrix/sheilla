import type { Metadata } from "next";
import { CalendarHeart, Settings, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, requirePage } from "@/lib/session";
import { fmtDay, weekdayIndex } from "@/lib/dates";
import { WEEKDAYS } from "@/lib/labels";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { ActionButton } from "@/components/shared/action-button";
import { HolidayForm, SettingsForm } from "@/components/settings/settings-form";
import { deleteHolidayAction } from "@/server/actions/settings";
import { getSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const user = await requirePage("holidays.manage");
  const [settings, holidays] = await Promise.all([
    getSettings(),
    prisma.holiday.findMany({ orderBy: { date: "asc" } }),
  ]);
  return (
    <>
      <PageHeader
        icon={<Settings />}
        title="Paramètres"
        description="Configuration du calendrier et des règles de calcul"
      />
      <div className="grid gap-6 xl:grid-cols-2">
        {can(user, "settings.manage") && (
          <Panel
            title="Paramètres système"
            description="Modifications journalisées"
          >
            <SettingsForm values={settings} />
          </Panel>
        )}
        <Panel
          title={
            <span className="flex items-center gap-2">
              <CalendarHeart className="size-4 text-orange-500" /> Jours fériés
            </span>
          }
          description="Exclus du décompte des congés et des plannings hebdomadaires"
        >
          <HolidayForm />
          <ul className="mt-4 divide-y rounded-xl border">
            {holidays.map((h) => (
              <li
                key={h.id}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
              >
                <span className="w-24 font-semibold tabular-nums">
                  {fmtDay(h.date)}
                </span>
                <span className="w-10 text-xs text-muted-foreground">
                  {WEEKDAYS[weekdayIndex(h.date)]}
                </span>
                <span className="flex-1">{h.name}</span>
                <ActionButton
                  variant="ghost"
                  size="icon-sm"
                  action={deleteHolidayAction.bind(null, h.id)}
                  confirm={{
                    title: `Supprimer « ${h.name} » ?`,
                    description:
                      "Les durées de congé futures seront recalculées sans ce jour férié.",
                    destructive: true,
                  }}
                >
                  <Trash2 />
                </ActionButton>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

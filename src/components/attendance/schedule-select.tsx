"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { assignScheduleAction } from "@/server/actions/attendance";

/** Affectation d'un planning individuel (prioritaire sur celui de l'équipe). */
export function ScheduleSelect({
  employeeId,
  value,
  schedules,
  fallbackLabel,
}: {
  employeeId: string;
  value: string;
  schedules: { id: string; name: string }[];
  fallbackLabel: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <select
      aria-label="Planning individuel"
      disabled={pending}
      defaultValue={value}
      onChange={(e) =>
        start(async () => {
          const r = await assignScheduleAction(
            employeeId,
            e.target.value || null,
          );
          if (r.ok) router.refresh();
          else toast.error(r.error);
        })
      }
      className="w-full truncate rounded-md border-0 bg-transparent py-0 text-[11px] text-muted-foreground hover:bg-stone-100 focus:ring-2 focus:ring-orange-300"
    >
      <option value="">{fallbackLabel}</option>
      {schedules.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name} (individuel)
        </option>
      ))}
    </select>
  );
}

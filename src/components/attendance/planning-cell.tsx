"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { setOverrideAction } from "@/server/actions/attendance";
import { cn } from "cn";

type Shift = { id: string; code: string; name: string; color: string };

/** Cellule de la grille de planning : clic → dérogation (poste, repos, astreinte). */
export function PlanningCell({
  employeeId,
  date,
  code,
  color,
  onCall,
  override,
  shifts,
  title,
}: {
  employeeId: string;
  date: string;
  code: string | null;
  color: string | null;
  onCall: boolean;
  override: boolean;
  shifts: Shift[];
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const send = (kind: string, shiftId?: string) =>
    start(async () => {
      const fd = new FormData();
      fd.set("employeeId", employeeId);
      fd.set("date", date);
      fd.set("kind", kind);
      if (shiftId) fd.set("shiftId", shiftId);
      const r = await setOverrideAction(fd);
      if (r.ok) {
        setOpen(false);
        router.refresh();
      } else toast.error(r.error);
    });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            title={title}
            className={cn(
              "relative grid h-9 w-full place-items-center rounded-md text-xs font-bold transition-transform hover:scale-105",
              code ? "text-white shadow-sm" : "bg-stone-100 text-stone-400",
              override && "ring-2 ring-stone-900/70 ring-offset-1",
            )}
            style={code ? { background: color ?? "#EF8200" } : undefined}
          />
        }
      >
        {code ?? "R"}
        {onCall && (
          <span
            className="absolute -top-1 -right-1 size-2.5 rounded-full bg-red-500 ring-2 ring-white"
            aria-label="Astreinte"
          />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        <p className="px-1 pb-2 text-xs font-semibold text-muted-foreground">
          {title}
        </p>
        <div className="grid grid-cols-2 gap-1">
          {shifts.map((s) => (
            <Button
              key={s.id}
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => send("SHIFT", s.id)}
              className="justify-start"
            >
              <span
                className="size-2.5 rounded-full"
                style={{ background: s.color }}
              />{" "}
              {s.code} · {s.name}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => send("REST")}
          >
            Repos
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => send("ON_CALL")}
          >
            Astreinte
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="mt-1 w-full"
          disabled={pending}
          onClick={() => send("CLEAR")}
        >
          {pending && <Loader2 className="animate-spin" />} Revenir au planning
        </Button>
      </PopoverContent>
    </Popover>
  );
}

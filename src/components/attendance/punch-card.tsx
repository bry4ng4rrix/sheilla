"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  LogIn,
  LogOut,
  Moon,
  Sun,
  Coffee,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { selfPunchAction } from "@/server/actions/attendance";

type Props = {
  shift: {
    name: string;
    start: string;
    end: string;
    color: string;
    night: boolean;
  } | null;
  dayLabel: string;
  checkIn: string | null;
  checkOut: string | null;
  leave: string | null;
  onCall: boolean;
  highlight?: "IN" | "OUT";
};

const clockFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Indian/Antananarivo",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function PunchCard({
  shift,
  dayLabel,
  checkIn,
  checkOut,
  leave,
  onCall,
  highlight,
}: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  const state =
    checkIn && !checkOut ? "open" : checkIn && checkOut ? "done" : "idle";
  const punch = (type: "IN" | "OUT") =>
    start(async () => {
      const r = await selfPunchAction(type);
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 via-stone-900 to-[#3a2410] p-6 text-white shadow-xl shadow-stone-900/20">
      <div
        className="absolute -right-16 -bottom-16 size-56 rounded-full bg-orange-500/25 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-orange-300 uppercase">
            {dayLabel}
          </p>
          <p
            className="mt-1 font-mono text-5xl font-bold tabular-nums"
            suppressHydrationWarning
          >
            {now ? clockFmt.format(now) : "--:--:--"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {leave ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-sky-200">
                <Coffee className="size-4" /> {leave}
              </span>
            ) : shift ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                {shift.night ? (
                  <Moon className="size-4 text-indigo-300" />
                ) : (
                  <Sun className="size-4 text-amber-300" />
                )}
                Poste {shift.name} · {shift.start} – {shift.end}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-stone-300">
                <Coffee className="size-4" /> Jour de repos
              </span>
            )}
            {onCall && (
              <span className="rounded-full bg-orange-500/25 px-3 py-1 text-orange-200">
                Astreinte
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 md:items-end">
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-stone-400">Entrée</p>
              <p className="text-lg font-bold">{checkIn ?? "—"}</p>
            </div>
            <div>
              <p className="text-stone-400">Sortie</p>
              <p className="text-lg font-bold">{checkOut ?? "—"}</p>
            </div>
          </div>
          {state === "done" ? (
            <p className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300">
              <CheckCircle2 className="size-5" /> Journée pointée
            </p>
          ) : state === "open" ? (
            <Button
              size="lg"
              disabled={pending}
              onClick={() => punch("OUT")}
              className={cn(
                "h-12 bg-white px-6 text-base text-stone-900 hover:bg-orange-50",
                highlight === "OUT" && "ring-4 ring-orange-400/50",
              )}
            >
              {pending ? <Loader2 className="animate-spin" /> : <LogOut />}{" "}
              Pointer ma sortie
            </Button>
          ) : (
            <Button
              size="lg"
              disabled={pending}
              onClick={() => punch("IN")}
              className={cn(
                "h-12 bg-gradient-to-r from-orange-500 to-orange-600 px-6 text-base shadow-lg shadow-orange-500/40",
                highlight === "IN" && "ring-4 ring-orange-300/60",
              )}
            >
              {pending ? <Loader2 className="animate-spin" /> : <LogIn />}{" "}
              Pointer mon entrée
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

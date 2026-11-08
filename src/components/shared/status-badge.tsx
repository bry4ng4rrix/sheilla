import { cn } from "cn";
import type { Tone } from "@/lib/labels";

const TONES: Record<Tone, string> = {
  neutral: "bg-stone-100 text-stone-700 ring-stone-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  brand: "bg-orange-50 text-orange-700 ring-orange-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

const DOTS: Record<Tone, string> = {
  neutral: "bg-stone-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-sky-500",
  brand: "bg-orange-500",
  violet: "bg-violet-500",
};

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOTS[tone])} aria-hidden />
      {children}
    </span>
  );
}

/** Badge depuis une table de libellés { label, tone }. */
export function EnumBadge({
  map,
  value,
}: {
  map: Record<string, { label: string; tone: Tone }>;
  value: string;
}) {
  const v = map[value] ?? { label: value, tone: "neutral" as Tone };
  return <StatusBadge tone={v.tone}>{v.label}</StatusBadge>;
}

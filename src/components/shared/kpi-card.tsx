import Link from "next/link";
import { cn } from "cn";

const ACCENTS = {
  brand: "from-orange-400 to-orange-600 shadow-orange-500/30",
  navy: "from-slate-600 to-slate-800 shadow-slate-700/30",
  teal: "from-teal-400 to-teal-600 shadow-teal-500/30",
  amber: "from-amber-300 to-amber-500 shadow-amber-500/30",
  rose: "from-rose-400 to-rose-600 shadow-rose-500/30",
  violet: "from-violet-400 to-violet-600 shadow-violet-500/30",
};

export function KpiCard({
  label,
  value,
  hint,
  icon,
  accent = "brand",
  href,
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  accent?: keyof typeof ACCENTS;
  href?: string;
  delay?: number;
}) {
  const body = (
    <div
      className="card-hover group relative h-full overflow-hidden rounded-2xl border bg-card p-5 animate-rise"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn(
          "absolute -top-8 -right-8 size-28 rounded-full bg-gradient-to-br opacity-[0.08] transition-transform duration-500 group-hover:scale-125",
          ACCENTS[accent],
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900 tabular-nums">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg [&_svg]:size-5",
            ACCENTS[accent],
          )}
        >
          {icon}
        </div>
      </div>
      {hint && <div className="mt-3 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
  return href ? (
    <Link
      href={href}
      className="block rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {body}
    </Link>
  ) : (
    body
  );
}

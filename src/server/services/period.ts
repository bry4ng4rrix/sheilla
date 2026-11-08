import { addDays, localDay, parseDay } from "@/lib/dates";

/** Période depuis les paramètres d'URL (from/to), bornée pour éviter des calculs démesurés. */
export function periodFrom(
  sp: Record<string, string | string[] | undefined>,
  defaultDays = 14,
  maxDays = 92,
) {
  const today = localDay();
  const safe = (v: unknown) => {
    try {
      return typeof v === "string" && v ? parseDay(v) : null;
    } catch {
      return null;
    }
  };
  let to = safe(sp.to) ?? today;
  if (to > today) to = today;
  let from = safe(sp.from) ?? addDays(to, -(defaultDays - 1));
  if (from > to) from = to;
  if ((to.getTime() - from.getTime()) / 86_400_000 > maxDays)
    from = addDays(to, -maxDays);
  return { from, to };
}

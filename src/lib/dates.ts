// Madagascar (Indian/Antananarivo) = UTC+3 sans heure d'été.
// shortcut: décalage fixe, à remplacer par une lib de fuseaux si l'app sort de Madagascar.
export const TZ = "Indian/Antananarivo";
export const TZ_OFFSET_MIN = 180;
export const DAY_MS = 86_400_000;

/** Jour local (minuit UTC du jour calendaire à Madagascar) contenant l'instant donné. */
export function localDay(at: Date = new Date()): Date {
  const shifted = at.getTime() + TZ_OFFSET_MIN * 60_000;
  return new Date(Math.floor(shifted / DAY_MS) * DAY_MS);
}

/** "YYYY-MM-DD" → minuit UTC. */
export function parseDay(value: string): Date {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Date invalide : ${value}`);
  return d;
}

export function dayKey(day: Date): string {
  return day.toISOString().slice(0, 10);
}

export function addDays(day: Date, n: number): Date {
  return new Date(day.getTime() + n * DAY_MS);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/** Lundi = 0 … Dimanche = 6 */
export function weekdayIndex(day: Date): number {
  return (day.getUTCDay() + 6) % 7;
}

export function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/** Instant réel correspondant à une heure locale "HH:mm" d'un jour donné (+ minutes supplémentaires). */
export function localTimeOn(day: Date, minutes: number): Date {
  return new Date(day.getTime() + (minutes - TZ_OFFSET_MIN) * 60_000);
}

/** Valeur pour <input type="datetime-local"> en heure de Madagascar. */
export function toLocalInput(at: Date | null | undefined): string {
  if (!at) return "";
  return new Date(at.getTime() + TZ_OFFSET_MIN * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function fromLocalInput(value: string): Date {
  return new Date(
    new Date(`${value}:00.000Z`).getTime() - TZ_OFFSET_MIN * 60_000,
  );
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Pour les dates "jour" stockées à minuit UTC. */
export const fmtDay = (d: Date | null | undefined) =>
  d ? dateFmt.format(d) : "—";
/** Pour les instants (horodatages). */
export const fmtTime = (d: Date | null | undefined) =>
  d ? timeFmt.format(d) : "—";
export const fmtDateTime = (d: Date | null | undefined) =>
  d ? dateTimeFmt.format(d) : "—";

export function fmtMinutes(min: number): string {
  if (!min) return "0 min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${m.toString().padStart(2, "0")}` : `${m} min`;
}

export function monthRange(
  year: number,
  month: number,
): { from: Date; to: Date } {
  return {
    from: new Date(Date.UTC(year, month, 1)),
    to: new Date(Date.UTC(year, month + 1, 0)),
  };
}

// shortcut: compteur en mémoire, valable pour une seule instance Node ; passer à Redis/SQLite si l'app est répliquée.
const hits = new Map<string, { count: number; resetAt: number }>();

function entry(key: string, windowMs: number) {
  const now = Date.now();
  const e = hits.get(key);
  if (!e || e.resetAt < now) {
    const fresh = { count: 0, resetAt: now + windowMs };
    hits.set(key, fresh);
    return fresh;
  }
  return e;
}

/** Compte une tentative et indique si la clé dépasse `max` sur la fenêtre. */
export function rateLimited(
  key: string,
  max = 10,
  windowMs = 15 * 60_000,
): boolean {
  const e = entry(key, windowMs);
  e.count++;
  return e.count > max;
}

/** Vérifie sans compter (les connexions réussies ne doivent pas consommer le quota). */
export function isRateLimited(
  key: string,
  max = 10,
  windowMs = 15 * 60_000,
): boolean {
  return entry(key, windowMs).count >= max;
}

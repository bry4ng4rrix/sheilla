import { ZodError } from "zod";

/** Erreur métier dont le message peut être montré à l'utilisateur. */
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Accès refusé.") {
    super(message, 403);
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Gestion centralisée des erreurs des Server Actions : aucune fuite d'erreur interne. */
export async function runAction<T>(
  fn: () => Promise<T>,
  message?: string,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn(), message };
  } catch (e) {
    // redirect()/notFound() de Next lèvent des erreurs spéciales qu'il faut laisser passer
    if (
      e &&
      typeof e === "object" &&
      "digest" in e &&
      String((e as { digest: unknown }).digest).startsWith("NEXT_")
    )
      throw e;
    if (e instanceof AppError) return { ok: false, error: e.message };
    if (e instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of e.issues)
        fieldErrors[issue.path.join(".")] ??= issue.message;
      return {
        ok: false,
        error: e.issues[0]?.message ?? "Données invalides.",
        fieldErrors,
      };
    }
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return { ok: false, error: "Cette valeur existe déjà (doublon)." };
    }
    console.error("[action]", e);
    return { ok: false, error: "Une erreur inattendue est survenue." };
  }
}

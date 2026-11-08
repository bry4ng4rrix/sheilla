"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { runAction, AppError, type ActionResult } from "@/lib/errors";
import { rateLimited } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import {
  changePasswordSchema,
  forgotSchema,
  formToObject,
  loginSchema,
  resetSchema,
} from "@/lib/validations";

const LOGIN_ERRORS: Record<string, string> = {
  invalid: "Identifiants incorrects ou compte désactivé.",
  locked:
    "Compte temporairement verrouillé après plusieurs échecs. Réessayez dans 15 minutes.",
  rate: "Trop de tentatives. Patientez quelques minutes.",
  pending: "Votre compte est en attente de validation par un administrateur.",
  rejected: "Votre demande d'inscription a été refusée. Contactez le service RH.",
};

export async function loginAction(form: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(formToObject(form));
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/dashboard" });
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) {
      const code = (e as AuthError & { code?: string }).code ?? "invalid";
      return { ok: false, error: LOGIN_ERRORS[code] ?? LOGIN_ERRORS.invalid };
    }
    throw e; // NEXT_REDIRECT en cas de succès
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function forgotPasswordAction(form: FormData) {
  return runAction(async () => {
    const { email } = forgotSchema.parse(formToObject(form));
    if (rateLimited(`forgot:${email}`, 3, 60 * 60_000))
      throw new AppError("Trop de demandes. Réessayez plus tard.");
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (user?.isActive) {
      const token = randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 60 * 60_000),
        },
      });
      const base = process.env.APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
      const link = `${base}/reset-password?token=${token}`;
      // shortcut: pas de serveur SMTP configuré, le lien est écrit dans les journaux serveur ; brancher un mailer en production.
      console.info(
        `[mail] Réinitialisation du mot de passe pour ${user.email} : ${link}`,
      );
      await audit({
        userId: user.id,
        action: "auth.reset_requested",
        entity: "User",
        entityId: user.id,
      });
    }
  }, "Si un compte actif existe pour cet e-mail, un lien de réinitialisation a été envoyé.");
}

export async function resetPasswordAction(form: FormData) {
  return runAction(async () => {
    const { token, password } = resetSchema.parse(formToObject(form));
    const row = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!row || row.usedAt || row.expiresAt < new Date())
      throw new AppError("Lien invalide ou expiré.");
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });
      await tx.user.update({
        where: { id: row.userId },
        data: {
          passwordHash: await bcrypt.hash(password, 12),
          failedAttempts: 0,
          lockedUntil: null,
        },
      });
      await audit(
        {
          userId: row.userId,
          action: "auth.password_reset",
          entity: "User",
          entityId: row.userId,
        },
        tx,
      );
    });
  }, "Mot de passe modifié. Vous pouvez vous connecter.");
}

export async function changePasswordAction(form: FormData) {
  return runAction(async () => {
    const user = await requireUser();
    const { current, password } = changePasswordSchema.parse(
      formToObject(form),
    );
    const db = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await bcrypt.compare(current, db.passwordHash)))
      throw new AppError("Mot de passe actuel incorrect.");
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    });
    await audit({
      userId: user.id,
      action: "auth.password_change",
      entity: "User",
      entityId: user.id,
    });
  }, "Mot de passe mis à jour.");
}

"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { runAction, AppError } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { formToObject, registerSchema, rejectRegistrationSchema } from "@/lib/validations";
import { approveRegistration, registerAccount, rejectRegistration } from "@/server/services/registration";

export async function registerAction(form: FormData) {
  return runAction(async () => {
    const data = registerSchema.parse(formToObject(form));
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    await registerAccount(data, ip);
  }, "Demande envoyée. Un administrateur doit valider votre compte avant votre première connexion.");
}

const refresh = () => {
  revalidatePath("/admin/registrations");
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
};

export async function approveRegistrationAction(id: string, form: FormData) {
  return runAction(async () => {
    const actor = await requireUser("users.manage");
    const employeeId = String(form.get("employeeId") ?? "");
    if (!employeeId) throw new AppError("Choisissez le dossier employé à rattacher.");
    await approveRegistration({ id, employeeId, actorId: actor.id });
    refresh();
  }, "Compte validé : l'employé peut maintenant se connecter.");
}

export async function rejectRegistrationAction(id: string, form: FormData) {
  return runAction(async () => {
    const actor = await requireUser("users.manage");
    const { note } = rejectRegistrationSchema.parse(formToObject(form));
    await rejectRegistration({ id, note, actorId: actor.id });
    refresh();
  }, "Demande refusée.");
}

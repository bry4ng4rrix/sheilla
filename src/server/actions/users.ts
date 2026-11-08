"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { AppError, runAction } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { formToObject, userSchema } from "@/lib/validations";

async function assertEmployeeFree(
  employeeId: string | null,
  exceptUserId?: string,
) {
  if (!employeeId) return;
  const taken = await prisma.user.findFirst({
    where: { employeeId, id: { not: exceptUserId } },
  });
  if (taken) throw new AppError("Cet employé possède déjà un compte (RG02).");
}

export async function createUserAction(form: FormData) {
  return runAction(async () => {
    const actor = await requireUser("users.manage");
    const data = userSchema.parse(formToObject(form));
    if (!data.password) throw new AppError("Mot de passe initial requis.");
    await assertEmployeeFree(data.employeeId);
    const role = await prisma.role.findUniqueOrThrow({
      where: { code: data.roleCode },
    });
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          roleId: role.id,
          employeeId: data.employeeId,
          passwordHash: await bcrypt.hash(data.password!, 12),
        },
      });
      await audit(
        {
          userId: actor.id,
          action: "user.create",
          entity: "User",
          entityId: u.id,
          after: {
            email: u.email,
            role: data.roleCode,
            employeeId: u.employeeId,
          },
        },
        tx,
      );
      return u;
    });
    revalidatePath("/admin/users");
    return { id: user.id };
  }, "Compte créé.");
}

export async function updateUserAction(id: string, form: FormData) {
  return runAction(async () => {
    const actor = await requireUser("users.manage");
    const data = userSchema.parse(formToObject(form));
    await assertEmployeeFree(data.employeeId, id);
    const before = await prisma.user.findUniqueOrThrow({
      where: { id },
      include: { role: true },
    });
    if (before.id === actor.id && data.roleCode !== "ADMIN")
      throw new AppError(
        "Vous ne pouvez pas retirer votre propre rôle administrateur.",
      );
    const role = await prisma.role.findUniqueOrThrow({
      where: { code: data.roleCode },
    });
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          name: data.name,
          email: data.email,
          roleId: role.id,
          employeeId: data.employeeId,
          ...(data.password
            ? {
                passwordHash: await bcrypt.hash(data.password, 12),
                failedAttempts: 0,
                lockedUntil: null,
              }
            : {}),
        },
      });
      await audit(
        {
          userId: actor.id,
          action:
            before.role.code !== data.roleCode
              ? "user.role_change"
              : "user.update",
          entity: "User",
          entityId: id,
          before: {
            email: before.email,
            role: before.role.code,
            employeeId: before.employeeId,
          },
          after: {
            email: data.email,
            role: data.roleCode,
            employeeId: data.employeeId,
            passwordReset: !!data.password,
          },
        },
        tx,
      );
    });
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);
  }, "Compte mis à jour.");
}

export async function toggleUserAction(id: string) {
  return runAction(async () => {
    const actor = await requireUser("users.manage");
    if (id === actor.id)
      throw new AppError("Vous ne pouvez pas désactiver votre propre compte.");
    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    if (user.approvalStatus !== "APPROVED") throw new AppError("Traitez d'abord la demande d'inscription (Administration → Inscriptions).");
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          isActive: !user.isActive,
          failedAttempts: 0,
          lockedUntil: null,
        },
      });
      await audit(
        {
          userId: actor.id,
          action: user.isActive ? "user.deactivate" : "user.activate",
          entity: "User",
          entityId: id,
        },
        tx,
      );
    });
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);
  }, "Statut du compte modifié.");
}

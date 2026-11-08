"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { AppError, runAction } from "@/lib/errors";
import { parseDay } from "@/lib/dates";
import { requireEmployeeId, requireUser } from "@/lib/session";
import { fileFrom, storage } from "@/lib/storage";
import { employeeSchema, formToObject, profileSchema } from "@/lib/validations";

function toData(d: ReturnType<typeof employeeSchema.parse>) {
  return {
    ...d,
    birthDate: d.birthDate ? parseDay(d.birthDate) : null,
    hireDate: parseDay(d.hireDate),
    departureDate: d.departureDate ? parseDay(d.departureDate) : null,
  };
}

async function assertPosition(positionId: string) {
  const p = await prisma.position.findUnique({ where: { id: positionId } });
  if (!p?.isActive) throw new AppError("Poste inactif ou introuvable.");
}

export async function createEmployeeAction(form: FormData) {
  return runAction(async () => {
    const actor = await requireUser("employees.manage");
    const data = toData(employeeSchema.parse(formToObject(form)));
    await assertPosition(data.positionId);
    if (
      await prisma.employee.findUnique({ where: { matricule: data.matricule } })
    )
      throw new AppError("Ce matricule existe déjà (RG01).");
    const photo = fileFrom(form, "photo");
    const saved = photo ? await storage.save("employees", photo) : null;
    try {
      const emp = await prisma.$transaction(async (tx) => {
        const e = await tx.employee.create({
          data: { ...data, photoKey: saved?.key },
        });
        await tx.contract.create({
          data: {
            employeeId: e.id,
            type: e.contractType,
            startDate: e.hireDate,
          },
        });
        await audit(
          {
            userId: actor.id,
            action: "employee.create",
            entity: "Employee",
            entityId: e.id,
            after: {
              matricule: e.matricule,
              name: `${e.firstName} ${e.lastName}`,
            },
          },
          tx,
        );
        return e;
      });
      revalidatePath("/employees");
      return { id: emp.id };
    } catch (e) {
      if (saved) await storage.remove(saved.key);
      throw e;
    }
  }, "Employé créé.");
}

export async function updateEmployeeAction(id: string, form: FormData) {
  return runAction(async () => {
    const actor = await requireUser("employees.manage");
    const data = toData(employeeSchema.parse(formToObject(form)));
    const before = await prisma.employee.findUniqueOrThrow({ where: { id } });
    if (before.positionId !== data.positionId)
      await assertPosition(data.positionId);
    const photo = fileFrom(form, "photo");
    const saved = photo ? await storage.save("employees", photo) : null;
    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: { ...data, ...(saved ? { photoKey: saved.key } : {}) },
      });
      if (before.contractType !== data.contractType) {
        const today = new Date();
        await tx.contract.updateMany({
          where: { employeeId: id, endDate: null },
          data: { endDate: today },
        });
        await tx.contract.create({
          data: { employeeId: id, type: data.contractType, startDate: today },
        });
      }
      const {
        photoKey: _p,
        extra: _e,
        createdAt: _c,
        updatedAt: _u,
        ...snapshot
      } = before;
      await audit(
        {
          userId: actor.id,
          action: "employee.update",
          entity: "Employee",
          entityId: id,
          before: snapshot,
          after: data,
        },
        tx,
      );
    });
    if (saved && before.photoKey) await storage.remove(before.photoKey);
    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
  }, "Dossier mis à jour.");
}

/** Désactivation logique (RG08) : bloque aussi le compte associé, ne supprime aucun historique. */
export async function setEmployeeActiveAction(id: string, active: boolean) {
  return runAction(
    async () => {
      const actor = await requireUser("employees.manage");
      await prisma.$transaction(async (tx) => {
        const e = await tx.employee.update({
          where: { id },
          data: active
            ? { deletedAt: null, status: "ACTIVE", departureDate: null }
            : {
                deletedAt: new Date(),
                status: "LEFT",
                departureDate: new Date(),
              },
        });
        await tx.user.updateMany({
          where: { employeeId: id },
          data: { isActive: active },
        });
        if (!active)
          await tx.contract.updateMany({
            where: { employeeId: id, endDate: null },
            data: { endDate: new Date() },
          });
        await audit(
          {
            userId: actor.id,
            action: active ? "employee.reactivate" : "employee.deactivate",
            entity: "Employee",
            entityId: id,
            after: { matricule: e.matricule },
          },
          tx,
        );
      });
      revalidatePath("/employees");
      revalidatePath(`/employees/${id}`);
    },
    active ? "Employé réactivé." : "Employé désactivé (historique conservé).",
  );
}

/** RG07 : l'employé ne modifie que ses coordonnées, jamais les données administratives. */
export async function updateProfileAction(form: FormData) {
  return runAction(async () => {
    const user = await requireUser();
    const employeeId = requireEmployeeId(user);
    const data = profileSchema.parse(formToObject(form));
    const photo = fileFrom(form, "photo");
    const before = await prisma.employee.findUniqueOrThrow({
      where: { id: employeeId },
    });
    const saved = photo ? await storage.save("employees", photo) : null;
    await prisma.employee.update({
      where: { id: employeeId },
      data: { ...data, ...(saved ? { photoKey: saved.key } : {}) },
    });
    if (saved && before.photoKey) await storage.remove(before.photoKey);
    await audit({
      userId: user.id,
      action: "profile.update",
      entity: "Employee",
      entityId: employeeId,
      before: {
        address: before.address,
        phone: before.phone,
        email: before.email,
      },
      after: data,
    });
    revalidatePath("/profile");
  }, "Profil mis à jour.");
}

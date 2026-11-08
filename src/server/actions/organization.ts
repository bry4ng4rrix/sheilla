"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { AppError, runAction } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import {
  departmentSchema,
  formToObject,
  positionSchema,
} from "@/lib/validations";

const refresh = () => {
  revalidatePath("/organization/services");
  revalidatePath("/organization/positions");
};

export async function saveDepartmentAction(id: string | null, form: FormData) {
  return runAction(
    async () => {
      const actor = await requireUser("org.manage");
      const data = departmentSchema.parse(formToObject(form));
      const d = id
        ? await prisma.department.update({ where: { id }, data })
        : await prisma.department.create({ data });
      await audit({
        userId: actor.id,
        action: id ? "department.update" : "department.create",
        entity: "Department",
        entityId: d.id,
        after: data,
      });
      refresh();
    },
    id ? "Service mis à jour." : "Service créé.",
  );
}

export async function toggleDepartmentAction(id: string) {
  return runAction(async () => {
    const actor = await requireUser("org.manage");
    const d = await prisma.department.findUniqueOrThrow({
      where: { id },
      include: {
        _count: { select: { positions: { where: { isActive: true } } } },
      },
    });
    if (d.isActive && d._count.positions > 0)
      throw new AppError(
        `Impossible : ${d._count.positions} poste(s) actif(s) rattaché(s). Désactivez-les ou réaffectez-les d'abord.`,
      );
    await prisma.department.update({
      where: { id },
      data: { isActive: !d.isActive },
    });
    await audit({
      userId: actor.id,
      action: d.isActive ? "department.deactivate" : "department.activate",
      entity: "Department",
      entityId: id,
    });
    refresh();
  }, "Statut du service modifié.");
}

export async function savePositionAction(id: string | null, form: FormData) {
  return runAction(
    async () => {
      const actor = await requireUser("org.manage");
      const data = positionSchema.parse(formToObject(form));
      const dep = await prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!dep?.isActive) throw new AppError("Service inactif ou introuvable.");
      const p = id
        ? await prisma.position.update({ where: { id }, data })
        : await prisma.position.create({ data });
      await audit({
        userId: actor.id,
        action: id ? "position.update" : "position.create",
        entity: "Position",
        entityId: p.id,
        after: data,
      });
      refresh();
    },
    id ? "Poste mis à jour." : "Poste créé.",
  );
}

export async function togglePositionAction(id: string) {
  return runAction(async () => {
    const actor = await requireUser("org.manage");
    const p = await prisma.position.findUniqueOrThrow({
      where: { id },
      include: {
        _count: { select: { employees: { where: { deletedAt: null } } } },
      },
    });
    if (p.isActive && p._count.employees > 0)
      throw new AppError(
        `Impossible : ${p._count.employees} employé(s) actif(s) occupent ce poste. Réaffectez-les d'abord.`,
      );
    await prisma.position.update({
      where: { id },
      data: { isActive: !p.isActive },
    });
    await audit({
      userId: actor.id,
      action: p.isActive ? "position.deactivate" : "position.activate",
      entity: "Position",
      entityId: id,
    });
    refresh();
  }, "Statut du poste modifié.");
}

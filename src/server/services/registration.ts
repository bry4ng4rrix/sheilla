import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { audit, notify, usersWithRole } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { rateLimited } from "@/lib/rate-limit";

/**
 * Demande de compte d'un employé : créée inactive (PENDING) tant qu'un administrateur ne l'a pas validée.
 * Une adresse déjà utilisée est ignorée silencieusement (pas d'énumération des comptes).
 */
export async function registerAccount(data: { name: string; email: string; matricule: string; password: string }, ip = "local") {
  if (rateLimited(`register:${ip}`, 5, 60 * 60_000)) throw new AppError("Trop de demandes depuis cette connexion. Réessayez plus tard.");
  if (await prisma.user.findUnique({ where: { email: data.email } })) return;
  const role = await prisma.role.findUniqueOrThrow({ where: { code: "EMPLOYEE" } });
  const passwordHash = await bcrypt.hash(data.password, 12);
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: data.name, email: data.email, passwordHash, roleId: role.id, isActive: false, approvalStatus: "PENDING", requestedMatricule: data.matricule },
    });
    await notify(await usersWithRole(["ADMIN"], tx), { title: "Nouvelle demande d'inscription", message: `${data.name} (${data.email}) — matricule ${data.matricule}`, link: "/admin/registrations" }, tx);
    await audit({ userId: user.id, action: "user.register", entity: "User", entityId: user.id, after: { email: data.email, matricule: data.matricule } }, tx);
  });
}

/** Validation : le compte est rattaché à un dossier employé (RG02) puis activé. */
export async function approveRegistration(params: { id: string; employeeId: string; actorId: string }) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: params.id } });
    if (!user || user.approvalStatus !== "PENDING") throw new AppError("Cette demande a déjà été traitée.");
    const employee = await tx.employee.findUnique({ where: { id: params.employeeId }, include: { user: true } });
    if (!employee || employee.deletedAt) throw new AppError("Dossier employé introuvable ou désactivé.");
    if (employee.user) throw new AppError("Ce dossier possède déjà un compte (RG02).");
    await tx.user.update({ where: { id: user.id }, data: { approvalStatus: "APPROVED", isActive: true, employeeId: employee.id, reviewNote: null } });
    await audit({ userId: params.actorId, action: "user.approve", entity: "User", entityId: user.id, after: { email: user.email, employeeId: employee.id, matricule: employee.matricule } }, tx);
  });
}

export async function rejectRegistration(params: { id: string; note: string; actorId: string }) {
  return prisma.$transaction(async (tx) => {
    const res = await tx.user.updateMany({ where: { id: params.id, approvalStatus: "PENDING" }, data: { approvalStatus: "REJECTED", isActive: false, reviewNote: params.note } });
    if (res.count !== 1) throw new AppError("Cette demande a déjà été traitée.");
    await audit({ userId: params.actorId, action: "user.reject", entity: "User", entityId: params.id, after: { note: params.note } }, tx);
  });
}

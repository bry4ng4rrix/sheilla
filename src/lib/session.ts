import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/errors";
import type { Permission, RoleCode } from "@/lib/permissions";

/**
 * Utilisateur courant rechargé depuis SQLite à chaque requête :
 * un compte désactivé perd immédiatement l'accès, même avec un JWT encore valide.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
      employee: { include: { position: { include: { department: true } } } },
    },
  });
  if (!user || !user.isActive) return null;
  const permissions = new Set(
    user.role.permissions.map((rp) => rp.permission.code as Permission),
  );
  const { passwordHash: _omit, ...safe } = user;
  return { ...safe, roleCode: user.role.code as RoleCode, permissions };
});

export type CurrentUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>;

export function can(user: CurrentUser, permission: Permission) {
  return user.permissions.has(permission);
}

/** Pour les pages : redirige vers /login si non connecté, vers /dashboard?denied si interdit. */
export async function requirePage(
  permission?: Permission,
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (permission && !can(user, permission)) redirect("/dashboard?denied=1");
  return user;
}

/** Pour les actions, route handlers et services : lève une erreur si interdit. */
export async function requireUser(
  permission?: Permission,
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user)
    throw new ForbiddenError("Session expirée, veuillez vous reconnecter.");
  if (permission && !can(user, permission)) throw new ForbiddenError();
  return user;
}

/** L'utilisateur doit être rattaché à un dossier employé (actions personnelles). */
export function requireEmployeeId(user: CurrentUser): string {
  if (!user.employeeId)
    throw new ForbiddenError(
      "Ce compte n'est rattaché à aucun dossier employé.",
    );
  return user.employeeId;
}

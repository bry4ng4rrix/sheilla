import { headers } from "next/headers";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = PrismaClient | Prisma.TransactionClient;

/** AuditService centralisé (RG06). Accepte un client de transaction pour journaliser atomiquement. */
export async function audit(
  entry: {
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
  },
  db: Db = prisma,
) {
  let ip: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  } catch {
    // hors requête (seed, tests)
  }
  await db.auditLog.create({
    data: {
      userId: entry.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      before: entry.before === undefined ? null : JSON.stringify(entry.before),
      after: entry.after === undefined ? null : JSON.stringify(entry.after),
      ip,
    },
  });
}

export async function notify(
  userIds: string[],
  n: { title: string; message: string; link?: string },
  db: Db = prisma,
) {
  if (!userIds.length) return;
  await db.notification.createMany({
    data: userIds.map((userId) => ({ userId, ...n })),
  });
}

/** Utilisateurs actifs disposant d'un rôle donné (destinataires des notifications RH). */
export async function usersWithRole(codes: string[], db: Db = prisma) {
  const users = await db.user.findMany({
    where: { isActive: true, role: { code: { in: codes } } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

/**
 * Local : fichier SQLite (DATABASE_URL). Vercel : base SQLite hébergée Turso/libSQL (TURSO_DATABASE_URL),
 * car les fonctions serverless n'ont pas de disque persistant.
 */
function createClient() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) return new PrismaClient();
  return new PrismaClient({ adapter: new PrismaLibSQL({ url, authToken: process.env.TURSO_AUTH_TOKEN }) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

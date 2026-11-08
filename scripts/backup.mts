/**
 * Sauvegarde cohérente de la base SQLite et des fichiers téléversés.
 * `VACUUM INTO` produit une copie transactionnelle compatible avec le mode WAL,
 * même si l'application est en cours d'utilisation (contrairement à une simple copie de fichier).
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dir = path.resolve(process.env.BACKUP_DIR ?? "./backups", stamp);
mkdirSync(dir, { recursive: true });

const prisma = new PrismaClient();
const target = path.join(dir, "grh.db");
await prisma.$executeRawUnsafe(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
await prisma.$disconnect();

const storage = path.resolve(process.env.STORAGE_DIR ?? "./storage");
if (existsSync(storage)) cpSync(storage, path.join(dir, "storage"), { recursive: true });

console.log(`✔ Sauvegarde créée : ${dir}`);

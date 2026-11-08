import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";
import { AppError } from "@/lib/errors";

export type Folder = "employees" | "announcements" | "leave-attachments";

// Dossier choisi à l'exécution : exclu de l'analyse statique du bundler (sinon tout le projet est embarqué)
const ROOT = path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_DIR ?? "./storage");
const MAX_BYTES = Number(process.env.UPLOAD_MAX_MB ?? 5) * 1024 * 1024;

// Signatures binaires réelles : le type MIME annoncé par le navigateur n'est pas fiable.
const SIGNATURES: Record<
  string,
  { mime: string; magic: (b: Buffer) => boolean }
> = {
  jpg: {
    mime: "image/jpeg",
    magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  jpeg: {
    mime: "image/jpeg",
    magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  png: {
    mime: "image/png",
    magic: (b) =>
      b
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  webp: {
    mime: "image/webp",
    magic: (b) =>
      b.subarray(0, 4).toString() === "RIFF" &&
      b.subarray(8, 12).toString() === "WEBP",
  },
  pdf: {
    mime: "application/pdf",
    magic: (b) => b.subarray(0, 5).toString() === "%PDF-",
  },
};

const ALLOWED: Record<Folder, string[]> = {
  employees: ["jpg", "jpeg", "png", "webp"],
  announcements: ["jpg", "jpeg", "png", "webp"],
  "leave-attachments": ["jpg", "jpeg", "png", "webp", "pdf"],
};

/** Interface de stockage : l'implémentation locale peut être remplacée par un stockage S3 compatible. */
export interface Storage {
  save(
    folder: Folder,
    file: File,
  ): Promise<{
    key: string;
    mimeType: string;
    size: number;
    originalName: string;
  }>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

function resolveKey(key: string): string {
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new AppError("Chemin de fichier invalide.", 400);
  return full;
}

/** Contrôles communs : taille, extension autorisée, signature binaire. Retourne la clé aléatoire à utiliser. */
async function validate(folder: Folder, file: File) {
  if (!file || file.size === 0) throw new AppError("Fichier vide.");
  if (file.size > MAX_BYTES) throw new AppError(`Fichier trop volumineux (max ${MAX_BYTES / 1024 / 1024} Mo).`);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const sig = SIGNATURES[ext];
  if (!ALLOWED[folder].includes(ext) || !sig) throw new AppError(`Extension non autorisée (${ALLOWED[folder].join(", ")}).`);
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!sig.magic(buffer)) throw new AppError("Le contenu du fichier ne correspond pas à son extension.");
  const key = `${folder}/${randomBytes(16).toString("hex")}.${ext}`;
  return { key, buffer, meta: { key, mimeType: sig.mime, size: file.size, originalName: file.name.slice(0, 200) } };
}

const assertKey = (key: string) => {
  if (!/^(employees|announcements|leave-attachments)\/[0-9a-f]{32}\.[a-z]{3,4}$/.test(key)) throw new AppError("Chemin de fichier invalide.", 400);
};

const diskStorage: Storage = {
  async save(folder, file) {
    const { key, buffer, meta } = await validate(folder, file);
    await mkdir(path.join(ROOT, folder), { recursive: true });
    await writeFile(resolveKey(key), buffer);
    return meta;
  },
  async read(key) {
    return readFile(resolveKey(key));
  },
  async remove(key) {
    await unlink(resolveKey(key)).catch(() => undefined);
  },
};

/** Vercel Blob en accès privé : les fichiers ne sont lisibles que via /api/files (contrôle d'accès). */
const blobStorage: Storage = {
  async save(folder, file) {
    const { key, buffer, meta } = await validate(folder, file);
    await put(key, buffer, { access: "private", addRandomSuffix: false, contentType: meta.mimeType });
    return meta;
  },
  async read(key) {
    assertKey(key);
    const res = await get(key, { access: "private" });
    if (!res || res.statusCode !== 200) throw new AppError("Fichier introuvable.", 404);
    return Buffer.from(await new Response(res.stream).arrayBuffer());
  },
  async remove(key) {
    assertKey(key);
    await del(key).catch(() => undefined);
  },
};

export const storage: Storage = process.env.BLOB_READ_WRITE_TOKEN ? blobStorage : diskStorage;

export function mimeFromKey(key: string): string {
  return (
    SIGNATURES[key.split(".").pop() ?? ""]?.mime ?? "application/octet-stream"
  );
}

/** Récupère un fichier optionnel d'un FormData (ignore les champs vides). */
export function fileFrom(form: FormData, name: string): File | null {
  const f = form.get(name);
  return f instanceof File && f.size > 0 ? f : null;
}

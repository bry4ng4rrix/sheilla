import { describe, expect, it } from "vitest";
import { storage } from "@/lib/storage";

const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);

describe("stockage des fichiers", () => {
  it("accepte une image valide et génère un nom aléatoire", async () => {
    const saved = await storage.save("employees", new File([png], "photo.png"));
    expect(saved.key).toMatch(/^employees\/[0-9a-f]{32}\.png$/);
    expect(saved.mimeType).toBe("image/png");
    expect(await storage.read(saved.key)).toEqual(png);
    await storage.remove(saved.key);
  });
  it("refuse un contenu qui ne correspond pas à l'extension", async () => {
    await expect(
      storage.save(
        "employees",
        new File(["<script>alert(1)</script>"], "photo.png"),
      ),
    ).rejects.toThrow(/ne correspond pas/);
  });
  it("refuse une extension non autorisée", async () => {
    await expect(
      storage.save("employees", new File([png], "photo.exe")),
    ).rejects.toThrow(/Extension/);
    await expect(
      storage.save("employees", new File(["%PDF-1.4"], "doc.pdf")),
    ).rejects.toThrow(/Extension/);
  });
  it("refuse un fichier trop volumineux", async () => {
    await expect(
      storage.save(
        "employees",
        new File(
          [Buffer.concat([png, Buffer.alloc(2 * 1024 * 1024)])],
          "big.png",
        ),
      ),
    ).rejects.toThrow(/volumineux/);
  });
  it("bloque les chemins malveillants", async () => {
    await expect(storage.read("../../.env")).rejects.toThrow(/invalide/);
  });
});

import { isRateLimited, rateLimited } from "@/lib/rate-limit";

describe("limitation des tentatives de connexion", () => {
  it("bloque après le seuil d'échecs, sans compter les vérifications", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(isRateLimited(key, 3)).toBe(false);
    rateLimited(key, 3);
    rateLimited(key, 3);
    expect(isRateLimited(key, 3)).toBe(false);
    rateLimited(key, 3);
    expect(isRateLimited(key, 3)).toBe(true);
  });
});

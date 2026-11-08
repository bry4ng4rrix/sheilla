import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // "server-only" lève une erreur hors du bundler React Server : neutralisé pour les tests
      "server-only": path.resolve(import.meta.dirname, "tests/support/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globalSetup: ["tests/support/global-setup.ts"],
    env: { DATABASE_URL: "file:../data/test.db", STORAGE_DIR: "./data/test-storage", UPLOAD_MAX_MB: "1" },
    fileParallelism: false,
  },
});

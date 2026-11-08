import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App fully dynamic (auth per request): no Cache Components / PPR.
  serverExternalPackages: ["pdfkit", "exceljs"],
  // Fichiers lus à l'exécution par les exports PDF : à embarquer dans la fonction serverless (Vercel)
  outputFileTracingIncludes: {
    "/api/reports/[type]": ["./public/logo.png", "./node_modules/pdfkit/js/data/**/*", "./node_modules/.pnpm/pdfkit@*/node_modules/pdfkit/js/data/**/*"],
  },
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

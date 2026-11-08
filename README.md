# GRH JIRAMA Antsirabe

Application web de gestion des ressources humaines de la JIRAMA Antsirabe : personnel, services et postes, congés, présences des équipes postées, communication interne, tableaux de bord et rapports PDF/Excel.

**Stack** : Next.js 16 (App Router, Server Actions) · TypeScript · SQLite + Prisma · Auth.js · Tailwind CSS 4 + shadcn/ui · Recharts · React Hook Form + Zod · ExcelJS · PDFKit · Vitest · Playwright.

```bash
pnpm install && cp .env.example .env   # renseigner AUTH_SECRET et les mots de passe de seed
pnpm db:migrate && pnpm db:seed && pnpm dev
```

Documentation : [installation](docs/installation.md) · [déploiement Vercel](docs/deploiement-vercel.md) · [architecture](docs/architecture.md) · [base de données](docs/database.md) · [permissions](docs/permissions.md) · [planning](docs/planning.md) · [état d'avancement](docs/implementation-status.md).

Documents de référence du projet : `claude.md`, `roadmap.md`, `explications_fonctionnalites.txt`.

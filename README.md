# GRH JIRAMA Antsirabe

Application web de gestion des ressources humaines de la JIRAMA Antsirabe : personnel, services et postes, congés, présences des équipes postées, communication interne, tableaux de bord et rapports PDF/Excel.

**Stack** : Next.js 16 (App Router, Server Actions) · TypeScript · SQLite + Prisma · Auth.js · Tailwind CSS 4 + shadcn/ui · Recharts · React Hook Form + Zod · ExcelJS · PDFKit · Vitest · Playwright.

```bash
pnpm install && cp .env.example .env   # renseigner AUTH_SECRET et les mots de passe de seed
pnpm db:migrate && pnpm db:seed && pnpm dev
```

Documentation : [installation](docs/installation.md) · [déploiement Vercel](docs/deploiement-vercel.md) · [architecture](docs/architecture.md) · [base de données](docs/database.md) · [permissions](docs/permissions.md) · [planning](docs/planning.md) · [état d'avancement](docs/implementation-status.md).

## Lancer avec Docker

Prérequis : Docker avec Docker Compose. Depuis le dossier du projet, lancez le script :

```bash
bash run.sh
```

Le script crée `.env.docker` avec des secrets aléatoires si nécessaire. Il restaure la sauvegarde locale la plus récente si elle existe dans `backups/`. Sur un clone sans sauvegarde, Docker crée la base SQLite, applique les migrations et insère automatiquement les données de démonstration. Ouvrez <http://localhost:3000>. Le script affiche les identifiants de connexion. Les données et les secrets restent dans les fichiers locaux ignorés par Git.

### Sauvegarder et transmettre les données

Créez une sauvegarde cohérente de la base et des fichiers téléversés :

```bash
docker compose exec app pnpm db:backup
```

Le dossier horodaté apparaît sous `backups/`. Pour transmettre les données à un ami, envoyez-lui le dossier de sauvegarde avec le code de l'application. Il peut en extraire `grh.db` dans `data/` et le contenu de `storage/` dans `storage/`, créer son propre `.env.docker`, puis lancer `docker compose up --build -d`. La sauvegarde contient les comptes et données de la base ; utilisez un canal privé et partagez les identifiants séparément.

Pour arrêter l'application : `docker compose down`. Pour préserver les données, ne supprimez pas les dossiers `data/`, `storage/` ou `backups/`.

Documents de référence du projet : `claude.md`, `roadmap.md`, `explications_fonctionnalites.txt`.

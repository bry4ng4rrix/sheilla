# Installation, déploiement et sauvegarde

## Prérequis
Node.js ≥ 20 (testé avec Node 26) et pnpm.

## Installation (développement)
```bash
pnpm install                 # génère aussi le client Prisma
cp .env.example .env         # puis renseigner AUTH_SECRET (openssl rand -base64 32) et les mots de passe de seed
pnpm db:migrate              # crée data/grh.db et applique les migrations
pnpm db:seed                 # données de démonstration (refusé si NODE_ENV=production)
pnpm dev                     # http://localhost:3000
```

### Comptes de démonstration (créés par le seed)
| Rôle | E-mail | Mot de passe |
|---|---|---|
| Administrateur (compte technique) | `SEED_ADMIN_EMAIL` (défaut `admin@jirama.mg`) | `SEED_ADMIN_PASSWORD` |
| Responsable RH | `rh@jirama.mg` | `SEED_DEMO_PASSWORD` |
| Employé (plombier, brigade de dépannage) | `hery.razafindrakoto@jirama.mg` | `SEED_DEMO_PASSWORD` |
| Employé (opérateur de centrale, rotation 3×8) | `toky.andriamihaja@jirama.mg` | `SEED_DEMO_PASSWORD` |
| Employé parti (compte bloqué, historique conservé) | `patrick.ramanantsoa@jirama.mg` | — |

Tous les agents ont un compte `prenom.nom@jirama.mg`. Aucun mot de passe n'est écrit dans le dépôt.

## Scripts
| Commande | Rôle |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | développement / build / production |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript |
| `pnpm test` | tests unitaires + intégration (base dédiée `data/test.db`) |
| `pnpm test:e2e` | parcours Playwright des 3 profils (base de démonstration, serveur sur :3000) — `pnpm exec playwright install chromium` la première fois |
| `pnpm db:migrate` / `pnpm db:deploy` | migrations (dev / production) |
| `pnpm db:seed` | données de démonstration |
| `pnpm db:backup` | sauvegarde de la base et des fichiers |

## Déploiement (serveur Linux)
```bash
NODE_ENV=production pnpm install --frozen-lockfile
pnpm db:deploy               # jamais db:seed en production
pnpm build
pnpm start                   # port 3000, à placer derrière un proxy HTTPS (Nginx, Caddy)
```
Variables obligatoires en production : `DATABASE_URL` (chemin persistant, ex. `file:/var/lib/grh/grh.db`), `AUTH_SECRET`, `APP_URL`, `STORAGE_DIR` (ex. `/var/lib/grh/storage`), `AUTH_TRUST_HOST=true` derrière un proxy.
Créer le premier administrateur : lancer une fois le seed sur une base vide **ou** insérer un compte via `prisma studio` avec un hachage bcrypt.

Points d'attention :
- Une seule instance Node (SQLite + limiteur de connexions en mémoire). Pour plusieurs instances, passer à PostgreSQL et à un limiteur partagé.
- E-mails : le lien de réinitialisation est écrit dans les journaux serveur tant qu'aucun service d'envoi n'est branché (`src/server/actions/auth.ts`).

## Sauvegarde
```bash
pnpm db:backup               # → backups/<horodatage>/grh.db + storage/
```
Le script utilise `VACUUM INTO`, qui produit une copie cohérente même pendant l'utilisation et en mode WAL (une copie brute du fichier pourrait être corrompue). À planifier quotidiennement, par exemple :
```cron
0 2 * * * cd /opt/grh && BACKUP_DIR=/var/backups/grh pnpm db:backup >> /var/log/grh-backup.log 2>&1
```
Vérification : `sqlite3 backups/<horodatage>/grh.db "pragma integrity_check;"` doit répondre `ok`.

## Restauration
1. Arrêter l'application (`systemctl stop grh` ou équivalent).
2. Remplacer le fichier de base : `cp backups/<horodatage>/grh.db /var/lib/grh/grh.db` et supprimer d'éventuels fichiers `grh.db-wal` / `grh.db-shm` restants.
3. Restaurer les fichiers : `rsync -a backups/<horodatage>/storage/ /var/lib/grh/storage/`.
4. `pnpm db:deploy` (applique les migrations plus récentes que la sauvegarde), puis redémarrer.

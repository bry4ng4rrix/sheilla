# Déploiement sur Vercel

Vercel exécute l'application en fonctions serverless **sans disque persistant** : le fichier `data/grh.db` et le dossier `storage/` y seraient perdus. L'application bascule donc automatiquement, selon les variables d'environnement :

| Besoin | En local | Sur Vercel |
|---|---|---|
| Base de données | fichier SQLite (`DATABASE_URL`) | **Turso** — SQLite hébergé (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) |
| Fichiers (photos, justificatifs, images) | dossier `storage/` | **Vercel Blob** en accès privé (`BLOB_READ_WRITE_TOKEN`) |

Le code reste identique : même schéma Prisma, mêmes migrations SQL. Les fichiers privés ne sont servis que par `/api/files`, après contrôle des droits.

## 1. Mettre le code sur GitHub
```bash
git add -A && git commit -m "Application GRH JIRAMA"
git remote add origin https://github.com/<compte>/<depot>.git   # si pas encore fait
git push -u origin main
```
`.env`, `data/` et `storage/` sont exclus du dépôt (`.gitignore`).

## 2. Créer le projet Vercel
vercel.com → **Add New… → Project** → importer le dépôt. Framework détecté : Next.js. Ne rien changer aux commandes : Vercel exécute automatiquement le script `vercel-build` (migrations Turso puis `next build`).

## 3. Brancher la base Turso
Onglet **Storage** du projet → **Marketplace** → **Turso** → créer une base (région proche de celle des fonctions Vercel, ex. Francfort `fra`) et la connecter au projet.
L'intégration ajoute `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN`. Si les noms injectés diffèrent, recréez-les sous ces noms exacts dans **Settings → Environment Variables**.

(Alternative sans Marketplace : compte sur turso.tech, `turso db create grh`, `turso db show grh --url`, `turso db tokens create grh`.)

## 4. Brancher Vercel Blob
Onglet **Storage** → **Create** → **Blob** → connecter au projet. La variable `BLOB_READ_WRITE_TOKEN` est ajoutée automatiquement.

## 5. Variables d'environnement
**Settings → Environment Variables** (Production et Preview) :

| Variable | Valeur |
|---|---|
| `AUTH_SECRET` | résultat de `openssl rand -base64 32` (différent du local) |
| `UPLOAD_MAX_MB` | `4` — Vercel refuse les requêtes de plus de 4,5 Mo |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` — utilise la version de pnpm déclarée dans `package.json` |
| `APP_URL` | facultatif : URL publique (par défaut le domaine de production Vercel) |

## 6. Déployer
**Deployments → Redeploy** (ou un nouveau `git push`). Le journal de build doit afficher `✔ 20261107144806_init` au premier déploiement, puis `Base Turso à jour.`

## 7. Données
**Démonstration** (soutenance, recette), depuis votre machine, avec les valeurs Turso du projet :
```bash
TURSO_DATABASE_URL="libsql://…" TURSO_AUTH_TOKEN="…" pnpm db:seed
```
Le seed efface puis recrée les données (quelques minutes à travers le réseau). Les mots de passe sont ceux de `SEED_ADMIN_PASSWORD` / `SEED_DEMO_PASSWORD` dans votre `.env` local.

**Exploitation réelle** : ne pas lancer le seed sur une base contenant de vraies données. Créer le premier administrateur une seule fois, puis gérer les comptes depuis l'application.

## Sauvegarde sur Turso
`pnpm db:backup` ne s'applique qu'au fichier local. Avec Turso : `turso db shell grh .dump > grh-$(date +%F).sql`, ou les points de restauration de la console Turso. Les fichiers Blob se gèrent depuis l'onglet Storage de Vercel.

## Limites connues sur Vercel
- La limitation de débit des connexions est en mémoire, donc propre à chaque instance serverless. Le verrouillage d'un compte après 5 échecs, lui, est stocké en base et reste effectif.
- Chaque requête SQL traverse le réseau jusqu'à Turso : choisir la même région que les fonctions Vercel (**Settings → Functions → Region**).
- Les justificatifs d'une demande de congé ne doivent pas dépasser 4,5 Mo au total.

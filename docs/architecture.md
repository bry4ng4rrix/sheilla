# Architecture technique

Application **Next.js 16 (App Router)** assurant frontend et backend, sans serveur séparé.

```
src/
  app/(auth)/            login, forgot-password, reset-password
  app/(app)/             pages protégées (layout = sidebar + header)
  app/api/auth/          Auth.js
  app/api/files/         téléchargement contrôlé des fichiers
  app/api/reports/[type] exports PDF / XLSX
  components/ui/         shadcn/ui (Base UI)
  components/<module>/   composants métier (formulaires, tableaux, graphiques)
  lib/                   session & RBAC, permissions, validations Zod, stockage, dates, audit, erreurs
  server/actions/        Server Actions (contrôle des permissions + validation + appel des services)
  server/services/       logique métier (congés, moteur de présence, planning, rapports, tableaux de bord)
prisma/                  schema.prisma, migrations, seed.ts
tests/unit|integration|e2e
scripts/backup.mts       sauvegarde SQLite (VACUUM INTO) + fichiers
```

## Flux d'une action
`Formulaire (RHF + Zod)` → `Server Action` → `requireUser(permission)` → `schema.parse()` (même schéma que le client) → `service` (transaction Prisma + `audit()` + `notify()`) → `revalidatePath()` → toast.

Les erreurs sont centralisées par `runAction()` (`src/lib/errors.ts`) : seules les `AppError` et erreurs Zod sont montrées à l'utilisateur, le reste est journalisé côté serveur avec un message générique.

## Sécurité
- **Authentification** : Auth.js v5 (Credentials, JWT en cookie HTTP-only, `Secure` en HTTPS, `SameSite=Lax`, expiration 8 h), bcrypt (coût 12), comparaison à temps constant pour les comptes inconnus, verrouillage 15 min après 5 échecs, limitation de débit sur les échecs (IP + e-mail).
- **Session rechargée depuis SQLite à chaque requête** (`getCurrentUser`) : un compte désactivé perd l'accès immédiatement, même avec un jeton encore valide.
- **RBAC** : permissions stockées en base (`Role`, `Permission`, `RolePermission`), vérifiées dans chaque page (`requirePage`), chaque Server Action et Route Handler (`requireUser`/`can`). Masquer un bouton n'est jamais la seule protection.
- **RG07** : les pages personnelles filtrent sur `user.employeeId` ; `/leaves/[id]` renvoie 404 pour la demande d'un autre agent ; justificatifs servis uniquement à leur auteur et aux RH.
- **CSRF** : Server Actions protégées par la vérification d'origine de Next.js ; les Route Handlers exposés sont en lecture (GET) et authentifiés.
- **Injections** : uniquement des requêtes Prisma paramétrées ; une seule requête brute (`VACUUM INTO`) dans le script de sauvegarde, sans entrée utilisateur.
- **Fichiers** : stockés hors de `public/` (`STORAGE_DIR`), noms aléatoires, extension + signature binaire vérifiées, taille limitée, chemins normalisés contre la traversée de répertoire, interface `Storage` remplaçable par un stockage S3.

## Décisions et incohérences relevées dans les documents
| Sujet | Constat | Décision |
|---|---|---|
| Couleur principale | `claude.md` demande un bleu foncé ; la consigne utilisateur demande le thème du logo | Orange du logo `#EF8200` en couleur principale, bleu nuit conservé en couleur secondaire des graphiques |
| Modèle `Utilisateur` (UML) | Le diagramme fusionne compte et dossier (matricule, âge…) | `User` et `Employee` séparés, relation 1:1 facultative (comptes techniques) |
| Âge | Stocké dans l'UML | Calculé depuis `birthDate` |
| Bouton « Supprimer » (maquette) | Contredit RG08 | Remplacé par « Désactiver » (suppression logique) |
| Numérotation des RG | Diffère entre `roadmap.md` et `claude.md` | Le code suit `claude.md` (RG06 audit, RG08 conservation) |
| Couche repositories | Demandée | Prisma joue ce rôle ; pas de wrappers « passe-plat » sans logique |
| E-mail de réinitialisation | Aucun serveur SMTP fourni | Lien journalisé côté serveur ; brancher un mailer en production |
| Versions | Next 16 active Cache Components par défaut dans le gabarit | Désactivé : l'application est entièrement dynamique (session par requête) |
| Prisma | v7 impose des adaptateurs de pilote | Prisma 6.19 (moteur natif SQLite, enums SQLite supportés) |
| Absences | Pas de ligne en base pour un absent | Absences **déduites** du planning à la lecture (`buildSheet`) ; aucune absence pour un jour non planifié |

## Moteur de présence (`server/services/attendance-engine.ts`)
Fonctions pures, testées unitairement :
- `resolvePlan` : dérogation du jour > planning individuel > planning d'équipe (+ décalage de rotation) > planning par défaut. Fériés chômés pour les plannings hebdomadaires, travaillés pour les rotations continues.
- `shiftWindow` : un poste dont la fin est ≤ au début se termine le lendemain (nuit).
- `evaluateDay` : statut (présent, retard, absent, anomalie, congé, autorisation, repos), minutes de retard au-delà de la tolérance, dépassement, anomalies (entrée sans sortie, sortie sans entrée, pointages multiples, horaires incohérents).
- `workDayForCheckIn` : une entrée pendant un poste de nuit commencé la veille est rattachée à la veille.

Fuseau : Madagascar (UTC+3, sans heure d'été). Les jours sont stockés à minuit UTC, les horodatages en UTC.

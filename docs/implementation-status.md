# État d'avancement

Dernière mise à jour : 7 novembre 2026.

## Terminé et vérifié
| Module | Contenu | Vérification |
|---|---|---|
| Authentification | Connexion, déconnexion, verrouillage, limitation de débit, mot de passe oublié / réinitialisation, changement de mot de passe, blocage immédiat des comptes désactivés | E2E `auth.spec.ts` |
| Inscription | Page publique « Demander un accès » (nom, e-mail, matricule, mot de passe) ; compte créé inactif et en attente ; notification aux administrateurs ; validation par l'admin avec rattachement au dossier employé (RG02) ou refus motivé ; messages de connexion « en attente » / « refusée » | Intégration + E2E `registration.spec.ts` |
| Utilisateurs | Liste filtrable, création, modification, rôle, rattachement à un dossier (RG02), activation/désactivation, historique des connexions | E2E admin, intégration RG02 |
| RBAC | Permissions en base, contrôles pages/actions/API, menu filtré | E2E (accès refusé employé et RH), unitaires |
| Services & postes | CRUD, désactivation protégée, organigramme | Manuel |
| Personnel | Grille/tableau, recherche multicritère, filtres, tri, pagination, fiche (présences, congés, contrats, historique), formulaire avec photo, désactivation logique | E2E RH, intégration RG01 |
| Congés | Demande avec durée calculée et justificatifs, solde, annulation, instruction RH (validation, refus motivé), alerte collègues absents, historique, notifications | Intégration (workflow complet), E2E |
| Présences | Pointage libre-service (pages dédiées entrée/sortie), postes horaires, plannings hebdo/rotations, équipes avec décalage (affectées depuis la fiche agent ; la page de gestion des équipes a été retirée à la demande), plannings individuels, dérogations et astreintes, feuilles de présence, anomalies et correction RH auditée | Unitaires du moteur, intégration (nuit, double entrée, audit) |
| Communication | Annonces (types, image, brouillon/publication/archivage, expiration), fil d'actualité, suivi de lecture, centre de notifications | Manuel |
| Tableaux de bord | Administrateur, RH, employé — KPIs et graphiques calculés depuis SQLite | Manuel |
| Rapports | Employés, présences, absences, retards, congés, par service, mensuel — PDF et XLSX | Intégration + E2E |
| Exploitation | Seed, sauvegarde/restauration, documentation, compatibilité Vercel (Turso + Vercel Blob, migrations au build) | Sauvegarde vérifiée (`integrity_check`) ; seed et tests rejoués via l'adaptateur libSQL |

Qualité : `pnpm typecheck` ✔ · `pnpm lint` ✔ · `pnpm test` 61 tests ✔ · `pnpm test:e2e` 8 parcours ✔ · `pnpm build` ✔.

## Restant / améliorations possibles
- Envoi réel des e-mails (SMTP) pour la réinitialisation du mot de passe.
- Import de pointages depuis une badgeuse (la source `IMPORT` existe dans le modèle).
- Invalidation des sessions existantes lors d'un changement de mot de passe (aujourd'hui : expiration du jeton sous 8 h ; la désactivation, elle, est immédiate).
- Matérialisation nocturne des absences si l'effectif dépasse quelques centaines d'agents (calcul actuellement à la volée).
- Mode sombre.

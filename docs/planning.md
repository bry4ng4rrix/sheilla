# Planning de réalisation — GRH JIRAMA Antsirabe

Six phases, chacune validée avant la suivante (`pnpm typecheck`, `pnpm lint`, `pnpm test`, vérification à l'écran).

| Phase | Tâches | Critères de validation |
|---|---|---|
| **1. Infrastructure & sécurité** (BF01, BF02) | Next.js 16 App Router, TypeScript strict, Tailwind 4, shadcn/ui, Prisma + SQLite, schéma et migration initiale, Auth.js (identifiants), RBAC centralisé, layout (sidebar rétractable, drawer mobile, fil d'Ariane, recherche, notifications, menu utilisateur), gestion des utilisateurs | Connexion/déconnexion, verrouillage après 5 échecs, compte désactivé bloqué immédiatement, pages et actions refusées sans permission (tests E2E `auth.spec.ts`) |
| **2. Organisation & personnel** (BF03, BF04, BF08) | Services, postes, organigramme, employés (grille/tableau, fiche, formulaire, photo), recherche multicritère, filtres, tri, pagination, désactivation logique, historique (contrats, audit) | RG01 matricule unique, RG02 un compte par dossier, désactivation sans perte d'historique, impossible de désactiver un service/poste encore utilisé |
| **3. Congés & absences** (BF05, BF06) | Formulaire avec calcul de durée (jours ouvrables / calendaires, fériés), justificatifs, workflow PENDING → APPROVED/REJECTED/CANCELLED, refus motivé, historique, notifications | RG03, RG04, RG05, chevauchements refusés, solde contrôlé (tests d'intégration) |
| **4. Présences & pointages** (BF07) | Pointage libre-service, saisie/correction RH auditée, postes horaires, plannings hebdomadaires et rotations, équipes avec décalage, dérogations (poste, repos, astreinte), détection des anomalies, feuilles de présence | Retards avec tolérance, postes de nuit traversant minuit, pointages incomplets, jours non planifiés jamais « absents » (tests unitaires du moteur) |
| **5. Communication** | Annonces (types, image, statut, expiration), fil d'actualité, notifications (lu/non lu, tout marquer), suivi de lecture | Notification à la publication et à chaque décision de congé |
| **6. Reporting & finalisation** (BF09) | Tableaux de bord par rôle, KPIs et graphiques issus de SQLite, 7 rapports PDF/XLSX, tests, documentation, sauvegarde | Exports téléchargeables avec en-tête JIRAMA, totaux et zone de signature ; build de production OK |

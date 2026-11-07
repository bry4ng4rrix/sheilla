# PROMPT PRINCIPAL – DÉVELOPPEMENT COMPLET DE L'APPLICATION GRH JIRAMA ANTSIRABE

## 1. RÔLE ET OBJECTIF

Tu es un ingénieur logiciel Senior Fullstack spécialisé en Next.js, TypeScript, architecture logicielle, sécurité applicative, bases de données relationnelles et conception UX/UI.

Ta mission est de développer une application web professionnelle, complète, fonctionnelle et prête pour la production, destinée à la gestion des ressources humaines de la JIRAMA Antsirabe.

Tu dois utiliser exclusivement :

- Next.js avec App Router.
- React.
- TypeScript.
- SQLite.
- Prisma ORM.

**Important :** Next.js doit assurer à la fois le frontend et le backend. Ne crée pas de backend Django, FastAPI, Express ou autre serveur indépendant.

Les documents fonctionnels et les images du dossier fourni constituent les références principales du projet.

Avant de commencer :
1. Analyse intégralement les fichiers du dossier documentaire.
2. Étudie les maquettes graphiques.
3. Examine les diagrammes UML et les règles de gestion.
4. Identifie les éventuelles incohérences entre les documents.
5. Définis une architecture technique cohérente.
6. Crée les documents de planification.
7. Commence ensuite le développement réel.

Ne te contente jamais de produire des recommandations ou du code théorique. Tu dois effectivement créer et implémenter l'application dans le projet.

---

## 2. STACK TECHNIQUE OBLIGATOIRE

### Frontend
- Next.js App Router.
- React.
- TypeScript strict.
- Tailwind CSS.
- shadcn/ui.
- Lucide React.
- Recharts.
- React Hook Form.
- Zod.

### Backend
- Next.js Route Handlers.
- Server Actions lorsque pertinent.
- Architecture en couches : routes, services, repositories et validations.
- Gestion centralisée des erreurs.
- Contrôle des autorisations côté serveur.

### Base de données
- SQLite.
- Prisma ORM.
- Migrations Prisma.
- Relations avec contraintes d'intégrité.
- Index sur les champs de recherche.
- Transactions pour les opérations critiques.

### Authentification
- Auth.js.
- Connexion par adresse e-mail et mot de passe.
- bcrypt pour le hachage.
- Sessions sécurisées.
- Cookies HTTP-only, Secure en production et SameSite approprié.
- Protection contre les tentatives de connexion répétées.
- Réinitialisation sécurisée du mot de passe.

### Exportation
- ExcelJS pour Excel.
- PDFKit ou une bibliothèque PDF adaptée pour PDF.

### Qualité
- ESLint.
- Prettier.
- Tests unitaires avec Vitest.
- Tests end-to-end avec Playwright.

Utilise pnpm comme gestionnaire de paquets.

Évite les dépendances inutiles.

---

## 3. IDENTITÉ VISUELLE ET EXPÉRIENCE UTILISATEUR

Créer une interface professionnelle adaptée à une administration d'entreprise.

### Direction artistique

- Design moderne et élégant.
- Interface claire, structurée et cohérente.
- Couleurs institutionnelles inspirées de l'identité visuelle JIRAMA.
- Bleu foncé comme couleur principale.
- Blanc et gris clair pour les surfaces.
- Couleurs distinctes pour les états : succès, avertissement, erreur et information.
- Cartes avec bordures discrètes.
- Ombres légères.
- Border radius cohérent.
- Typographie lisible.
- Icônes Lucide React.

Éviter les interfaces trop chargées, les dégradés excessifs et le glassmorphism systématique.

### Layout principal

Créer :
- Sidebar rétractable.
- Logo et identité de l'application.
- Navigation organisée par modules.
- Header avec titre de page.
- Barre de recherche globale.
- Centre de notifications.
- Menu utilisateur.
- Fil d'Ariane.
- Contenu principal responsive.

### Responsive design

L'application doit fonctionner sur :
- Ordinateurs.
- Ordinateurs portables.
- Tablettes.
- Smartphones.

Sur mobile, adapter la navigation avec un menu latéral ou un drawer.

### Expérience utilisateur

Toutes les pages doivent proposer :
- États de chargement.
- Skeleton loaders.
- États vides explicites.
- Gestion des erreurs.
- Notifications toast.
- Confirmations avant les opérations sensibles.
- Pagination.
- Recherche.
- Filtres.
- Tri.
- Modales ergonomiques.

Les actions doivent être réellement fonctionnelles.

---

## 4. GESTION DES RÔLES ET AUTORISATIONS

Créer trois rôles principaux :

### ADMINISTRATEUR

Accès complet à l'application.

Autorisations :
- Gestion des utilisateurs.
- Création et modification des comptes.
- Attribution des rôles.
- Activation et désactivation des comptes.
- Gestion des paramètres.
- Consultation des journaux d'audit.
- Consultation des statistiques globales.
- Gestion des services et des postes.
- Supervision de l'ensemble de l'application.

### RESPONSABLE RH

Autorisations :
- Gestion des employés.
- Gestion des dossiers administratifs.
- Gestion des services et postes.
- Gestion des congés.
- Validation et refus des demandes.
- Gestion des pointages.
- Gestion des horaires et des rotations.
- Gestion des annonces.
- Consultation des statistiques.
- Exportation des rapports.

Ne lui attribue pas automatiquement les permissions de gestion des administrateurs et des rôles système.

### EMPLOYÉ

Autorisations :
- Consulter son espace personnel.
- Consulter ses informations.
- Modifier les champs autorisés de son profil.
- Consulter son historique de présence.
- Effectuer des demandes de congés.
- Joindre des justificatifs.
- Suivre les décisions RH.
- Annuler ses demandes lorsque le statut le permet.
- Consulter les annonces.
- Consulter et gérer ses notifications.

Un employé ne doit jamais accéder aux informations confidentielles d'un autre employé.

### Sécurité RBAC

Implémenter un système RBAC centralisé.

Les permissions doivent être vérifiées :
- Dans les pages.
- Dans les Server Actions.
- Dans les Route Handlers.
- Dans les services métier.

Ne jamais considérer la simple dissimulation d'un bouton comme une protection.

---

## 5. MODULE 1 – AUTHENTIFICATION ET UTILISATEURS

Créer les pages suivantes :

- /login
- /forgot-password
- /reset-password
- /admin/users
- /admin/users/create
- /admin/users/[id]

Fonctionnalités :

1. Connexion sécurisée.
2. Déconnexion.
3. Gestion des sessions.
4. Récupération du mot de passe.
5. Changement de mot de passe.
6. Création de compte.
7. Modification de compte.
8. Activation et désactivation.
9. Attribution de rôle.
10. Association d'un compte à un employé.
11. Historique des connexions si disponible.

Règle importante :

Un compte utilisateur ne peut être associé qu'à un seul dossier employé.

Prévoir les comptes techniques d'administration qui ne sont pas nécessairement liés à un employé.

---

## 6. MODULE 2 – GESTION DU PERSONNEL

Créer les pages :

- /employees
- /employees/create
- /employees/[id]
- /employees/[id]/edit

### Liste des employés

Afficher les employés sous forme de grille ou de tableau.

Informations :
- Photo.
- Matricule.
- Nom.
- Prénom.
- Service.
- Poste.
- Statut.
- Date de recrutement.

Actions :
- Consulter.
- Modifier.
- Désactiver.
- Consulter l'historique.

### Formulaire employé

Informations personnelles :
- Matricule unique.
- Nom.
- Prénom.
- Sexe.
- Date de naissance.
- Adresse.
- Téléphone.
- E-mail.
- Photo.

Informations professionnelles :
- Service.
- Poste.
- Date de recrutement.
- Type de contrat.
- Statut professionnel.
- Date de départ éventuelle.

Prévoir des champs extensibles si les documents de référence contiennent des informations supplémentaires.

### Recherche

Permettre une recherche multicritère :
- Matricule.
- Nom.
- Prénom.
- Service.
- Poste.

### Conservation

Utiliser la désactivation logique.

Ne jamais supprimer automatiquement les pointages, congés et historiques d'un employé désactivé.

---

## 7. MODULE 3 – SERVICES ET POSTES

Créer :

- /organization/services
- /organization/positions

Fonctionnalités :

Services :
- Ajouter.
- Modifier.
- Consulter.
- Désactiver.
- Rechercher.

Postes :
- Ajouter.
- Modifier.
- Consulter.
- Désactiver.
- Associer à un service.

Prévoir un organigramme simple permettant de visualiser l'organisation de l'entreprise.

Empêcher la suppression des services ou postes encore utilisés sans traitement préalable des dépendances.

---

## 8. MODULE 4 – CONGÉS ET ABSENCES

Créer :

- /leaves
- /leaves/create
- /leaves/[id]
- /hr/leave-requests
- /hr/leave-requests/[id]

### Types de demandes

- Congé annuel.
- Congé maladie.
- Autorisation exceptionnelle.
- Congé maternité.
- Congé paternité.
- Autres autorisations d'absence.

### Soumission

L'employé doit pouvoir :
- Choisir le type.
- Choisir la date de début.
- Choisir la date de fin.
- Ajouter un motif.
- Joindre un justificatif.
- Envoyer sa demande.

Calculer automatiquement la durée.

Prévoir une configuration des jours ouvrables et des jours fériés afin de calculer correctement les durées.

### Workflow

Statuts :
- PENDING.
- APPROVED.
- REJECTED.
- CANCELLED.

Le processus doit être strict :

Employé → Soumission → En attente → Décision RH.

Pour valider :
- Enregistrer le responsable.
- Enregistrer la date.
- Enregistrer la décision.

Pour refuser :
- Exiger un motif obligatoire.
- Enregistrer la justification.
- Conserver l'historique.

Une demande en attente ne constitue jamais une autorisation d'absence.

Empêcher les chevauchements incohérents entre demandes d'un même employé.

Prévoir un historique complet.

---

## 9. MODULE 5 – PRÉSENCES ET POINTAGES

Créer :

- /attendance
- /attendance/check-in
- /attendance/check-out
- /attendance/history
- /attendance/anomalies
- /attendance/schedules
- /attendance/teams

### Pointages

Enregistrer :
- Employé.
- Date.
- Heure d'entrée.
- Heure de sortie.
- Source du pointage.
- Observations.
- Auteur de la saisie.

Prévoir deux modes :

1. Enregistrement automatique par l'employé.
2. Saisie ou correction administrative par le responsable RH.

Conserver les anciennes valeurs et les modifications dans l'historique d'audit.

### Statuts

- Présent.
- Absent.
- Retard.
- Anomalie.
- Autorisation d'absence.
- Congé validé.

### Gestion des horaires

Ce module doit être particulièrement bien conçu pour la JIRAMA.

Prévoir :
- Horaires standards.
- Horaires décalés.
- Travail de nuit.
- Équipes rotatives.
- Plannings individuels.
- Plannings collectifs.
- Jours de repos.
- Astreintes.

Un service technique peut avoir plusieurs équipes.

Créer un moteur de calcul tenant compte des horaires réellement planifiés.

Les horaires de nuit doivent pouvoir traverser minuit.

### Détection des anomalies

Identifier :
- Retards.
- Absences sans justification.
- Entrée sans sortie.
- Sortie sans entrée.
- Pointages multiples incohérents.
- Dépassements horaires.

Ne pas signaler automatiquement comme absent un employé qui n'est pas planifié ce jour-là.

Permettre au responsable RH de traiter les anomalies.

---

## 10. MODULE 6 – COMMUNICATION INTERNE

Créer :

- /announcements
- /announcements/create
- /announcements/[id]
- /notifications

### Annonces

Le responsable RH peut publier :
- Notes de service.
- Communiqués.
- Informations urgentes.
- Informations générales.

Chaque annonce comporte :
- Titre.
- Type.
- Contenu.
- Image facultative.
- Auteur.
- Date de publication.
- Date éventuelle d'expiration.
- Statut de publication.

### Fil d'actualité

Afficher les annonces aux employés selon leur statut de publication.

### Notifications

Générer des notifications lors de :
- Soumission de demande.
- Validation de congé.
- Refus de congé.
- Publication d'une annonce.
- Événement administratif important.

Fonctionnalités :
- Lu / non lu.
- Marquer comme lu.
- Marquer tout comme lu.
- Historique.
- Lien vers l'événement concerné.

---

## 11. MODULE 7 – DASHBOARD ET STATISTIQUES

Créer des tableaux de bord différents selon le rôle.

### Dashboard administrateur

Afficher :
- Effectif global.
- Comptes actifs.
- Services.
- Postes.
- Demandes en attente.
- Activité récente.
- Statistiques globales.

### Dashboard RH

Afficher :
- Nombre total d'employés actifs.
- Demandes en attente.
- Taux de présence.
- Nombre de services.
- Nombre de postes.
- Anomalies de pointage.
- Congés en cours.

Graphiques :
- Évolution mensuelle des effectifs.
- Volume mensuel des demandes.
- Répartition présence / absence.
- Répartition par service.
- Évolution des retards.

### Dashboard employé

Afficher :
- Informations personnelles.
- Derniers pointages.
- Solde de congés si cette donnée est configurée.
- Demandes en cours.
- Historique des demandes.
- Dernières annonces.
- Notifications.

IMPORTANT :

Tous les KPIs doivent provenir de requêtes réelles dans SQLite.

Ne jamais utiliser de chiffres codés en dur pour simuler les statistiques.

---

## 12. MODULE 8 – EXPORTATION ET RAPPORTS

Créer :

- /reports
- /reports/attendance
- /reports/leaves
- /reports/employees

Permettre de générer :

1. Rapport des employés.
2. Rapport des présences.
3. Rapport des absences.
4. Rapport des retards.
5. Rapport des congés.
6. Rapport par service.
7. Rapport mensuel.

Formats :
- PDF.
- XLSX.

Filtres :
- Période.
- Service.
- Employé.
- Statut.
- Type de demande.

Les documents doivent avoir une présentation administrative professionnelle avec :
- Identité JIRAMA.
- Titre du rapport.
- Période.
- Date de génération.
- Tableau des données.
- Totaux.
- Signature ou zone de validation si nécessaire.

---

## 13. MODÈLE DE DONNÉES SQLITE

Concevoir un modèle relationnel complet avec Prisma.

Prévoir au minimum les entités suivantes :

- User
- Employee
- Role
- Permission
- RolePermission
- Department
- Position
- Contract
- LeaveRequest
- LeaveAttachment
- LeaveDecision
- AttendanceRecord
- AttendanceEvent
- WorkSchedule
- Shift
- Team
- EmployeeSchedule
- Holiday
- Announcement
- AnnouncementAttachment
- Notification
- AuditLog
- SystemSetting
- PasswordResetToken

Tu peux ajouter les entités nécessaires pour garantir une architecture cohérente.

### Relations importantes

- User ↔ Employee : relation 1:1 facultative pour les comptes techniques.
- Department → Position : 1:N.
- Position → Employee : 1:N.
- Employee → LeaveRequest : 1:N.
- Employee → AttendanceRecord : 1:N.
- Employee → AttendanceEvent : 1:N.
- User → Notification : 1:N.
- User → AuditLog : 1:N.
- Employee → EmployeeSchedule : 1:N.

Utiliser des clés étrangères et des contraintes d'unicité.

Ajouter des index pour les recherches par matricule, nom, date, service et statut.

Prévoir les champs createdAt, updatedAt et deletedAt lorsque pertinents.

Ne jamais stocker les mots de passe en clair.

---

## 14. GESTION DES FICHIERS

Gérer les téléversements de :

- Photos des employés.
- Justificatifs de congés.
- Images d'annonces.

Créer un système de stockage local configurable.

Les fichiers doivent être conservés dans un répertoire persistant non accessible directement sans autorisation.

Mettre en place :
- Vérification du type MIME.
- Vérification de l'extension.
- Limitation de taille.
- Noms de fichiers générés aléatoirement.
- Protection contre les chemins malveillants.
- Contrôle d'accès avant téléchargement.

Ne pas stocker les fichiers binaires directement dans SQLite.

Prévoir une abstraction de stockage permettant éventuellement de passer à un stockage S3 compatible.

---

## 15. SÉCURITÉ ET RÈGLES MÉTIER

Respecter impérativement les règles suivantes :

RG01 : Matricule unique.

RG02 : Un compte ne correspond qu'à un employé.

RG03 : Une demande doit avoir des dates valides et un motif.

RG04 : Une demande en attente ne donne aucun droit d'absence.

RG05 : Un refus doit obligatoirement comporter une justification.

RG06 : Les opérations sensibles sont journalisées.

RG07 : Un employé ne consulte que ses propres données privées.

RG08 : La désactivation ne détruit jamais l'historique.

Ajouter également :
- Protection CSRF selon le mécanisme d'authentification utilisé.
- Protection contre les injections.
- Validation côté serveur.
- Contrôle d'accès aux fichiers.
- Rate limiting sur l'authentification.
- Gestion des erreurs sans divulgation d'informations sensibles.
- Protection des secrets avec les variables d'environnement.

Créer un AuditService centralisé.

Journaliser au minimum :
- Création d'un employé.
- Modification d'un dossier.
- Désactivation d'un employé.
- Création d'un utilisateur.
- Changement de rôle.
- Validation d'un congé.
- Refus d'un congé.
- Modification d'un pointage.
- Modification des paramètres.

---

## 16. ARCHITECTURE DU PROJET

Organiser le projet proprement.

Exemple de structure :

src/
  app/
    (auth)/
      login/
      forgot-password/
      reset-password/

    (dashboard)/
      dashboard/
      employees/
      organization/
      leaves/
      attendance/
      announcements/
      notifications/
      reports/
      admin/
      settings/

    api/
      auth/
      employees/
      departments/
      positions/
      leaves/
      attendance/
      announcements/
      notifications/
      reports/

  components/
    ui/
    layout/
    dashboard/
    employees/
    leaves/
    attendance/
    announcements/
    shared/

  lib/
    auth/
    prisma/
    permissions/
    validations/
    storage/
    utils/

  server/
    services/
    repositories/
    actions/

  hooks/
  types/

prisma/
  schema.prisma
  migrations/
  seed.ts

tests/
  unit/
  integration/
  e2e/

storage/
  employees/
  announcements/
  leave-attachments/

docs/
  architecture.md
  database.md
  permissions.md
  installation.md
  roadmap.md

La structure peut évoluer si une meilleure organisation technique est justifiée.

---

## 17. DONNÉES DE DÉMONSTRATION

Créer un script de seed Prisma.

Il doit permettre d'initialiser :

- Un administrateur.
- Un responsable RH.
- Plusieurs employés.
- Plusieurs services.
- Plusieurs postes.
- Quelques demandes de congés.
- Des pointages.
- Des horaires.
- Des annonces.
- Des notifications.

Les comptes de démonstration doivent être documentés.

Le mot de passe initial administrateur doit être configurable avec une variable d'environnement et ne jamais être codé en dur dans le dépôt.

Ne pas insérer de données de démonstration automatiquement dans une base de production.

---

## 18. PLAN DE DÉVELOPPEMENT OBLIGATOIRE

Développer progressivement selon les six phases suivantes.

### PHASE 1 – Infrastructure et sécurité

- Initialisation Next.js.
- Installation des dépendances.
- Configuration TypeScript.
- Configuration Tailwind.
- Installation shadcn/ui.
- Configuration Prisma.
- Création du schéma SQLite.
- Migrations.
- Authentification.
- RBAC.
- Layout principal.
- Gestion des utilisateurs.

### PHASE 2 – Organisation et personnel

- Services.
- Postes.
- Employés.
- Formulaires.
- Photos.
- Recherche.
- Filtres.
- Désactivation logique.
- Historique.

### PHASE 3 – Congés et absences

- Soumission.
- Pièces jointes.
- Workflow.
- Validation.
- Refus motivé.
- Historique.
- Notifications.

### PHASE 4 – Présences et pointages

- Pointages.
- Horaires.
- Équipes.
- Rotations.
- Retards.
- Absences.
- Anomalies.
- Historique.

### PHASE 5 – Communication

- Annonces.
- Images.
- Fil d'actualité.
- Notifications.
- Suivi de lecture.

### PHASE 6 – Reporting et finalisation

- Dashboard.
- KPIs.
- Graphiques.
- Rapports.
- PDF.
- Excel.
- Tests.
- Optimisation.
- Documentation.
- Préparation de production.

---

## 19. EXIGENCES DE DÉVELOPPEMENT

Tu dois respecter les exigences suivantes pendant toute la réalisation :

1. Développer de véritables fonctionnalités, pas des interfaces statiques.
2. Connecter toutes les interfaces à SQLite.
3. Ne pas utiliser de données fictives dans les fonctionnalités de production.
4. Ne pas créer de boutons sans action.
5. Ne pas laisser de formulaires sans validation.
6. Ne pas ignorer les erreurs.
7. Ne pas dupliquer la logique métier dans plusieurs composants.
8. Utiliser des composants réutilisables.
9. Utiliser des services métier centralisés.
10. Vérifier les permissions côté serveur.
11. Utiliser des transactions pour les opérations critiques.
12. Documenter les décisions techniques.
13. Vérifier le fonctionnement après chaque module.
14. Corriger les erreurs TypeScript, ESLint et Prisma.
15. Éviter les fichiers inutilement volumineux.
16. Prévoir des états de chargement et d'erreur.
17. Préserver les données lors des mises à jour.

Si une fonctionnalité est trop complexe, ne la simule pas. Décompose-la en étapes et implémente-la correctement.

---

## 20. TESTS ET VALIDATION

Créer des tests pour les fonctionnalités critiques.

Tester notamment :

- Connexion et déconnexion.
- Permissions par rôle.
- Association compte/employé.
- Unicité du matricule.
- Création d'employé.
- Désactivation.
- Soumission de congé.
- Refus sans justification.
- Validation d'une demande.
- Chevauchement des congés.
- Calcul des durées.
- Calcul des retards.
- Horaires de nuit.
- Pointages incomplets.
- Confidentialité des données.
- Génération des rapports.

Les tests end-to-end doivent couvrir les parcours complets des trois profils.

---

## 21. LIVRABLES ATTENDUS

À la fin du projet, fournir :

1. Application Next.js complète.
2. Base SQLite fonctionnelle.
3. Schéma Prisma.
4. Migrations.
5. Script de seed.
6. Authentification sécurisée.
7. Système RBAC.
8. Tous les modules fonctionnels.
9. Interface responsive.
10. Export PDF et Excel.
11. Tests unitaires et end-to-end.
12. Documentation technique.
13. Guide d'installation.
14. Guide de déploiement.
15. Fichier .env.example.
16. Procédure de sauvegarde et restauration SQLite.

Prévoir les scripts :

- pnpm dev
- pnpm build
- pnpm start
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm test:e2e
- pnpm db:migrate
- pnpm db:seed

Prévoir également un système de sauvegarde de la base SQLite cohérent, utilisant une méthode compatible avec SQLite WAL si ce mode est activé.

---

## 22. CONSIGNE FINALE

Commence par examiner les fichiers disponibles dans le dossier du projet.

Crée ensuite :

- planning.md
- architecture.md
- database.md
- implementation-status.md

Dans planning.md, détaille les six phases avec leurs tâches et critères de validation.

Dans implementation-status.md, tiens à jour les fonctionnalités réellement terminées, en cours et restantes.

Ensuite, commence immédiatement la PHASE 1.

Ne t'arrête pas après avoir généré le planning.

Continue à développer les modules progressivement, en vérifiant chaque fonctionnalité avant de passer à la suivante.

Si tu rencontres une ambiguïté dans les documents, choisis une solution technique cohérente, documente-la et continue.

**OBJECTIF FINAL : livrer une véritable application de gestion RH JIRAMA Antsirabe, entièrement fonctionnelle, sécurisée, responsive, maintenable et exploitable en production, développée avec Next.js, TypeScript et SQLite, sans backend externe.**

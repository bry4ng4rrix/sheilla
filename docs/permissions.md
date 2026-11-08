# Rôles et permissions

Source unique : `src/lib/permissions.ts` (copiée en base par le seed). Vérification côté serveur dans les pages, Server Actions, Route Handlers et services.

| Permission | Administrateur | Responsable RH | Employé |
|---|:-:|:-:|:-:|
| `users.manage` — comptes et rôles | ✔ | | |
| `settings.manage` — paramètres système | ✔ | | |
| `audit.view` — journal d'audit | ✔ | | |
| `org.manage` — services, postes | ✔ | ✔ | |
| `employees.view` / `employees.manage` | ✔ | ✔ | |
| `leaves.manage` — valider / refuser | ✔ | ✔ | |
| `attendance.manage` — pointages, horaires, équipes, anomalies | ✔ | ✔ | |
| `holidays.manage` — jours fériés | ✔ | ✔ | |
| `announcements.manage` | ✔ | ✔ | |
| `reports.view` — statistiques et exports | ✔ | ✔ | |
| `leaves.request`, `attendance.self`, `announcements.view` | ✔ | ✔ | ✔ |

Règles complémentaires :
- Les actions personnelles (pointer, demander un congé, modifier son profil) exigent un compte rattaché à un dossier employé.
- Un gestionnaire RH ne peut pas statuer sur sa propre demande.
- Un administrateur ne peut ni se désactiver ni retirer son propre rôle administrateur.
- Un employé ne modifie que téléphone, e-mail personnel, adresse et photo (RG07).

## Inscription en libre-service
- Toute personne peut demander un accès depuis `/register` : le compte est créé **inactif** avec le statut `PENDING` et le rôle Employé.
- Seul un administrateur (`users.manage`) peut valider la demande (page **Administration → Inscriptions**), en rattachant le compte à un dossier employé sans compte (RG02), ou la refuser avec un motif.
- Tant que la demande n'est pas validée, la connexion est refusée ; le message « en attente » ou « refusée » n'apparaît qu'avec le bon mot de passe, pour ne pas révéler l'existence des comptes.

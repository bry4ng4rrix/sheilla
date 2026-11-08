# Base de données (SQLite + Prisma)

Schéma : `prisma/schema.prisma` · migrations : `prisma/migrations/`.

| Domaine | Modèles |
|---|---|
| Sécurité | `User`, `Role`, `Permission`, `RolePermission`, `PasswordResetToken`, `AuditLog`, `SystemSetting` |
| Organisation | `Department` (service) 1—N `Position` (poste) 1—N `Employee`, `Contract`, `Team` |
| Congés | `LeaveRequest` 1—N `LeaveAttachment`, 1—N `LeaveDecision`, `Holiday` |
| Présences | `Shift` (poste horaire), `WorkSchedule` (planning hebdo ou cyclique), `EmployeeSchedule` (dérogation datée), `AttendanceRecord` (journée), `AttendanceEvent` (pointage brut) |
| Communication | `Announcement` 1—N `AnnouncementAttachment`, `AnnouncementRead`, `Notification` |

## Contraintes et index
- `Employee.matricule` unique (RG01), `User.email` unique, `User.employeeId` unique et facultatif (RG02).
- `Position (departmentId, title)` unique ; `AttendanceRecord (employeeId, date)` unique ; `EmployeeSchedule (employeeId, date, kind)` unique.
- Index : nom/prénom, poste, statut, `deletedAt`, `LeaveRequest(employeeId,status)`, `(startDate,endDate)`, `AttendanceRecord(date,status)`, `AuditLog(entity,entityId)`, `createdAt`, `Notification(userId,readAt)`.
- Clés étrangères sans suppression en cascade sur l'historique : un employé désactivé (`deletedAt`) conserve contrats, congés, pointages et audit (RG08).

## Conventions
- Dates « jour » (congés, présence, fériés) : minuit UTC du jour calendaire malgache. Horodatages : UTC.
- `AttendanceRecord.status` est un cache recalculé à chaque écriture ; les écrans recalculent en direct (`buildSheet`) pour les anomalies dépendant de l'heure.
- `WorkSchedule.pattern` : codes de postes séparés par des virgules, `R` = repos (7 codes pour un planning hebdomadaire).
- Mots de passe : uniquement des hachages bcrypt. Jetons de réinitialisation : seul le SHA-256 est stocké, validité 1 h, usage unique.
- Fichiers binaires jamais en base : seule la clé de stockage est enregistrée.

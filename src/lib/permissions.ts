export const PERMISSIONS = {
  "users.manage": "Gérer les comptes utilisateurs et les rôles",
  "settings.manage": "Modifier les paramètres système",
  "audit.view": "Consulter le journal d'audit",
  "org.manage": "Gérer les services, postes et équipes",
  "employees.view": "Consulter les dossiers du personnel",
  "employees.manage": "Créer, modifier et désactiver les employés",
  "leaves.request": "Soumettre ses demandes de congé",
  "leaves.manage": "Valider ou refuser les demandes de congé",
  "attendance.self": "Pointer et consulter ses présences",
  "attendance.manage": "Gérer les pointages, horaires et anomalies",
  "holidays.manage": "Gérer les jours fériés",
  "announcements.view": "Consulter les annonces",
  "announcements.manage": "Publier et gérer les annonces",
  "reports.view": "Consulter les statistiques et exporter les rapports",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export type RoleCode = "ADMIN" | "HR" | "EMPLOYEE";

const SELF: Permission[] = [
  "leaves.request",
  "attendance.self",
  "announcements.view",
];

export const ROLE_PERMISSIONS: Record<RoleCode, Permission[]> = {
  ADMIN: Object.keys(PERMISSIONS) as Permission[],
  HR: [
    ...SELF,
    "org.manage",
    "employees.view",
    "employees.manage",
    "leaves.manage",
    "attendance.manage",
    "holidays.manage",
    "announcements.manage",
    "reports.view",
  ],
  EMPLOYEE: SELF,
};

export const ROLE_LABELS: Record<RoleCode, string> = {
  ADMIN: "Administrateur",
  HR: "Responsable RH",
  EMPLOYEE: "Employé",
};

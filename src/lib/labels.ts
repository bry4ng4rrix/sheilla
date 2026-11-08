// Libellés français et tons de badge pour les enums.
export type Tone =
  "neutral" | "success" | "warning" | "danger" | "info" | "brand" | "violet";

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "Congé annuel",
  SICK: "Congé maladie",
  EXCEPTIONAL: "Autorisation exceptionnelle",
  MATERNITY: "Congé maternité",
  PATERNITY: "Congé paternité",
  OTHER: "Autre absence",
};

export const LEAVE_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "En attente", tone: "warning" },
  APPROVED: { label: "Validée", tone: "success" },
  REJECTED: { label: "Refusée", tone: "danger" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
};

export const ATTENDANCE_STATUS: Record<string, { label: string; tone: Tone }> =
  {
    PRESENT: { label: "Présent", tone: "success" },
    ABSENT: { label: "Absent", tone: "danger" },
    LATE: { label: "Retard", tone: "warning" },
    ANOMALY: { label: "Anomalie", tone: "violet" },
    AUTHORIZED: { label: "Autorisation", tone: "info" },
    LEAVE: { label: "Congé validé", tone: "info" },
    OFF: { label: "Repos", tone: "neutral" },
    UPCOMING: { label: "À venir", tone: "neutral" },
  };

export const EMPLOYEE_STATUS: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: "Actif", tone: "success" },
  SUSPENDED: { label: "Suspendu", tone: "warning" },
  LEFT: { label: "Parti", tone: "neutral" },
};

export const CONTRACT_LABELS: Record<string, string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  PRESTATAIRE: "Prestataire",
};
export const GENDER_LABELS: Record<string, string> = {
  M: "Masculin",
  F: "Féminin",
};

export const ANNOUNCEMENT_TYPE: Record<string, { label: string; tone: Tone }> =
  {
    NOTE_SERVICE: { label: "Note de service", tone: "brand" },
    COMMUNIQUE: { label: "Communiqué", tone: "info" },
    URGENT: { label: "Urgent", tone: "danger" },
    GENERAL: { label: "Information", tone: "neutral" },
  };

export const PUBLICATION_STATUS: Record<string, { label: string; tone: Tone }> =
  {
    DRAFT: { label: "Brouillon", tone: "neutral" },
    PUBLISHED: { label: "Publiée", tone: "success" },
    ARCHIVED: { label: "Archivée", tone: "warning" },
  };

export const SCHEDULE_CATEGORY: Record<string, string> = {
  STANDARD: "Horaire standard",
  SHIFTED: "Horaire décalé",
  NIGHT: "Travail de nuit",
  ROTATING: "Équipes rotatives",
};

export const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

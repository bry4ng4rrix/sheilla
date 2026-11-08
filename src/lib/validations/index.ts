import { z } from "zod";

// Tous les schémas acceptent des chaînes (valeurs de formulaire) : partagés entre le client (RHF) et le serveur (FormData).
const req = (label: string, max = 120) =>
  z
    .string()
    .trim()
    .min(1, `${label} est obligatoire.`)
    .max(max, `${label} est trop long.`);
const opt = (max = 255) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);
const day = (label: string) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} invalide.`);
const optDay = z
  .string()
  .optional()
  .transform((v) => v || null)
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.")
      .nullable(),
  );
const hhmm = (label: string) =>
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, `${label} : format HH:mm attendu.`);
const password = z
  .string()
  .min(10, "10 caractères minimum.")
  .regex(/[A-Z]/, "Au moins une majuscule.")
  .regex(/[a-z]/, "Au moins une minuscule.")
  .regex(/\d/, "Au moins un chiffre.");

export const loginSchema = z.object({
  email: z.email("E-mail invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});
export const forgotSchema = z.object({ email: z.email("E-mail invalide.") });
export const resetSchema = z
  .object({ token: z.string().min(10), password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirm"],
  });
export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Mot de passe actuel requis."),
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirm"],
  });

export const registerSchema = z
  .object({
    name: req("Le nom complet"),
    email: z.email("E-mail invalide.").transform((v) => v.toLowerCase()),
    matricule: req("Le matricule", 20).regex(/^[A-Za-z0-9-]+$/, "Matricule : lettres, chiffres et tirets uniquement.").transform((v) => v.toUpperCase()),
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Les mots de passe ne correspondent pas.", path: ["confirm"] });

export const rejectRegistrationSchema = z.object({ note: req("Le motif du refus", 500).min(5, "Motif trop court (5 caractères min.).") });

export const userSchema = z.object({
  name: req("Le nom"),
  email: z.email("E-mail invalide.").transform((v) => v.toLowerCase()),
  roleCode: z.enum(["ADMIN", "HR", "EMPLOYEE"]),
  employeeId: opt(40),
  password: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(password.nullable()),
});

export const departmentSchema = z.object({
  code: req("Le code", 12).transform((v) => v.toUpperCase()),
  name: req("Le nom"),
  description: opt(500),
});
export const positionSchema = z.object({
  title: req("L'intitulé"),
  departmentId: req("Le service", 40),
  description: opt(500),
});

export const employeeSchema = z.object({
  matricule: req("Le matricule", 20)
    .regex(
      /^[A-Za-z0-9-]+$/,
      "Matricule : lettres, chiffres et tirets uniquement.",
    )
    .transform((v) => v.toUpperCase()),
  lastName: req("Le nom", 80),
  firstName: req("Le prénom", 80),
  gender: z.enum(["M", "F"], "Sexe requis."),
  birthDate: optDay,
  address: opt(255),
  phone: opt(30),
  email: z
    .union([z.literal(""), z.email("E-mail invalide.")])
    .optional()
    .transform((v) => v || null),
  positionId: req("Le poste", 40),
  teamId: opt(40),
  hireDate: day("Date de recrutement"),
  contractType: z.enum(["CDI", "CDD", "STAGE", "PRESTATAIRE"]),
  status: z.enum(["ACTIVE", "SUSPENDED", "LEFT"]).default("ACTIVE"),
  departureDate: optDay,
});

export const profileSchema = z.object({
  address: opt(255),
  phone: opt(30),
  email: z
    .union([z.literal(""), z.email("E-mail invalide.")])
    .optional()
    .transform((v) => v || null),
});

export const LEAVE_TYPES = [
  "ANNUAL",
  "SICK",
  "EXCEPTIONAL",
  "MATERNITY",
  "PATERNITY",
  "OTHER",
] as const;
export const leaveSchema = z
  .object({
    type: z.enum(LEAVE_TYPES, "Type requis."),
    startDate: day("Date de début"),
    endDate: day("Date de fin"),
    reason: req("Le motif", 1000).min(
      5,
      "Motif trop court (5 caractères min.).",
    ),
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: "La date de fin doit être postérieure ou égale au début (RG03).",
    path: ["endDate"],
  });

export const decisionSchema = z
  .object({ decision: z.enum(["APPROVED", "REJECTED"]), comment: opt(1000) })
  .refine(
    (v) => v.decision === "APPROVED" || (v.comment && v.comment.length >= 5),
    {
      message: "Un motif de refus est obligatoire (RG05).",
      path: ["comment"],
    },
  );

export const shiftSchema = z.object({
  code: req("Le code", 4)
    .regex(/^[A-Z0-9]+$/i, "Code alphanumérique.")
    .transform((v) => v.toUpperCase())
    .refine((v) => v !== "R", "« R » est réservé au repos."),
  name: req("Le nom", 60),
  startTime: hhmm("Début"),
  endTime: hhmm("Fin"),
  graceMinutes: z.coerce.number().int().min(0).max(120),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide."),
});

export const scheduleSchema = z
  .object({
    name: req("Le nom", 80),
    category: z.enum(["STANDARD", "SHIFTED", "NIGHT", "ROTATING"]),
    kind: z.enum(["WEEKLY", "CYCLE"]),
    pattern: req("Le motif", 200).transform((v) =>
      v.toUpperCase().replace(/\s+/g, ""),
    ),
    cycleStart: optDay,
    description: opt(500),
  })
  .refine((v) => v.kind === "CYCLE" || v.pattern.split(",").length === 7, {
    message: "Un planning hebdomadaire contient 7 codes (lun → dim).",
    path: ["pattern"],
  })
  .refine((v) => v.kind === "WEEKLY" || !!v.cycleStart, {
    message: "Date de début de cycle requise.",
    path: ["cycleStart"],
  });

export const overrideSchema = z.object({
  employeeId: req("L'employé", 40),
  date: day("Date"),
  kind: z.enum(["SHIFT", "REST", "ON_CALL", "CLEAR"]),
  shiftId: opt(40),
  note: opt(255),
});

export const correctionSchema = z.object({
  employeeId: req("L'employé", 40),
  date: day("Date"),
  checkIn: z
    .string()
    .optional()
    .transform((v) => v || null),
  checkOut: z
    .string()
    .optional()
    .transform((v) => v || null),
  manualStatus: z
    .enum(["", "PRESENT", "ABSENT", "LATE", "AUTHORIZED"])
    .optional()
    .transform((v) => v || null),
  note: req("Une observation", 500),
});

export const announcementSchema = z.object({
  title: req("Le titre", 160),
  type: z.enum(["NOTE_SERVICE", "COMMUNIQUE", "URGENT", "GENERAL"]),
  content: req("Le contenu", 20000),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  expiresAt: optDay,
});

export const holidaySchema = z.object({
  date: day("Date"),
  name: req("Le libellé", 80),
});

export const settingsSchema = z.object({
  "company.name": req("Le nom de l'organisation"),
  "leave.annualDays": z.coerce.number().int().min(0).max(60).transform(String),
  "leave.workingDays": z
    .string()
    .regex(/^[0-6](,[0-6])*$/, "Jours ouvrables invalides."),
  "attendance.overtimeThreshold": z.coerce
    .number()
    .int()
    .min(0)
    .max(600)
    .transform(String),
  "attendance.missingCheckoutGrace": z.coerce
    .number()
    .int()
    .min(0)
    .max(1440)
    .transform(String),
});

export function formToObject(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

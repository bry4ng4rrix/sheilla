import {
  Building2,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Clock,
  FileBarChart,
  LayoutDashboard,
  Megaphone,
  Bell,
  ScrollText,
  Settings,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  Users,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  perm?: Permission;
  needsEmployee?: boolean;
};
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Général",
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      {
        href: "/announcements",
        label: "Annonces",
        icon: Megaphone,
        perm: "announcements.view",
      },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Mon espace",
    items: [
      {
        href: "/profile",
        label: "Mon profil",
        icon: UserRound,
        needsEmployee: true,
      },
      {
        href: "/attendance",
        label: "Mon pointage",
        icon: Clock,
        perm: "attendance.self",
        needsEmployee: true,
      },
      {
        href: "/leaves",
        label: "Mes congés",
        icon: CalendarDays,
        perm: "leaves.request",
        needsEmployee: true,
      },
    ],
  },
  {
    label: "Ressources humaines",
    items: [
      {
        href: "/employees",
        label: "Personnel",
        icon: Users,
        perm: "employees.view",
      },
      {
        href: "/hr/leave-requests",
        label: "Demandes de congé",
        icon: ClipboardCheck,
        perm: "leaves.manage",
      },
      {
        href: "/attendance/history",
        label: "Présences",
        icon: CalendarClock,
        perm: "attendance.manage",
      },
      {
        href: "/attendance/anomalies",
        label: "Anomalies",
        icon: TriangleAlert,
        perm: "attendance.manage",
      },
      {
        href: "/attendance/schedules",
        label: "Horaires & plannings",
        icon: Clock,
        perm: "attendance.manage",
      },
      {
        href: "/reports",
        label: "Rapports",
        icon: FileBarChart,
        perm: "reports.view",
      },
    ],
  },
  {
    label: "Organisation",
    items: [
      {
        href: "/organization/services",
        label: "Services",
        icon: Building2,
        perm: "org.manage",
      },
      {
        href: "/organization/positions",
        label: "Postes",
        icon: BriefcaseBusiness,
        perm: "org.manage",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        href: "/admin/users",
        label: "Utilisateurs",
        icon: ShieldCheck,
        perm: "users.manage",
      },
      {
        href: "/admin/registrations",
        label: "Inscriptions",
        icon: UserPlus,
        perm: "users.manage",
      },
      {
        href: "/admin/audit",
        label: "Journal d'audit",
        icon: ScrollText,
        perm: "audit.view",
      },
      {
        href: "/settings",
        label: "Paramètres",
        icon: Settings,
        perm: "holidays.manage",
      },
    ],
  },
];

/** Libellés du fil d'Ariane par segment d'URL. */
export const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  employees: "Personnel",
  create: "Création",
  edit: "Modification",
  organization: "Organisation",
  services: "Services",
  positions: "Postes",
  leaves: "Mes congés",
  hr: "RH",
  "leave-requests": "Demandes de congé",
  attendance: "Présences",
  "check-in": "Entrée",
  "check-out": "Sortie",
  history: "Historique",
  anomalies: "Anomalies",
  schedules: "Horaires",
  registrations: "Inscriptions",
  announcements: "Annonces",
  notifications: "Notifications",
  reports: "Rapports",
  admin: "Administration",
  users: "Utilisateurs",
  audit: "Journal d'audit",
  settings: "Paramètres",
  profile: "Mon profil",
  search: "Recherche",
};

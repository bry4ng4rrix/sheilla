import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  Clock,
  FileBarChart,
  Building2,
  UserX,
  Users,
  CalendarRange,
} from "lucide-react";
import { requirePage } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Rapports" };

const CARDS = [
  {
    href: "/reports/employees",
    title: "Employés",
    text: "Effectif par service, poste, contrat et statut.",
    icon: Users,
    color: "from-orange-400 to-orange-600",
  },
  {
    href: "/reports/attendance",
    title: "Présences",
    text: "Synthèse par agent : jours planifiés, présences, taux.",
    icon: CalendarClock,
    color: "from-teal-400 to-teal-600",
  },
  {
    href: "/reports/attendance?type=absences",
    title: "Absences",
    text: "Absences injustifiées sur les jours planifiés.",
    icon: UserX,
    color: "from-rose-400 to-rose-600",
  },
  {
    href: "/reports/attendance?type=lates",
    title: "Retards",
    text: "Détail des retards avec heure d'arrivée et durée.",
    icon: Clock,
    color: "from-amber-300 to-amber-500",
  },
  {
    href: "/reports/leaves",
    title: "Congés",
    text: "Demandes par période, type, statut et décideur.",
    icon: CalendarDays,
    color: "from-sky-400 to-indigo-500",
  },
  {
    href: "/reports/attendance?type=departments",
    title: "Par service",
    text: "Indicateurs consolidés par service.",
    icon: Building2,
    color: "from-slate-500 to-slate-700",
  },
  {
    href: "/reports/attendance?type=monthly",
    title: "Mensuel",
    text: "Bilan d'assiduité d'un mois calendaire.",
    icon: CalendarRange,
    color: "from-violet-400 to-violet-600",
  },
];

export default async function ReportsPage() {
  await requirePage("reports.view");
  return (
    <>
      <PageHeader
        icon={<FileBarChart />}
        title="Rapports"
        description="États administratifs exportables en PDF et Excel, à l'en-tête JIRAMA"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map((c, i) => (
          <Link
            key={c.href}
            href={c.href}
            className="card-hover group rounded-2xl border bg-card p-5 animate-rise"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span
              className={`grid size-12 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg ${c.color}`}
            >
              <c.icon className="size-6" />
            </span>
            <p className="mt-4 text-lg font-bold group-hover:text-orange-700">
              {c.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{c.text}</p>
            <p className="mt-4 text-xs font-semibold text-orange-600">
              PDF · Excel →
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}

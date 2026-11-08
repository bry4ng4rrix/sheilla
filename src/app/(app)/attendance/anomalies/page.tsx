import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { TriangleAlert, UserX, Clock, LogOut, Timer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { fmtDay } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { Pagination, pageFrom } from "@/components/shared/pagination";
import { SheetTable } from "@/components/attendance/sheet-table";
import { buildSheet, isAnomalyRow } from "@/server/services/attendance";
import { periodFrom } from "@/server/services/period";

export const metadata: Metadata = { title: "Anomalies de pointage" };

const KINDS: Record<
  string,
  {
    label: string;
    test: (r: Awaited<ReturnType<typeof buildSheet>>[number]) => boolean;
  }
> = {
  ABSENT: {
    label: "Absences injustifiées",
    test: (r) => r.status === "ABSENT",
  },
  LATE: { label: "Retards", test: (r) => r.status === "LATE" },
  MISSING: {
    label: "Pointages incomplets",
    test: (r) =>
      r.anomalies.includes("MISSING_CHECKIN") ||
      r.anomalies.includes("MISSING_CHECKOUT"),
  },
  MULTIPLE: {
    label: "Pointages multiples / incohérents",
    test: (r) =>
      r.anomalies.includes("MULTIPLE_PUNCHES") ||
      r.anomalies.includes("INCOHERENT"),
  },
  OVERTIME: {
    label: "Dépassements horaires",
    test: (r) => r.anomalies.includes("OVERTIME"),
  },
};

export default async function AnomaliesPage({
  searchParams,
}: PageProps<"/attendance/anomalies">) {
  await requirePage("attendance.manage");
  const sp = await searchParams;
  const str = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : "";
  const { from, to } = periodFrom(sp, 14);
  const where: Prisma.EmployeeWhereInput = {
    ...(str("department")
      ? { position: { departmentId: str("department") } }
      : {}),
  };
  const [sheet, departments] = await Promise.all([
    buildSheet(from, to, where),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);
  const all = sheet.filter(isAnomalyRow).reverse();
  const rows =
    str("kind") && KINDS[str("kind")]
      ? all.filter(KINDS[str("kind")].test)
      : all;
  const count = (k: string) => all.filter(KINDS[k].test).length;
  const { page, skip, take } = pageFrom(sp, 20);

  return (
    <>
      <PageHeader
        icon={<TriangleAlert />}
        title="Anomalies de pointage"
        description={`Détection automatique du ${fmtDay(from)} au ${fmtDay(to)} — les jours non planifiés ne sont jamais comptés comme absences`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Absences injustifiées"
          value={count("ABSENT")}
          icon={<UserX />}
          accent="rose"
          href="?kind=ABSENT"
        />
        <KpiCard
          label="Retards"
          value={count("LATE")}
          icon={<Clock />}
          accent="amber"
          href="?kind=LATE"
          delay={60}
        />
        <KpiCard
          label="Pointages incomplets"
          value={count("MISSING")}
          icon={<LogOut />}
          accent="violet"
          href="?kind=MISSING"
          delay={120}
        />
        <KpiCard
          label="Dépassements horaires"
          value={count("OVERTIME")}
          icon={<Timer />}
          accent="navy"
          href="?kind=OVERTIME"
          delay={180}
        />
      </div>
      <FilterBar
        selects={[
          {
            name: "kind",
            label: "Type",
            allLabel: "Toutes les anomalies",
            options: Object.entries(KINDS).map(([value, k]) => ({
              value,
              label: k.label,
            })),
          },
          {
            name: "department",
            label: "Service",
            options: departments.map((d) => ({ value: d.id, label: d.name })),
          },
        ]}
        dates={[
          { name: "from", label: "Du" },
          { name: "to", label: "au" },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState
          title="Aucune anomalie à traiter"
          description="Toutes les journées de la période sont conformes ou ont été traitées."
        />
      ) : (
        <SheetTable
          rows={rows.slice(skip, skip + take)}
          showEmployee
          canCorrect
        />
      )}
      <Pagination page={page} total={rows.length} size={20} searchParams={sp} />
    </>
  );
}

import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { dayKey, localDay } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { ReportView, stringParams } from "@/components/reports/report-view";
import {
  buildReport,
  parseFilters,
  REPORT_TYPES,
  type ReportType,
} from "@/server/services/reports";

export const metadata: Metadata = { title: "Rapports de présence" };
const TYPES = [
  "attendance",
  "absences",
  "lates",
  "departments",
  "monthly",
] as const;

export default async function AttendanceReportPage({
  searchParams,
}: PageProps<"/reports/attendance">) {
  await requirePage("reports.view");
  const sp = await searchParams;
  const type: ReportType = TYPES.includes(sp.type as never)
    ? (sp.type as ReportType)
    : "attendance";
  const filters = parseFilters(sp);
  const [report, departments, employees] = await Promise.all([
    buildReport(type, filters),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);
  const query = {
    ...stringParams(sp),
    ...(type === "monthly"
      ? { month: filters.month ?? dayKey(localDay()).slice(0, 7) }
      : { from: dayKey(filters.from), to: dayKey(filters.to) }),
  };
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(
      Date.UTC(localDay().getUTCFullYear(), localDay().getUTCMonth() - i, 1),
    );
    return {
      value: dayKey(d).slice(0, 7),
      label: new Intl.DateTimeFormat("fr-FR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(d),
    };
  });
  return (
    <>
      <PageHeader
        icon={<CalendarClock />}
        title={REPORT_TYPES[type]}
        description="Calculé à partir des pointages réels et du planning de chaque agent"
      />
      <FilterBar
        selects={[
          {
            name: "type",
            label: "Rapport",
            allLabel: REPORT_TYPES.attendance,
            options: TYPES.filter((t) => t !== "attendance").map((t) => ({
              value: t,
              label: REPORT_TYPES[t],
            })),
          },
          ...(type === "monthly"
            ? [
                {
                  name: "month",
                  label: "Mois",
                  allLabel: "Mois en cours",
                  options: months.slice(1),
                },
              ]
            : []),
          {
            name: "department",
            label: "Service",
            options: departments.map((d) => ({ value: d.id, label: d.name })),
          },
          ...(type !== "departments"
            ? [
                {
                  name: "employee",
                  label: "Agent",
                  options: employees.map((e) => ({
                    value: e.id,
                    label: `${e.lastName} ${e.firstName}`,
                  })),
                },
              ]
            : []),
        ]}
        dates={
          type === "monthly"
            ? []
            : [
                { name: "from", label: "Du" },
                { name: "to", label: "au" },
              ]
        }
      />
      <ReportView report={report} type={type} query={query} />
    </>
  );
}

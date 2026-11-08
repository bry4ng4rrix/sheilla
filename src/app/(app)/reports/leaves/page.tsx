import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { dayKey } from "@/lib/dates";
import { LEAVE_STATUS, LEAVE_TYPE_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { ReportView, stringParams } from "@/components/reports/report-view";
import { buildReport, parseFilters } from "@/server/services/reports";

export const metadata: Metadata = { title: "Rapport des congés" };

export default async function LeavesReportPage({
  searchParams,
}: PageProps<"/reports/leaves">) {
  await requirePage("reports.view");
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const [report, departments, employees] = await Promise.all([
    buildReport("leaves", filters),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);
  return (
    <>
      <PageHeader
        icon={<CalendarDays />}
        title="Rapport des congés"
        description="Demandes chevauchant la période sélectionnée"
      />
      <FilterBar
        selects={[
          {
            name: "status",
            label: "Statut",
            options: Object.entries(LEAVE_STATUS).map(([value, s]) => ({
              value,
              label: s.label,
            })),
          },
          {
            name: "type",
            label: "Type",
            options: Object.entries(LEAVE_TYPE_LABELS).map(
              ([value, label]) => ({ value, label }),
            ),
          },
          {
            name: "department",
            label: "Service",
            options: departments.map((d) => ({ value: d.id, label: d.name })),
          },
          {
            name: "employee",
            label: "Agent",
            options: employees.map((e) => ({
              value: e.id,
              label: `${e.lastName} ${e.firstName}`,
            })),
          },
        ]}
        dates={[
          { name: "from", label: "Du" },
          { name: "to", label: "au" },
        ]}
      />
      <ReportView
        report={report}
        type="leaves"
        query={{
          ...stringParams(sp),
          from: dayKey(filters.from),
          to: dayKey(filters.to),
        }}
      />
    </>
  );
}

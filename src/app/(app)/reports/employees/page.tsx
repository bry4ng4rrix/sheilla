import type { Metadata } from "next";
import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { EMPLOYEE_STATUS } from "@/lib/labels";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { ReportView, stringParams } from "@/components/reports/report-view";
import { buildReport, parseFilters } from "@/server/services/reports";

export const metadata: Metadata = { title: "Rapport des employés" };

export default async function EmployeesReportPage({
  searchParams,
}: PageProps<"/reports/employees">) {
  await requirePage("reports.view");
  const sp = await searchParams;
  const [report, departments] = await Promise.all([
    buildReport("employees", parseFilters(sp)),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <PageHeader
        icon={<Users />}
        title="Rapport des employés"
        description="Liste administrative du personnel"
      />
      <FilterBar
        selects={[
          {
            name: "department",
            label: "Service",
            options: departments.map((d) => ({ value: d.id, label: d.name })),
          },
          {
            name: "status",
            label: "Statut",
            allLabel: "Dossiers actifs",
            options: [
              ...Object.entries(EMPLOYEE_STATUS).map(([value, s]) => ({
                value,
                label: s.label,
              })),
              { value: "INACTIVE", label: "Désactivés" },
            ],
          },
        ]}
      />
      <ReportView report={report} type="employees" query={stringParams(sp)} />
    </>
  );
}

import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { CalendarClock, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, requirePage } from "@/lib/session";
import { dayKey, fmtDay, fmtMinutes } from "@/lib/dates";
import { ATTENDANCE_STATUS } from "@/lib/labels";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { Pagination, pageFrom } from "@/components/shared/pagination";
import { SheetTable } from "@/components/attendance/sheet-table";
import { buildSheet, summarize } from "@/server/services/attendance";
import { periodFrom } from "@/server/services/period";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Historique des présences" };

export default async function AttendanceHistoryPage({
  searchParams,
}: PageProps<"/attendance/history">) {
  const user = await requirePage();
  const manage = can(user, "attendance.manage");
  if (!manage && !(can(user, "attendance.self") && user.employeeId))
    return <EmptyState title="Accès refusé" />;
  const sp = await searchParams;
  const str = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : "";
  const { from, to } = periodFrom(sp, manage ? 7 : 30);

  // RG07 : un employé ne voit que sa propre feuille
  const where: Prisma.EmployeeWhereInput = manage
    ? {
        ...(str("department")
          ? { position: { departmentId: str("department") } }
          : {}),
        ...(str("employee") ? { id: str("employee") } : {}),
        ...(str("team") ? { teamId: str("team") } : {}),
      }
    : { id: user.employeeId! };
  const [sheet, departments, employees, teams] = await Promise.all([
    buildSheet(from, to, where),
    manage ? prisma.department.findMany({ orderBy: { name: "asc" } }) : [],
    manage
      ? prisma.employee.findMany({
          where: { deletedAt: null },
          orderBy: { lastName: "asc" },
          select: { id: true, firstName: true, lastName: true },
        })
      : [],
    manage
      ? prisma.team.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
        })
      : [],
  ]);
  let rows = sheet.filter((r) => r.status !== "OFF" || r.checkIn).reverse();
  if (str("status")) rows = rows.filter((r) => r.status === str("status"));
  const s = summarize(sheet);
  const { page, skip, take } = pageFrom(sp, 25);
  const exportQs = new URLSearchParams({
    from: dayKey(from),
    to: dayKey(to),
    ...(str("department") ? { department: str("department") } : {}),
    ...(str("employee") ? { employee: str("employee") } : {}),
  });

  return (
    <>
      <PageHeader
        icon={<CalendarClock />}
        title={manage ? "Feuilles de présence" : "Mon historique de présence"}
        description={`Du ${fmtDay(from)} au ${fmtDay(to)}`}
        actions={
          manage && (
            <a
              href={`/api/reports/attendance?format=xlsx&${exportQs}`}
              className={buttonVariants({ variant: "outline" })}
            >
              <Download /> Exporter (Excel)
            </a>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Taux de présence"
          value={`${s.rate}%`}
          icon={<CalendarClock />}
          accent="teal"
          hint={`${s.present}/${s.planned} jours planifiés`}
        />
        <KpiCard
          label="Retards"
          value={s.late}
          icon={<CalendarClock />}
          accent="amber"
          hint={`Cumul : ${fmtMinutes(s.lateMinutes)}`}
          delay={60}
        />
        <KpiCard
          label="Absences"
          value={s.absent}
          icon={<CalendarClock />}
          accent="rose"
          hint="Non justifiées, jours planifiés"
          delay={120}
        />
        <KpiCard
          label="Congés / autorisations"
          value={s.leave}
          icon={<CalendarClock />}
          accent="navy"
          delay={180}
        />
      </div>
      <FilterBar
        selects={[
          ...(manage
            ? [
                {
                  name: "department",
                  label: "Service",
                  options: departments.map((d) => ({
                    value: d.id,
                    label: d.name,
                  })),
                },
                {
                  name: "team",
                  label: "Équipe",
                  options: teams.map((t) => ({ value: t.id, label: t.name })),
                },
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
          {
            name: "status",
            label: "Statut",
            options: Object.entries(ATTENDANCE_STATUS)
              .filter(([k]) => k !== "OFF")
              .map(([value, x]) => ({ value, label: x.label })),
          },
        ]}
        dates={[
          { name: "from", label: "Du" },
          { name: "to", label: "au" },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState title="Aucune donnée sur cette période" />
      ) : (
        <SheetTable
          rows={rows.slice(skip, skip + take)}
          showEmployee={manage}
          canCorrect={manage}
        />
      )}
      <Pagination page={page} total={rows.length} size={25} searchParams={sp} />
    </>
  );
}

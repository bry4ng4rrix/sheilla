import "server-only";
import { prisma } from "@/lib/prisma";
import { addDays, localDay } from "@/lib/dates";
import { buildSheet, isAnomalyRow, summarize } from "./attendance";

const MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

/** Statistiques RH — toutes calculées depuis SQLite, aucune valeur codée en dur. */
export async function hrStats() {
  const today = localDay();
  const from30 = addDays(today, -29);
  const yearAgo = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1),
  );

  const [
    employees,
    pending,
    departments,
    positions,
    onLeave,
    requests,
    lateRecords,
    sheet,
  ] = await Promise.all([
    prisma.employee.findMany({
      select: {
        hireDate: true,
        departureDate: true,
        deletedAt: true,
        position: {
          select: { department: { select: { name: true, code: true } } },
        },
      },
    }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.department.count({ where: { isActive: true } }),
    prisma.position.count({ where: { isActive: true } }),
    prisma.leaveRequest.count({
      where: {
        status: "APPROVED",
        startDate: { lte: today },
        endDate: { gte: today },
      },
    }),
    prisma.leaveRequest.findMany({
      where: { createdAt: { gte: yearAgo } },
      select: { createdAt: true, status: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { date: { gte: yearAgo }, status: "LATE" },
      select: { date: true, lateMinutes: true },
    }),
    buildSheet(from30, today, { deletedAt: null }),
  ]);

  const active = employees.filter((e) => !e.deletedAt);
  const months = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(
      Date.UTC(yearAgo.getUTCFullYear(), yearAgo.getUTCMonth() + i, 1),
    );
    const end = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
    );
    const inMonth = (d: Date) => d >= start && d <= addDays(end, 1);
    return {
      month: `${MONTHS[start.getUTCMonth()]} ${String(start.getUTCFullYear()).slice(2)}`,
      effectif: employees.filter(
        (e) =>
          e.hireDate <= end && (!e.departureDate || e.departureDate >= start),
      ).length,
      demandes: requests.filter((r) => inMonth(r.createdAt)).length,
      validees: requests.filter(
        (r) => inMonth(r.createdAt) && r.status === "APPROVED",
      ).length,
      retards: lateRecords.filter((r) => inMonth(r.date)).length,
    };
  });

  const byDept = new Map<string, number>();
  for (const e of active)
    byDept.set(
      e.position.department.name,
      (byDept.get(e.position.department.name) ?? 0) + 1,
    );

  const summary = summarize(sheet);
  const todayRows = sheet.filter((r) => r.day.getTime() === today.getTime());
  return {
    activeEmployees: active.length,
    pending,
    departments,
    positions,
    onLeave,
    summary,
    anomalies: sheet.filter(isAnomalyRow).length,
    today: summarize(todayRows),
    todayExpected: todayRows.filter((r) => r.plan.shift).length,
    months,
    byDepartment: [...byDept.entries()]
      .map(([name, value]) => ({ name: name.replace(/^Service /, ""), value }))
      .sort((a, b) => b.value - a.value),
  };
}

export async function adminStats() {
  const [users, activeUsers, byRole, activity] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.role.findMany({
      include: { _count: { select: { users: { where: { isActive: true } } } } },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true } } },
    }),
  ]);
  return {
    users,
    activeUsers,
    byRole: byRole.map((r) => ({ name: r.name, value: r._count.users })),
    activity,
  };
}

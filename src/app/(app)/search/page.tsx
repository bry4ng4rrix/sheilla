import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Megaphone, Search, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, requirePage } from "@/lib/session";
import { fmtDay } from "@/lib/dates";
import { LEAVE_STATUS, LEAVE_TYPE_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { EmptyState } from "@/components/shared/empty-state";
import { EnumBadge } from "@/components/shared/status-badge";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";

export const metadata: Metadata = { title: "Recherche" };

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const user = await requirePage();
  const { q: raw } = await searchParams;
  const q = typeof raw === "string" ? raw.trim().slice(0, 80) : "";
  if (!q)
    return (
      <EmptyState title="Saisissez un terme de recherche" icon={<Search />} />
    );
  // RG07 : la recherche de personnel n'est ouverte qu'aux profils habilités
  const [employees, announcements, leaves] = await Promise.all([
    can(user, "employees.view")
      ? prisma.employee.findMany({
          where: {
            OR: [
              { matricule: { contains: q } },
              { lastName: { contains: q } },
              { firstName: { contains: q } },
              { position: { title: { contains: q } } },
              { position: { department: { name: { contains: q } } } },
            ],
          },
          include: { position: { include: { department: true } } },
          take: 12,
        })
      : [],
    prisma.announcement.findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ title: { contains: q } }, { content: { contains: q } }],
      },
      take: 6,
      orderBy: { publishedAt: "desc" },
    }),
    can(user, "leaves.manage")
      ? prisma.leaveRequest.findMany({
          where: {
            OR: [
              { reason: { contains: q } },
              { employee: { lastName: { contains: q } } },
              { employee: { firstName: { contains: q } } },
            ],
          },
          include: { employee: true },
          take: 8,
          orderBy: { createdAt: "desc" },
        })
      : user.employeeId
        ? prisma.leaveRequest.findMany({
            where: { employeeId: user.employeeId, reason: { contains: q } },
            include: { employee: true },
            take: 8,
          })
        : [],
  ]);
  const total = employees.length + announcements.length + leaves.length;
  return (
    <>
      <PageHeader
        icon={<Search />}
        title={`Résultats pour « ${q} »`}
        description={`${total} résultat(s)`}
      />
      {total === 0 && (
        <EmptyState
          title="Aucun résultat"
          description="Essayez un autre mot-clé : nom, matricule, service, poste…"
        />
      )}
      {employees.length > 0 && (
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Users className="size-4 text-orange-500" /> Personnel
            </span>
          }
          bodyClassName="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {employees.map((e) => (
            <Link
              key={e.id}
              href={`/employees/${e.id}`}
              className="flex items-center gap-3 rounded-xl p-3 hover:bg-orange-50"
            >
              <EmployeeAvatar
                firstName={e.firstName}
                lastName={e.lastName}
                photoKey={e.photoKey}
              />
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {e.firstName} {e.lastName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {e.matricule} · {e.position.title} ·{" "}
                  {e.position.department.name}
                </p>
              </div>
            </Link>
          ))}
        </Panel>
      )}
      {leaves.length > 0 && (
        <Panel
          title={
            <span className="flex items-center gap-2">
              <CalendarDays className="size-4 text-orange-500" /> Demandes de
              congé
            </span>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y">
            {leaves.map((l) => (
              <li key={l.id}>
                <Link
                  href={
                    can(user, "leaves.manage")
                      ? `/hr/leave-requests/${l.id}`
                      : `/leaves/${l.id}`
                  }
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-orange-50/50"
                >
                  <span>
                    <span className="font-semibold">
                      {l.employee.firstName} {l.employee.lastName}
                    </span>{" "}
                    <span className="text-sm text-muted-foreground">
                      — {LEAVE_TYPE_LABELS[l.type]}, {fmtDay(l.startDate)} →{" "}
                      {fmtDay(l.endDate)}
                    </span>
                  </span>
                  <EnumBadge map={LEAVE_STATUS} value={l.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {announcements.length > 0 && (
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Megaphone className="size-4 text-orange-500" /> Annonces
            </span>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y">
            {announcements.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/announcements/${a.id}`}
                  className="block px-5 py-3 font-semibold hover:bg-orange-50/50"
                >
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  CalendarDays,
  Palmtree,
  Plus,
  Hourglass,
  CheckCircle2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { fmtDay } from "@/lib/dates";
import { LEAVE_STATUS, LEAVE_TYPE_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { EnumBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { Pagination, pageFrom } from "@/components/shared/pagination";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { leaveBalance } from "@/server/services/leaves";

export const metadata: Metadata = { title: "Mes congés" };

export default async function MyLeavesPage({
  searchParams,
}: PageProps<"/leaves">) {
  const user = await requirePage("leaves.request");
  if (!user.employeeId)
    return (
      <EmptyState
        title="Compte non rattaché"
        description="Ce compte technique n'est associé à aucun dossier employé."
      />
    );
  const sp = await searchParams;
  const str = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : "";
  const where: Prisma.LeaveRequestWhereInput = {
    employeeId: user.employeeId,
    ...(str("status") ? { status: str("status") as never } : {}),
    ...(str("type") ? { type: str("type") as never } : {}),
  };
  const { page, skip, take } = pageFrom(sp, 10);
  const [total, requests, balance] = await Promise.all([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    leaveBalance(user.employeeId),
  ]);
  return (
    <>
      <PageHeader
        icon={<CalendarDays />}
        title="Mes congés"
        description="Suivi de vos demandes de congé et d'absence"
        actions={
          <Link
            href="/leaves/create"
            className={buttonVariants({ size: "lg" })}
          >
            <Plus /> Nouvelle demande
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Solde disponible"
          value={`${balance.remaining} j`}
          icon={<Palmtree />}
          accent="teal"
          hint={`Droit annuel : ${balance.entitlement} jours`}
        />
        <KpiCard
          label="Jours pris cette année"
          value={balance.used}
          icon={<CheckCircle2 />}
          delay={60}
        />
        <KpiCard
          label="Jours en attente"
          value={balance.pending}
          icon={<Hourglass />}
          accent="amber"
          delay={120}
          hint="Non décomptés tant que non validés"
        />
      </div>
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
        ]}
      />
      {requests.length === 0 ? (
        <EmptyState
          title="Aucune demande"
          description="Vous n'avez encore soumis aucune demande correspondant à ces critères."
          action={
            <Link href="/leaves/create" className={buttonVariants()}>
              Faire une demande
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50/80">
                <TableHead className="pl-5">Type</TableHead>
                <TableHead>Période</TableHead>
                <TableHead className="text-center">Durée</TableHead>
                <TableHead className="hidden md:table-cell">
                  Soumise le
                </TableHead>
                <TableHead className="pr-5">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id} className="cursor-pointer">
                  <TableCell className="pl-5 font-semibold">
                    <Link
                      href={`/leaves/${r.id}`}
                      className="hover:text-orange-700"
                    >
                      {LEAVE_TYPE_LABELS[r.type]}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {fmtDay(r.startDate)} → {fmtDay(r.endDate)}
                  </TableCell>
                  <TableCell className="text-center font-bold">
                    {r.days} j
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {fmtDay(r.createdAt)}
                  </TableCell>
                  <TableCell className="pr-5">
                    <EnumBadge map={LEAVE_STATUS} value={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination page={page} total={total} size={10} searchParams={sp} />
    </>
  );
}

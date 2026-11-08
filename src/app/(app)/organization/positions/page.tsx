import type { Metadata } from "next";
import { BriefcaseBusiness, Power } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActionButton } from "@/components/shared/action-button";
import { Pagination, pageFrom } from "@/components/shared/pagination";
import { PositionDialog } from "@/components/organization/dialogs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { togglePositionAction } from "@/server/actions/organization";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Postes" };

export default async function PositionsPage({
  searchParams,
}: PageProps<"/organization/positions">) {
  await requirePage("org.manage");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const dep = typeof sp.department === "string" ? sp.department : "";
  const where: Prisma.PositionWhereInput = {
    ...(q ? { title: { contains: q } } : {}),
    ...(dep ? { departmentId: dep } : {}),
  };
  const { page, skip, take } = pageFrom(sp, 15);
  const [total, positions, departments] = await Promise.all([
    prisma.position.count({ where }),
    prisma.position.findMany({
      where,
      skip,
      take,
      orderBy: [{ department: { name: "asc" } }, { title: "asc" }],
      include: {
        department: true,
        _count: { select: { employees: { where: { deletedAt: null } } } },
      },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return (
    <>
      <PageHeader
        icon={<BriefcaseBusiness />}
        title="Postes"
        description="Métiers et fonctions rattachés aux services"
        actions={<PositionDialog departments={departments} />}
      />
      <FilterBar
        searchPlaceholder="Rechercher un poste…"
        selects={[
          {
            name: "department",
            label: "Service",
            options: departments.map((d) => ({ value: d.id, label: d.name })),
          },
        ]}
      />
      {positions.length === 0 ? (
        <EmptyState title="Aucun poste" icon={<BriefcaseBusiness />} />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50/80">
                <TableHead className="pl-5">Intitulé</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-center">Agents</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-5 font-semibold">
                    {p.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.department.name}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-orange-700">
                      {p._count.employees}
                    </span>
                  </TableCell>
                  <TableCell>
                    {p.isActive ? (
                      <StatusBadge tone="success">Actif</StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">Désactivé</StatusBadge>
                    )}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <div className="flex justify-end">
                      <PositionDialog pos={p} departments={departments} />
                      <ActionButton
                        variant="ghost"
                        size="icon-sm"
                        action={togglePositionAction.bind(null, p.id)}
                        confirm={{
                          title: p.isActive
                            ? "Désactiver ce poste ?"
                            : "Réactiver ce poste ?",
                          description:
                            "Un poste occupé par des agents actifs ne peut pas être désactivé.",
                          destructive: p.isActive,
                        }}
                      >
                        <Power />
                      </ActionButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination page={page} total={total} size={15} searchParams={sp} />
    </>
  );
}

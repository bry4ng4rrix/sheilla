import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { LayoutGrid, List, Pencil, Plus, Users, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, requirePage } from "@/lib/session";
import { fmtDay } from "@/lib/dates";
import { EMPLOYEE_STATUS } from "@/lib/labels";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { Pagination, pageFrom } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { EnumBadge } from "@/components/shared/status-badge";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";
import { ActionButton } from "@/components/shared/action-button";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setEmployeeActiveAction } from "@/server/actions/employees";
import { cn } from "cn";

export const metadata: Metadata = { title: "Personnel" };

const SORTS: Record<string, Prisma.EmployeeOrderByWithRelationInput[]> = {
  name: [{ lastName: "asc" }, { firstName: "asc" }],
  matricule: [{ matricule: "asc" }],
  recent: [{ hireDate: "desc" }],
  oldest: [{ hireDate: "asc" }],
};

export default async function EmployeesPage({
  searchParams,
}: PageProps<"/employees">) {
  const user = await requirePage("employees.view");
  const sp = await searchParams;
  const str = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : "";
  const q = str("q").trim();
  const view = str("view") === "table" ? "table" : "grid";
  const state = str("state") || "active";

  const where: Prisma.EmployeeWhereInput = {
    ...(state === "active"
      ? { deletedAt: null }
      : state === "inactive"
        ? { deletedAt: { not: null } }
        : {}),
    ...(str("department")
      ? { position: { departmentId: str("department") } }
      : {}),
    ...(str("position") ? { positionId: str("position") } : {}),
    ...(str("status") ? { status: str("status") as never } : {}),
    ...(q
      ? {
          OR: [
            { matricule: { contains: q } },
            { lastName: { contains: q } },
            { firstName: { contains: q } },
            { position: { title: { contains: q } } },
            { position: { department: { name: { contains: q } } } },
          ],
        }
      : {}),
  };
  const { page, skip, take } = pageFrom(sp);
  const [total, employees, departments, positions] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      include: { position: { include: { department: true } } },
      orderBy: SORTS[str("sort")] ?? SORTS.name,
      skip,
      take,
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.position.findMany({
      where: str("department") ? { departmentId: str("department") } : {},
      orderBy: { title: "asc" },
    }),
  ]);
  const manage = can(user, "employees.manage");
  const viewHref = (v: string) =>
    `?${new URLSearchParams({ ...(Object.fromEntries(Object.entries(sp).filter(([, x]) => typeof x === "string")) as Record<string, string>), view: v })}`;

  return (
    <>
      <PageHeader
        icon={<Users />}
        title="Personnel"
        description="Dossiers administratifs des agents de la JIRAMA Antsirabe"
        actions={
          <>
            <div className="flex rounded-lg border bg-card p-0.5">
              <Link
                href={viewHref("grid")}
                aria-label="Vue grille"
                className={cn(
                  "rounded-md p-1.5",
                  view === "grid"
                    ? "bg-orange-100 text-orange-700"
                    : "text-muted-foreground",
                )}
              >
                <LayoutGrid className="size-4" />
              </Link>
              <Link
                href={viewHref("table")}
                aria-label="Vue tableau"
                className={cn(
                  "rounded-md p-1.5",
                  view === "table"
                    ? "bg-orange-100 text-orange-700"
                    : "text-muted-foreground",
                )}
              >
                <List className="size-4" />
              </Link>
            </div>
            {manage && (
              <Link
                href="/employees/create"
                className={buttonVariants({ size: "lg" })}
              >
                <Plus /> Nouvel employé
              </Link>
            )}
          </>
        }
      />
      <FilterBar
        searchPlaceholder="Matricule, nom, prénom, service ou poste…"
        selects={[
          {
            name: "department",
            label: "Service",
            options: departments.map((d) => ({ value: d.id, label: d.name })),
          },
          {
            name: "position",
            label: "Poste",
            options: positions.map((p) => ({ value: p.id, label: p.title })),
          },
          {
            name: "status",
            label: "Statut",
            options: Object.entries(EMPLOYEE_STATUS).map(([value, s]) => ({
              value,
              label: s.label,
            })),
          },
          {
            name: "state",
            label: "Dossiers",
            allLabel: "Dossiers actifs",
            options: [
              { value: "inactive", label: "Désactivés" },
              { value: "all", label: "Actifs + désactivés" },
            ],
          },
          {
            name: "sort",
            label: "Tri",
            allLabel: "Tri : nom",
            options: [
              { value: "matricule", label: "Matricule" },
              { value: "recent", label: "Recrutement récent" },
              { value: "oldest", label: "Ancienneté" },
            ],
          },
        ]}
      />
      {employees.length === 0 ? (
        <EmptyState
          title="Aucun employé trouvé"
          description="Modifiez vos critères de recherche ou ajoutez un nouvel agent."
          icon={<Users />}
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {employees.map((e, i) => (
            <div
              key={e.id}
              className="card-hover group relative overflow-hidden rounded-2xl border bg-card animate-rise"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="h-16 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400" />
              <div className="-mt-10 flex flex-col items-center px-5 pb-5 text-center">
                <EmployeeAvatar
                  firstName={e.firstName}
                  lastName={e.lastName}
                  photoKey={e.photoKey}
                  size="xl"
                  className="ring-4"
                />
                <p className="mt-3 text-base font-bold">
                  {e.firstName} {e.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {e.position.title}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-orange-600">
                  {e.position.department.name}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-xs">
                    {e.matricule}
                  </span>
                  {e.deletedAt ? (
                    <EnumBadge
                      map={{ X: { label: "Désactivé", tone: "neutral" } }}
                      value="X"
                    />
                  ) : (
                    <EnumBadge map={EMPLOYEE_STATUS} value={e.status} />
                  )}
                </div>
                <div className="mt-4 grid w-full grid-cols-2 gap-2">
                  <Link
                    href={`/employees/${e.id}`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    <Eye /> Consulter
                  </Link>
                  {manage ? (
                    <Link
                      href={`/employees/${e.id}/edit`}
                      className={buttonVariants({ size: "sm" })}
                    >
                      <Pencil /> Modifier
                    </Link>
                  ) : (
                    <span />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50/80">
                <TableHead className="pl-5">Employé</TableHead>
                <TableHead>Matricule</TableHead>
                <TableHead className="hidden md:table-cell">Service</TableHead>
                <TableHead className="hidden lg:table-cell">Poste</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Recrutement
                </TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="pl-5">
                    <Link
                      href={`/employees/${e.id}`}
                      className="flex items-center gap-3 font-semibold hover:text-orange-700"
                    >
                      <EmployeeAvatar
                        firstName={e.firstName}
                        lastName={e.lastName}
                        photoKey={e.photoKey}
                        size="sm"
                      />
                      {e.lastName} {e.firstName}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {e.matricule}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {e.position.department.name}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {e.position.title}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {fmtDay(e.hireDate)}
                  </TableCell>
                  <TableCell>
                    {e.deletedAt ? (
                      <EnumBadge
                        map={{ X: { label: "Désactivé", tone: "neutral" } }}
                        value="X"
                      />
                    ) : (
                      <EnumBadge map={EMPLOYEE_STATUS} value={e.status} />
                    )}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <div className="flex justify-end gap-1">
                      {manage && (
                        <Link
                          href={`/employees/${e.id}/edit`}
                          className={buttonVariants({
                            variant: "ghost",
                            size: "sm",
                          })}
                        >
                          <Pencil />
                        </Link>
                      )}
                      {manage && !e.deletedAt && (
                        <ActionButton
                          variant="ghost"
                          size="sm"
                          action={setEmployeeActiveAction.bind(
                            null,
                            e.id,
                            false,
                          )}
                          confirm={{
                            title: `Désactiver ${e.firstName} ${e.lastName} ?`,
                            description:
                              "Le compte associé sera bloqué. Pointages, congés et historique sont conservés (RG08).",
                            label: "Désactiver",
                            destructive: true,
                          }}
                        >
                          Désactiver
                        </ActionButton>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination page={page} total={total} searchParams={sp} />
    </>
  );
}

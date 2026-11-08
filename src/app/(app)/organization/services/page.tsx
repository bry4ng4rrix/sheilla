import type { Metadata } from "next";
import Image from "next/image";
import { Building2, Power } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActionButton } from "@/components/shared/action-button";
import { Panel } from "@/components/shared/panel";
import { DepartmentDialog } from "@/components/organization/dialogs";
import { toggleDepartmentAction } from "@/server/actions/organization";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage({
  searchParams,
}: PageProps<"/organization/services">) {
  await requirePage("org.manage");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const departments = await prisma.department.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { code: { contains: q } }] }
      : {},
    orderBy: { name: "asc" },
    include: {
      positions: {
        where: { isActive: true },
        orderBy: { title: "asc" },
        include: {
          _count: { select: { employees: { where: { deletedAt: null } } } },
        },
      },
      teams: { where: { isActive: true } },
    },
  });
  const active = departments.filter((d) => d.isActive);
  const total = active.reduce(
    (s, d) => s + d.positions.reduce((x, p) => x + p._count.employees, 0),
    0,
  );

  return (
    <>
      <PageHeader
        icon={<Building2 />}
        title="Services"
        description="Structure organisationnelle de la JIRAMA Antsirabe"
        actions={<DepartmentDialog />}
      />

      <Panel
        title="Organigramme"
        description={`${active.length} services · ${total} agents actifs`}
        bodyClassName="overflow-x-auto p-6"
      >
        <div className="flex min-w-max flex-col items-center">
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 px-5 py-3 text-white shadow-lg shadow-orange-500/30">
            <Image
              src="/logo.png"
              alt=""
              width={36}
              height={36}
              className="rounded-full ring-2 ring-white/40"
            />
            <div>
              <p className="font-extrabold">JIRAMA Antsirabe</p>
              <p className="text-xs text-orange-100">Direction régionale</p>
            </div>
          </div>
          <div className="h-6 w-px bg-orange-300" />
          <div className="flex">
            {active.map((d) => (
              <div
                key={d.id}
                className="relative flex w-56 flex-col items-center px-2 before:absolute before:top-0 before:right-0 before:left-0 before:h-px before:bg-orange-300 first:before:left-1/2 last:before:right-1/2 only:before:hidden"
              >
                <div className="h-6 w-px bg-orange-300" />
                <div className="w-full rounded-xl border-2 border-orange-200 bg-orange-50/60 p-3 text-center">
                  <p className="text-[10px] font-bold tracking-widest text-orange-600">
                    {d.code}
                  </p>
                  <p className="text-sm leading-tight font-bold">
                    {d.name.replace(/^Service /, "")}
                  </p>
                </div>
                <ul className="mt-2 w-full space-y-1.5">
                  {d.positions.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border bg-white px-2.5 py-1.5 text-xs"
                    >
                      <span className="truncate">{p.title}</span>
                      <span className="ml-2 rounded-full bg-stone-100 px-1.5 font-bold text-stone-600">
                        {p._count.employees}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <FilterBar searchPlaceholder="Rechercher un service…" />
      {departments.length === 0 ? (
        <EmptyState title="Aucun service" icon={<Building2 />} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((d) => {
            const agents = d.positions.reduce(
              (s, p) => s + p._count.employees,
              0,
            );
            return (
              <div
                key={d.id}
                className="card-hover rounded-2xl border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-orange-100 font-mono text-xs font-bold text-orange-700">
                      {d.code}
                    </span>
                    <div>
                      <p className="font-bold">{d.name}</p>
                      {d.isActive ? (
                        <StatusBadge tone="success">Actif</StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral">Désactivé</StatusBadge>
                      )}
                    </div>
                  </div>
                  <div className="flex">
                    <DepartmentDialog dep={d} />
                    <ActionButton
                      variant="ghost"
                      size="icon-sm"
                      action={toggleDepartmentAction.bind(null, d.id)}
                      confirm={{
                        title: d.isActive
                          ? "Désactiver ce service ?"
                          : "Réactiver ce service ?",
                        description:
                          "Un service ne peut être désactivé que s'il n'a plus de poste actif.",
                        destructive: d.isActive,
                      }}
                    >
                      <Power />
                    </ActionButton>
                  </div>
                </div>
                {d.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {d.description}
                  </p>
                )}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-stone-50 py-2">
                    <p className="text-lg font-extrabold">
                      {d.positions.length}
                    </p>
                    postes
                  </div>
                  <div className="rounded-lg bg-stone-50 py-2">
                    <p className="text-lg font-extrabold">{agents}</p>agents
                  </div>
                  <div className="rounded-lg bg-stone-50 py-2">
                    <p className="text-lg font-extrabold">{d.teams.length}</p>
                    équipes
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

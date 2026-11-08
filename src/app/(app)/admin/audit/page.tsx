import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { ScrollText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { fmtDateTime, parseDay, addDays } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination, pageFrom } from "@/components/shared/pagination";

export const metadata: Metadata = { title: "Journal d'audit" };

function Json({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <pre className="mt-1 max-h-32 overflow-auto rounded-md bg-stone-50 p-2 text-[11px] leading-snug whitespace-pre-wrap text-stone-600">
      {JSON.stringify(JSON.parse(value), null, 1)}
    </pre>
  );
}

export default async function AuditPage({
  searchParams,
}: PageProps<"/admin/audit">) {
  await requirePage("audit.view");
  const sp = await searchParams;
  const str = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : "";
  const safe = (v: string) => {
    try {
      return v ? parseDay(v) : null;
    } catch {
      return null;
    }
  };
  const from = safe(str("from"));
  const to = safe(str("to"));
  const where: Prisma.AuditLogWhereInput = {
    ...(str("entity") ? { entity: str("entity") } : {}),
    ...(str("q")
      ? {
          OR: [
            { action: { contains: str("q") } },
            { user: { name: { contains: str("q") } } },
          ],
        }
      : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lt: addDays(to, 1) } : {}),
          },
        }
      : {}),
  };
  const { page, skip, take } = pageFrom(sp, 25);
  const [total, logs, entities] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.auditLog.groupBy({
      by: ["entity"],
      _count: true,
      orderBy: { entity: "asc" },
    }),
  ]);
  return (
    <>
      <PageHeader
        icon={<ScrollText />}
        title="Journal d'audit"
        description="Traçabilité des opérations sensibles (RG06)"
      />
      <FilterBar
        searchPlaceholder="Action ou utilisateur…"
        selects={[
          {
            name: "entity",
            label: "Objet",
            options: entities.map((e) => ({
              value: e.entity,
              label: `${e.entity} (${e._count})`,
            })),
          },
        ]}
        dates={[
          { name: "from", label: "Du" },
          { name: "to", label: "au" },
        ]}
      />
      {logs.length === 0 ? (
        <EmptyState title="Aucun événement" />
      ) : (
        <ol className="divide-y overflow-hidden rounded-2xl border bg-card">
          {logs.map((l) => (
            <li
              key={l.id}
              className="grid gap-2 px-5 py-3 text-sm md:grid-cols-[180px_1fr]"
            >
              <div className="text-xs text-muted-foreground">
                {fmtDateTime(l.createdAt)}
                {l.ip && <p className="font-mono">{l.ip}</p>}
              </div>
              <div className="min-w-0">
                <p>
                  <span className="rounded bg-orange-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-orange-700">
                    {l.action}
                  </span>{" "}
                  <span className="font-semibold">
                    {l.user?.name ?? "Système"}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    · {l.entity}
                    {l.entityId ? ` #${l.entityId.slice(-6)}` : ""}
                  </span>
                </p>
                {(l.before || l.after) && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                      Détails des valeurs
                    </summary>
                    <div className="grid gap-2 md:grid-cols-2">
                      {l.before && (
                        <div>
                          <p className="text-[11px] font-semibold text-red-600">
                            Avant
                          </p>
                          <Json value={l.before} />
                        </div>
                      )}
                      {l.after && (
                        <div>
                          <p className="text-[11px] font-semibold text-emerald-600">
                            Après
                          </p>
                          <Json value={l.after} />
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      <Pagination page={page} total={total} size={25} searchParams={sp} />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Megaphone, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, requirePage } from "@/lib/session";
import { fmtDateTime, localDay } from "@/lib/dates";
import { ANNOUNCEMENT_TYPE, PUBLICATION_STATUS } from "@/lib/labels";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { EnumBadge } from "@/components/shared/status-badge";
import { Pagination, pageFrom } from "@/components/shared/pagination";
import { AnnouncementCover } from "@/components/announcements/cover";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Annonces" };

export default async function AnnouncementsPage({
  searchParams,
}: PageProps<"/announcements">) {
  const user = await requirePage("announcements.view");
  const manage = can(user, "announcements.manage");
  const sp = await searchParams;
  const str = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : "";
  const q = str("q").trim();
  // Fil d'actualité : les employés ne voient que les annonces publiées et non expirées
  const visibility: Prisma.AnnouncementWhereInput = manage
    ? str("status")
      ? { status: str("status") as never }
      : {}
    : {
        status: "PUBLISHED",
        OR: [{ expiresAt: null }, { expiresAt: { gte: localDay() } }],
      };
  const where: Prisma.AnnouncementWhereInput = {
    AND: [
      visibility,
      str("type") ? { type: str("type") as never } : {},
      q
        ? { OR: [{ title: { contains: q } }, { content: { contains: q } }] }
        : {},
    ],
  };
  const { page, skip, take } = pageFrom(sp, 9);
  const [total, items, readIds] = await Promise.all([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      skip,
      take,
      orderBy: [
        { publishedAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      include: {
        author: { select: { name: true } },
        attachments: { take: 1 },
        _count: { select: { reads: true } },
      },
    }),
    prisma.announcementRead.findMany({
      where: { userId: user.id },
      select: { announcementId: true },
    }),
  ]);
  const read = new Set(readIds.map((r) => r.announcementId));
  const [first, ...rest] = items;

  return (
    <>
      <PageHeader
        icon={<Megaphone />}
        title="Annonces"
        description="Notes de service, communiqués et informations de la JIRAMA Antsirabe"
        actions={
          manage && (
            <Link
              href="/announcements/create"
              className={buttonVariants({ size: "lg" })}
            >
              <Plus /> Publier une annonce
            </Link>
          )
        }
      />
      <FilterBar
        searchPlaceholder="Rechercher une annonce…"
        selects={[
          {
            name: "type",
            label: "Type",
            options: Object.entries(ANNOUNCEMENT_TYPE).map(([value, t]) => ({
              value,
              label: t.label,
            })),
          },
          ...(manage
            ? [
                {
                  name: "status",
                  label: "Statut",
                  options: Object.entries(PUBLICATION_STATUS).map(
                    ([value, t]) => ({ value, label: t.label }),
                  ),
                },
              ]
            : []),
        ]}
      />
      {items.length === 0 ? (
        <EmptyState
          title="Aucune annonce"
          description="Les informations de l'entreprise apparaîtront ici."
          icon={<Megaphone />}
        />
      ) : (
        <>
          {page === 1 && first && (
            <Link
              href={`/announcements/${first.id}`}
              className="card-hover group grid overflow-hidden rounded-2xl border bg-card md:grid-cols-2 animate-rise"
            >
              <AnnouncementCover
                type={first.type}
                imageKey={first.attachments[0]?.fileKey}
                className="h-56 md:h-full md:min-h-64"
              />
              <div className="flex flex-col p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <EnumBadge map={ANNOUNCEMENT_TYPE} value={first.type} />
                  {manage && first.status !== "PUBLISHED" && (
                    <EnumBadge map={PUBLICATION_STATUS} value={first.status} />
                  )}
                  {!read.has(first.id) && first.status === "PUBLISHED" && (
                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      NOUVEAU
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-2xl font-extrabold group-hover:text-orange-700">
                  {first.title}
                </h2>
                <p className="mt-2 line-clamp-4 text-muted-foreground">
                  {first.content}
                </p>
                <p className="mt-auto pt-4 text-xs text-muted-foreground">
                  {first.author.name} ·{" "}
                  {fmtDateTime(first.publishedAt ?? first.createdAt)}
                  {manage && ` · lue par ${first._count.reads} agent(s)`}
                </p>
              </div>
            </Link>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(page === 1 ? rest : items).map((a, i) => (
              <Link
                key={a.id}
                href={`/announcements/${a.id}`}
                className="card-hover group flex flex-col overflow-hidden rounded-2xl border bg-card animate-rise"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <AnnouncementCover
                  type={a.type}
                  imageKey={a.attachments[0]?.fileKey}
                  className="h-36"
                />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <EnumBadge map={ANNOUNCEMENT_TYPE} value={a.type} />
                    {manage && a.status !== "PUBLISHED" && (
                      <EnumBadge map={PUBLICATION_STATUS} value={a.status} />
                    )}
                    {!read.has(a.id) && a.status === "PUBLISHED" && (
                      <span
                        className="size-2 rounded-full bg-orange-500"
                        aria-label="Non lue"
                      />
                    )}
                  </div>
                  <h3 className="mt-2 line-clamp-2 font-bold group-hover:text-orange-700">
                    {a.title}
                  </h3>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                    {a.content}
                  </p>
                  <p className="mt-auto pt-3 text-xs text-muted-foreground">
                    {a.author.name} ·{" "}
                    {fmtDateTime(a.publishedAt ?? a.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
      <Pagination page={page} total={total} size={9} searchParams={sp} />
    </>
  );
}

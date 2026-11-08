import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, requirePage } from "@/lib/session";
import { dayKey, fmtDateTime, fmtDay, localDay } from "@/lib/dates";
import { ANNOUNCEMENT_TYPE, PUBLICATION_STATUS } from "@/lib/labels";
import { EnumBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { AnnouncementCover } from "@/components/announcements/cover";
import { AnnouncementForm } from "@/components/announcements/announcement-form";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Annonce" };

export default async function AnnouncementPage({
  params,
  searchParams,
}: PageProps<"/announcements/[id]">) {
  const user = await requirePage("announcements.view");
  const { id } = await params;
  const { edit } = await searchParams;
  const manage = can(user, "announcements.manage");
  const a = await prisma.announcement.findUnique({
    where: { id },
    include: {
      author: { select: { name: true } },
      attachments: { take: 1 },
      _count: { select: { reads: true } },
    },
  });
  const visible =
    a &&
    (manage ||
      (a.status === "PUBLISHED" &&
        (!a.expiresAt || a.expiresAt >= localDay())));
  if (!visible) notFound();

  if (manage && edit) {
    return (
      <>
        <PageHeader
          icon={<Pencil />}
          title="Modifier l'annonce"
          description={a.title}
        />
        <AnnouncementForm
          id={a.id}
          imageUrl={
            a.attachments[0] ? `/api/files/${a.attachments[0].fileKey}` : null
          }
          defaults={{
            title: a.title,
            type: a.type,
            content: a.content,
            status: a.status,
            expiresAt: a.expiresAt ? dayKey(a.expiresAt) : "",
          }}
        />
      </>
    );
  }

  // suivi de lecture
  if (a.status === "PUBLISHED") {
    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: { announcementId: a.id, userId: user.id },
      },
      create: { announcementId: a.id, userId: user.id },
      update: {},
    });
  }
  const activeUsers = manage
    ? await prisma.user.count({ where: { isActive: true } })
    : 0;

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/announcements"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Toutes les annonces
        </Link>
        {manage && (
          <Link
            href={`/announcements/${a.id}?edit=1`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Pencil /> Modifier
          </Link>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card animate-rise">
        <AnnouncementCover
          type={a.type}
          imageKey={a.attachments[0]?.fileKey}
          className="max-h-96 min-h-48"
        />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <EnumBadge map={ANNOUNCEMENT_TYPE} value={a.type} />
            {manage && <EnumBadge map={PUBLICATION_STATUS} value={a.status} />}
            {a.expiresAt && (
              <span className="text-xs text-muted-foreground">
                Expire le {fmtDay(a.expiresAt)}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
            {a.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Publié par{" "}
            <span className="font-semibold text-foreground">
              {a.author.name}
            </span>{" "}
            · {fmtDateTime(a.publishedAt ?? a.createdAt)}
          </p>
          <div className="mt-6 space-y-4 text-[15px] leading-relaxed whitespace-pre-wrap text-stone-700">
            {a.content}
          </div>
          {manage && (
            <div className="mt-8 flex items-center gap-3 rounded-xl bg-orange-50 p-4 text-sm">
              <Eye className="size-5 text-orange-600" />
              <span>
                Lue par <strong>{a._count.reads}</strong> utilisateur(s) sur{" "}
                {activeUsers} comptes actifs
              </span>
              <div className="ml-auto h-2 w-32 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full bg-orange-500"
                  style={{
                    width: `${Math.min(100, (a._count.reads / Math.max(1, activeUsers)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

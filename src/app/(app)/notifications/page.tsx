import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Bell, CheckCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { fmtDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { ActionButton } from "@/components/shared/action-button";
import { Pagination, pageFrom } from "@/components/shared/pagination";
import { NotificationItem } from "@/components/shared/notification-item";
import { markAllNotificationsReadAction } from "@/server/actions/communication";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({
  searchParams,
}: PageProps<"/notifications">) {
  const user = await requirePage();
  const sp = await searchParams;
  const where: Prisma.NotificationWhereInput = {
    userId: user.id,
    ...(sp.state === "unread"
      ? { readAt: null }
      : sp.state === "read"
        ? { readAt: { not: null } }
        : {}),
  };
  const { page, skip, take } = pageFrom(sp, 15);
  const [total, unread, items] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);
  return (
    <>
      <PageHeader
        icon={<Bell />}
        title="Notifications"
        description={`${unread} non lue(s)`}
        actions={
          unread > 0 && (
            <ActionButton
              variant="outline"
              action={markAllNotificationsReadAction}
            >
              <CheckCheck /> Tout marquer comme lu
            </ActionButton>
          )
        }
      />
      <FilterBar
        selects={[
          {
            name: "state",
            label: "État",
            allLabel: "Toutes",
            options: [
              { value: "unread", label: "Non lues" },
              { value: "read", label: "Lues" },
            ],
          },
        ]}
      />
      {items.length === 0 ? (
        <EmptyState title="Aucune notification" icon={<Bell />} />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {items.map((n) => (
            <NotificationItem
              key={n.id}
              n={{
                id: n.id,
                title: n.title,
                message: n.message,
                link: n.link,
                date: fmtDateTime(n.createdAt),
                read: !!n.readAt,
              }}
            />
          ))}
        </ul>
      )}
      <Pagination page={page} total={total} size={15} searchParams={sp} />
    </>
  );
}

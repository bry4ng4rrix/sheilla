import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/permissions";
import { fmtDateTime } from "@/lib/dates";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requirePage();
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <Suspense>
      <AppShell
        user={{
          name: user.name,
          email: user.email,
          roleLabel: ROLE_LABELS[user.roleCode],
          permissions: [...user.permissions],
          hasEmployee: !!user.employeeId,
          initials,
        }}
        notifications={notifications.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          link: n.link,
          createdAt: fmtDateTime(n.createdAt),
          read: !!n.readAt,
        }))}
        unread={unread}
      >
        {children}
      </AppShell>
    </Suspense>
  );
}

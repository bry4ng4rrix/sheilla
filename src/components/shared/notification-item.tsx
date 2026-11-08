"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markNotificationReadAction } from "@/server/actions/communication";
import { cn } from "cn";

export function NotificationItem({
  n,
}: {
  n: {
    id: string;
    title: string;
    message: string;
    link: string | null;
    date: string;
    read: boolean;
  };
}) {
  const router = useRouter();
  const mark = async () => {
    await markNotificationReadAction(n.id);
    router.refresh();
  };
  return (
    <li
      className={cn(
        "flex items-start gap-4 px-5 py-4",
        !n.read && "bg-orange-50/50",
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full",
          n.read
            ? "bg-stone-100 text-stone-400"
            : "bg-orange-100 text-orange-600",
        )}
      >
        <Bell className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        {n.link ? (
          <Link
            href={n.link}
            onClick={() => !n.read && markNotificationReadAction(n.id)}
            className="font-semibold hover:text-orange-700"
          >
            {n.title}
          </Link>
        ) : (
          <p className="font-semibold">{n.title}</p>
        )}
        <p className="text-sm text-muted-foreground">{n.message}</p>
        <p className="mt-1 text-xs text-stone-400">{n.date}</p>
      </div>
      {!n.read && (
        <Button variant="ghost" size="sm" onClick={mark}>
          <Check /> Marquer lu
        </Button>
      )}
    </li>
  );
}

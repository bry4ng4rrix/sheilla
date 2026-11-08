"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  ChevronRight,
  KeyRound,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NAV, SEGMENT_LABELS } from "./nav";
import { logoutAction } from "@/server/actions/auth";
import { markAllNotificationsReadAction } from "@/server/actions/communication";

// Préférence d'affichage du menu, propre au navigateur
const subscribeSidebar = (cb: () => void) => {
  window.addEventListener("sidebar", cb);
  return () => window.removeEventListener("sidebar", cb);
};
const readSidebar = () => {
  try {
    return localStorage.getItem("sidebar") === "collapsed";
  } catch {
    return false;
  }
};

type ShellUser = {
  name: string;
  email: string;
  roleLabel: string;
  permissions: string[];
  hasEmployee: boolean;
  initials: string;
};
type ShellNotification = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  createdAt: string;
  read: boolean;
};

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 px-1">
      <Image
        src="/logo.png"
        alt="Logo JIRAMA"
        width={40}
        height={40}
        className="size-10 shrink-0 rounded-full shadow-lg shadow-orange-500/30 ring-2 ring-orange-400/30"
        priority
      />
      {!collapsed && (
        <div className="leading-tight">
          <p className="text-[15px] font-extrabold tracking-wide text-white">
            JIRAMA
          </p>
          <p className="text-[11px] font-medium text-orange-300/90">
            GRH · Antsirabe
          </p>
        </div>
      )}
    </Link>
  );
}

function NavLinks({
  user,
  collapsed,
  onNavigate,
}: {
  user: ShellUser;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter(
      (i) =>
        (!i.perm || user.permissions.includes(i.perm)) &&
        (!i.needsEmployee || user.hasEmployee),
    ),
  })).filter((g) => g.items.length);
  // l'entrée la plus spécifique gagne (/attendance vs /attendance/history)
  const all = groups.flatMap((g) => g.items.map((i) => i.href));
  const active = all
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.label}>
          {!collapsed && (
            <p className="mb-1.5 px-3 text-[10px] font-bold tracking-[0.14em] text-stone-500 uppercase">
              {g.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const isActive = item.href === active;
              const link = (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-900/40"
                      : "text-stone-300 hover:bg-white/5 hover:text-white",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <item.icon
                    className={cn(
                      "size-[18px] shrink-0",
                      !isActive && "text-stone-400 group-hover:text-orange-300",
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger render={link} />
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Breadcrumb() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  return (
    <nav
      aria-label="Fil d'Ariane"
      className="hidden items-center gap-1 text-sm text-muted-foreground md:flex"
    >
      <Link href="/dashboard" className="hover:text-foreground">
        Accueil
      </Link>
      {parts.map((p, i) => {
        const href = "/" + parts.slice(0, i + 1).join("/");
        const label = SEGMENT_LABELS[p] ?? "Détail";
        const last = i === parts.length - 1;
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="size-3.5" />
            {last || !SEGMENT_LABELS[p] ? (
              <span className={cn(last && "font-semibold text-foreground")}>
                {label}
              </span>
            ) : (
              <Link href={href} className="hover:text-foreground">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function Notifications({
  items,
  unread,
}: {
  items: ShellNotification[];
  unread: number;
}) {
  const router = useRouter();
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full"
            aria-label={`Notifications (${unread} non lues)`}
          />
        }
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              className="text-xs font-semibold text-orange-600 hover:underline"
              onClick={async () => {
                const r = await markAllNotificationsReadAction();
                if (r.ok) router.refresh();
                else toast.error(r.error);
              }}
            >
              Tout marquer comme lu
            </button>
          )}
        </div>
        <ul className="max-h-80 divide-y overflow-y-auto">
          {items.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              Aucune notification.
            </li>
          )}
          {items.map((n) => (
            <li key={n.id}>
              <Link
                href={n.link ?? "/notifications"}
                className={cn(
                  "flex gap-3 px-4 py-3 hover:bg-muted/60",
                  !n.read && "bg-orange-50/60",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    n.read ? "bg-stone-300" : "bg-orange-500",
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{n.title}</span>
                  <span className="line-clamp-2 block text-xs text-muted-foreground">
                    {n.message}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-stone-400">
                    {n.createdAt}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/notifications"
          className="block border-t px-4 py-2.5 text-center text-sm font-semibold text-orange-600 hover:bg-muted/50"
        >
          Voir tout l&apos;historique
        </Link>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({
  user,
  notifications,
  unread,
  children,
}: {
  user: ShellUser;
  notifications: ShellNotification[];
  unread: number;
  children: React.ReactNode;
}) {
  const collapsed = useSyncExternalStore(
    subscribeSidebar,
    readSidebar,
    () => false,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (params.get("denied"))
      toast.error("Accès refusé : vous n'avez pas les droits nécessaires.");
  }, [params]);

  const toggle = () => {
    try {
      localStorage.setItem("sidebar", collapsed ? "open" : "collapsed");
    } catch {}
    window.dispatchEvent(new Event("sidebar"));
  };

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar transition-[width] duration-300 lg:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <div className="relative flex h-16 items-center px-4">
          <Brand collapsed={collapsed} />
        </div>
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <NavLinks user={user} collapsed={collapsed} />
        </div>
        <button
          onClick={toggle}
          className="m-3 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium text-stone-400 hover:bg-white/5 hover:text-white"
          aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <>
              <PanelLeftClose className="size-4" /> Replier
            </>
          )}
        </button>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-0 bg-sidebar p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="flex h-16 items-center px-4">
            <Brand />
          </div>
          <div className="overflow-y-auto px-3 pb-6">
            <NavLinks user={user} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-5" />
          </Button>
          <Breadcrumb />
          <form
            className="relative ml-auto w-full max-w-xs"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q");
              if (q) router.push(`/search?q=${encodeURIComponent(String(q))}`);
            }}
          >
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              placeholder="Rechercher…"
              className="h-9 rounded-full bg-stone-100/80 pl-9 focus-visible:bg-white"
              aria-label="Recherche globale"
            />
          </form>
          <Notifications items={notifications} unread={unread} />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-muted"
                  aria-label="Menu utilisateur"
                />
              }
            >
              <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white shadow-sm">
                {user.initials}
              </span>
              <span className="hidden text-left leading-tight xl:block">
                <span className="block text-sm font-semibold">{user.name}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {user.roleLabel}
                </span>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <p className="font-semibold text-foreground">{user.name}</p>
                  <p className="truncate text-xs font-normal">{user.email}</p>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {user.hasEmployee && (
                <DropdownMenuItem render={<Link href="/profile" />}>
                  <UserRound /> Mon profil
                </DropdownMenuItem>
              )}
              <DropdownMenuItem render={<Link href="/profile#password" />}>
                <KeyRound /> Changer le mot de passe
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => logoutAction()}
              >
                <LogOut /> Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} JIRAMA Antsirabe — Jiro sy Rano Malagasy
          · Gestion des ressources humaines
        </footer>
      </div>
    </div>
  );
}

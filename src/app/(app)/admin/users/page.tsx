import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { fmtDateTime } from "@/lib/dates";
import { ROLE_LABELS, type RoleCode } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActionButton } from "@/components/shared/action-button";
import { Pagination, pageFrom } from "@/components/shared/pagination";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toggleUserAction } from "@/server/actions/users";

export const metadata: Metadata = { title: "Utilisateurs" };
const ROLE_TONE = {
  ADMIN: "violet",
  HR: "brand",
  EMPLOYEE: "neutral",
} as const;

export default async function UsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  const me = await requirePage("users.manage");
  const sp = await searchParams;
  const str = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : "";
  const q = str("q").trim();
  const where: Prisma.UserWhereInput = {
    ...(q
      ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] }
      : {}),
    ...(str("role") ? { role: { code: str("role") } } : {}),
    ...(str("state") ? { isActive: str("state") === "active" } : {}),
  };
  const { page, skip, take } = pageFrom(sp, 15);
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: { role: true, employee: { select: { matricule: true } } },
    }),
  ]);
  return (
    <>
      <PageHeader
        icon={<ShieldCheck />}
        title="Utilisateurs"
        description="Comptes, rôles et accès à la plateforme"
        actions={
          <Link
            href="/admin/users/create"
            className={buttonVariants({ size: "lg" })}
          >
            <Plus /> Nouveau compte
          </Link>
        }
      />
      <FilterBar
        searchPlaceholder="Nom ou e-mail…"
        selects={[
          {
            name: "role",
            label: "Rôle",
            options: Object.entries(ROLE_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            name: "state",
            label: "État",
            options: [
              { value: "active", label: "Actifs" },
              { value: "inactive", label: "Désactivés" },
            ],
          },
        ]}
      />
      {users.length === 0 ? (
        <EmptyState title="Aucun compte" />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50/80">
                <TableHead className="pl-5">Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="hidden md:table-cell">Dossier</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Dernière connexion
                </TableHead>
                <TableHead>État</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="pl-5">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="font-semibold hover:text-orange-700"
                    >
                      {u.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={ROLE_TONE[u.role.code as RoleCode]}>
                      {u.role.name}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">
                    {u.employee?.matricule ?? (
                      <span className="font-sans text-muted-foreground">
                        Compte technique
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {fmtDateTime(u.lastLoginAt)}
                  </TableCell>
                  <TableCell>
                    {u.approvalStatus === "PENDING" ? (
                      <Link href="/admin/registrations"><StatusBadge tone="warning">En attente de validation</StatusBadge></Link>
                    ) : u.approvalStatus === "REJECTED" ? (
                      <StatusBadge tone="danger">Inscription refusée</StatusBadge>
                    ) : u.isActive ? (
                      <StatusBadge tone="success">Actif</StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">Désactivé</StatusBadge>
                    )}
                    {u.lockedUntil && u.lockedUntil > new Date() && (
                      <StatusBadge tone="danger" className="ml-1">
                        Verrouillé
                      </StatusBadge>
                    )}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    {u.id !== me.id && u.approvalStatus === "APPROVED" && (
                      <ActionButton
                        variant="ghost"
                        size="sm"
                        action={toggleUserAction.bind(null, u.id)}
                        confirm={{
                          title: u.isActive
                            ? `Désactiver ${u.name} ?`
                            : `Réactiver ${u.name} ?`,
                          description: u.isActive
                            ? "L'accès sera immédiatement bloqué."
                            : "L'utilisateur pourra à nouveau se connecter.",
                          destructive: u.isActive,
                        }}
                      >
                        {u.isActive ? "Désactiver" : "Activer"}
                      </ActionButton>
                    )}
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

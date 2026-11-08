import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { fmtDateTime } from "@/lib/dates";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActionButton } from "@/components/shared/action-button";
import { UserForm } from "@/components/admin/user-form";
import { toggleUserAction, updateUserAction } from "@/server/actions/users";
import { linkableEmployees } from "@/server/services/users";

export const metadata: Metadata = { title: "Compte utilisateur" };

export default async function UserPage({
  params,
}: PageProps<"/admin/users/[id]">) {
  const me = await requirePage("users.manage");
  const { id } = await params;
  const u = await prisma.user.findUnique({
    where: { id },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
  if (!u) notFound();
  const [employees, logins] = await Promise.all([
    linkableEmployees(u.employeeId),
    prisma.auditLog.findMany({
      where: {
        userId: id,
        action: {
          in: [
            "auth.login",
            "auth.login_failed",
            "auth.password_reset",
            "auth.password_change",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);
  return (
    <>
      <PageHeader
        icon={<ShieldCheck />}
        title={u.name}
        description={`${u.email} · créé le ${fmtDateTime(u.createdAt)}`}
        actions={
          u.id !== me.id && (
            <ActionButton
              variant={u.isActive ? "destructive" : "default"}
              action={toggleUserAction.bind(null, u.id)}
              confirm={{
                title: u.isActive
                  ? "Désactiver ce compte ?"
                  : "Réactiver ce compte ?",
                description: "Le changement est immédiat et journalisé.",
                destructive: u.isActive,
              }}
            >
              {u.isActive ? "Désactiver le compte" : "Réactiver le compte"}
            </ActionButton>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Panel title="Informations du compte">
          <UserForm
            isEdit
            action={updateUserAction.bind(null, u.id)}
            employees={employees}
            defaults={{
              name: u.name,
              email: u.email,
              roleCode: u.role.code,
              employeeId: u.employeeId ?? "",
            }}
          />
        </Panel>
        <div className="space-y-6">
          <Panel title={`Permissions — ${u.role.name}`}>
            <ul className="space-y-1.5 text-sm">
              {u.role.permissions.map((rp) => (
                <li key={rp.permissionId} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-orange-500" />
                  {PERMISSIONS[rp.permission.code as Permission] ??
                    rp.permission.code}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Historique des connexions" bodyClassName="p-0">
            <ul className="divide-y text-sm">
              {logins.length === 0 && (
                <li className="p-5 text-muted-foreground">
                  Aucune connexion enregistrée.
                </li>
              )}
              {logins.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-2 px-5 py-2.5"
                >
                  <StatusBadge
                    tone={
                      l.action === "auth.login"
                        ? "success"
                        : l.action === "auth.login_failed"
                          ? "danger"
                          : "info"
                    }
                  >
                    {
                      {
                        "auth.login": "Connexion",
                        "auth.login_failed": "Échec",
                        "auth.password_reset": "Réinitialisation",
                        "auth.password_change": "Mot de passe",
                      }[l.action]
                    }
                  </StatusBadge>
                  <span className="text-xs text-muted-foreground">
                    {fmtDateTime(l.createdAt)}
                    {l.ip ? ` · ${l.ip}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

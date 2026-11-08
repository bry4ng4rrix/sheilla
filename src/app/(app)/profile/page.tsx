import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { requirePage } from "@/lib/session";
import { fmtDay } from "@/lib/dates";
import { CONTRACT_LABELS, EMPLOYEE_STATUS, GENDER_LABELS } from "@/lib/labels";
import { ROLE_LABELS } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { EnumBadge } from "@/components/shared/status-badge";
import { PasswordForm, ProfileForm } from "@/components/profile/profile-forms";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Mon profil" };

export default async function ProfilePage() {
  const user = await requirePage();
  const e = user.employeeId
    ? await prisma.employee.findUnique({
        where: { id: user.employeeId },
        include: { position: { include: { department: true } }, team: true },
      })
    : null;
  const rows: [string, string][] = e
    ? [
        ["Matricule", e.matricule],
        ["Nom", e.lastName],
        ["Prénom", e.firstName],
        ["Sexe", GENDER_LABELS[e.gender]],
        ["Date de naissance", fmtDay(e.birthDate)],
        ["Service", e.position.department.name],
        ["Poste", e.position.title],
        ["Équipe", e.team?.name ?? "—"],
        ["Recrutement", fmtDay(e.hireDate)],
        ["Contrat", CONTRACT_LABELS[e.contractType]],
      ]
    : [
        ["Compte", user.email],
        ["Rôle", ROLE_LABELS[user.roleCode]],
      ];
  return (
    <>
      <PageHeader
        icon={<UserRound />}
        title="Mon profil"
        description="Vos informations personnelles et professionnelles"
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel
          title="Dossier administratif"
          description={
            e
              ? "Données gérées par le service RH (RG07) — contactez-le pour toute correction."
              : undefined
          }
          action={e && <EnumBadge map={EMPLOYEE_STATUS} value={e.status} />}
        >
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div
                key={k}
                className="border-b border-dashed border-stone-200 pb-2"
              >
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <div className="space-y-6">
          {e && (
            <Panel
              title="Mes coordonnées"
              description="Champs modifiables par vous-même"
            >
              <ProfileForm
                defaults={{
                  phone: e.phone ?? "",
                  email: e.email ?? "",
                  address: e.address ?? "",
                }}
                photoUrl={e.photoKey ? `/api/files/${e.photoKey}` : null}
                initials={`${e.firstName[0]}${e.lastName[0]}`}
              />
            </Panel>
          )}
          <Panel title="Sécurité">
            <PasswordForm />
          </Panel>
        </div>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Briefcase,
  CalendarDays,
  Clock,
  History,
  Pencil,
  UserCheck,
  UserX,
  Mail,
  Phone,
  MapPin,
  Cake,
  ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, requirePage } from "@/lib/session";
import {
  addDays,
  fmtDateTime,
  fmtDay,
  fmtMinutes,
  fmtTime,
  localDay,
} from "@/lib/dates";
import {
  ATTENDANCE_STATUS,
  CONTRACT_LABELS,
  EMPLOYEE_STATUS,
  GENDER_LABELS,
  LEAVE_STATUS,
  LEAVE_TYPE_LABELS,
} from "@/lib/labels";
import { ROLE_LABELS, type RoleCode } from "@/lib/permissions";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";
import { EnumBadge, StatusBadge } from "@/components/shared/status-badge";
import { Panel } from "@/components/shared/panel";
import { ActionButton } from "@/components/shared/action-button";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setEmployeeActiveAction } from "@/server/actions/employees";
import { buildSheet, summarize } from "@/server/services/attendance";
import { leaveBalance } from "@/server/services/leaves";

export const metadata: Metadata = { title: "Fiche employé" };

function Info({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <span className="mt-0.5 text-orange-500 [&_svg]:size-4">{icon}</span>
      )}
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm font-semibold text-stone-800">
          {value || "—"}
        </dd>
      </div>
    </div>
  );
}

export default async function EmployeePage({
  params,
}: PageProps<"/employees/[id]">) {
  const user = await requirePage("employees.view");
  const { id } = await params;
  const e = await prisma.employee.findUnique({
    where: { id },
    include: {
      position: { include: { department: true } },
      team: true,
      user: { include: { role: true } },
      contracts: { orderBy: { startDate: "desc" } },
      leaveRequests: { orderBy: { startDate: "desc" }, take: 20 },
    },
  });
  if (!e) notFound();
  const today = localDay();
  const [sheet, balance, logs] = await Promise.all([
    buildSheet(addDays(today, -29), today, { id }),
    leaveBalance(id),
    prisma.auditLog.findMany({
      where: { entityId: id },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  const sum = summarize(sheet);
  const manage = can(user, "employees.manage");
  const age = e.birthDate
    ? Math.floor(
        (today.getTime() - e.birthDate.getTime()) / (365.25 * 86_400_000),
      )
    : null;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border bg-card animate-rise">
        <div className="relative h-28 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400">
          <svg
            className="absolute right-6 bottom-0 h-full opacity-25"
            viewBox="0 0 200 100"
            aria-hidden
          >
            <circle
              cx="150"
              cy="50"
              r="60"
              fill="none"
              stroke="white"
              strokeWidth="12"
            />
          </svg>
        </div>
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <EmployeeAvatar
            firstName={e.firstName}
            lastName={e.lastName}
            photoKey={e.photoKey}
            size="xl"
            className="-mt-12 ring-4"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold">
                {e.firstName} {e.lastName}
              </h1>
              {e.deletedAt ? (
                <StatusBadge tone="neutral">Dossier désactivé</StatusBadge>
              ) : (
                <EnumBadge map={EMPLOYEE_STATUS} value={e.status} />
              )}
            </div>
            <p className="text-muted-foreground">
              {e.position.title} ·{" "}
              <span className="font-semibold text-orange-600">
                {e.position.department.name}
              </span>
            </p>
          </div>
          {manage && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/employees/${e.id}/edit`}
                className={buttonVariants({ variant: "outline" })}
              >
                <Pencil /> Modifier
              </Link>
              {e.deletedAt ? (
                <ActionButton
                  action={setEmployeeActiveAction.bind(null, e.id, true)}
                  confirm={{
                    title: "Réactiver ce dossier ?",
                    description:
                      "Le dossier et le compte associé seront réactivés.",
                    label: "Réactiver",
                  }}
                >
                  <UserCheck /> Réactiver
                </ActionButton>
              ) : (
                <ActionButton
                  variant="destructive"
                  action={setEmployeeActiveAction.bind(null, e.id, false)}
                  confirm={{
                    title: "Désactiver ce dossier ?",
                    description:
                      "Le compte de l'agent sera bloqué. L'historique (pointages, congés, contrats) est intégralement conservé (RG08).",
                    label: "Désactiver",
                    destructive: true,
                  }}
                >
                  <UserX /> Désactiver
                </ActionButton>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="État civil & coordonnées">
          <dl className="grid gap-4">
            <Info
              icon={<Cake />}
              label="Naissance"
              value={e.birthDate ? `${fmtDay(e.birthDate)} (${age} ans)` : null}
            />
            <Info
              icon={<UserCheck />}
              label="Sexe"
              value={GENDER_LABELS[e.gender]}
            />
            <Info icon={<MapPin />} label="Adresse" value={e.address} />
            <Info icon={<Phone />} label="Téléphone" value={e.phone} />
            <Info icon={<Mail />} label="E-mail" value={e.email} />
          </dl>
        </Panel>
        <Panel title="Carrière">
          <dl className="grid grid-cols-2 gap-4">
            <Info
              label="Matricule"
              value={<span className="font-mono">{e.matricule}</span>}
            />
            <Info label="Contrat" value={CONTRACT_LABELS[e.contractType]} />
            <Info label="Recrutement" value={fmtDay(e.hireDate)} />
            <Info
              label="Départ"
              value={e.departureDate ? fmtDay(e.departureDate) : null}
            />
            <Info label="Équipe" value={e.team?.name} />
            <Info label="Service" value={e.position.department.name} />
          </dl>
        </Panel>
        <Panel title="Compte & synthèse">
          <dl className="grid gap-4">
            <Info
              icon={<ShieldCheck />}
              label="Compte utilisateur"
              value={
                e.user
                  ? `${e.user.email} · ${ROLE_LABELS[e.user.role.code as RoleCode]}${e.user.isActive ? "" : " (bloqué)"}`
                  : "Aucun compte"
              }
            />
          </dl>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-teal-50 p-3">
              <p className="text-xl font-extrabold text-teal-700">
                {sum.rate}%
              </p>
              <p className="text-[11px] text-teal-800/70">Présence 30 j</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <p className="text-xl font-extrabold text-amber-700">
                {sum.late}
              </p>
              <p className="text-[11px] text-amber-800/70">Retards</p>
            </div>
            <div className="rounded-xl bg-orange-50 p-3">
              <p className="text-xl font-extrabold text-orange-700">
                {balance.remaining}
              </p>
              <p className="text-[11px] text-orange-800/70">Jours de congé</p>
            </div>
          </div>
        </Panel>
      </div>

      <Tabs defaultValue="attendance">
        <TabsList className="flex-wrap">
          <TabsTrigger value="attendance">
            <Clock /> Présences (30 j)
          </TabsTrigger>
          <TabsTrigger value="leaves">
            <CalendarDays /> Congés
          </TabsTrigger>
          <TabsTrigger value="contracts">
            <Briefcase /> Contrats
          </TabsTrigger>
          <TabsTrigger value="history">
            <History /> Historique
          </TabsTrigger>
        </TabsList>
        <TabsContent value="attendance">
          <Panel bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5">Jour</th>
                    <th>Poste prévu</th>
                    <th>Entrée</th>
                    <th>Sortie</th>
                    <th>Retard</th>
                    <th className="pr-5">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sheet
                    .filter((r) => r.status !== "OFF")
                    .reverse()
                    .map((r) => (
                      <tr key={r.day.toISOString()}>
                        <td className="px-5 py-2.5 font-medium">
                          {fmtDay(r.day)}
                        </td>
                        <td>
                          {r.plan.shift
                            ? `${r.plan.shift.name} (${r.plan.shift.startTime}–${r.plan.shift.endTime})`
                            : "Repos"}
                        </td>
                        <td className="tabular-nums">{fmtTime(r.checkIn)}</td>
                        <td className="tabular-nums">{fmtTime(r.checkOut)}</td>
                        <td>
                          {r.lateMinutes ? fmtMinutes(r.lateMinutes) : "—"}
                        </td>
                        <td className="pr-5">
                          <EnumBadge map={ATTENDANCE_STATUS} value={r.status} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="leaves">
          <Panel bodyClassName="p-0">
            {e.leaveRequests.length === 0 ? (
              <div className="p-5">
                <EmptyState title="Aucune demande de congé" />
              </div>
            ) : (
              <ul className="divide-y">
                {e.leaveRequests.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/hr/leave-requests/${l.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-orange-50/40"
                    >
                      <span>
                        <span className="block text-sm font-semibold">
                          {LEAVE_TYPE_LABELS[l.type]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {fmtDay(l.startDate)} → {fmtDay(l.endDate)} · {l.days}{" "}
                          j
                        </span>
                      </span>
                      <EnumBadge map={LEAVE_STATUS} value={l.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>
        <TabsContent value="contracts">
          <Panel>
            <ol className="relative space-y-5 border-l-2 border-orange-100 pl-6">
              {e.contracts.map((c) => (
                <li key={c.id} className="relative">
                  <span className="absolute top-1 -left-[31px] size-4 rounded-full border-4 border-white bg-orange-500 shadow" />
                  <p className="font-semibold">{CONTRACT_LABELS[c.type]}</p>
                  <p className="text-sm text-muted-foreground">
                    Du {fmtDay(c.startDate)}{" "}
                    {c.endDate ? `au ${fmtDay(c.endDate)}` : "— en cours"}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        </TabsContent>
        <TabsContent value="history">
          <Panel bodyClassName="p-0">
            {logs.length === 0 ? (
              <div className="p-5">
                <EmptyState title="Aucun événement journalisé" />
              </div>
            ) : (
              <ul className="divide-y">
                {logs.map((l) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
                  >
                    <span>
                      <span className="font-mono text-xs text-orange-700">
                        {l.action}
                      </span>{" "}
                      <span className="text-muted-foreground">par</span>{" "}
                      <span className="font-semibold">
                        {l.user?.name ?? "Système"}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {fmtDateTime(l.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </>
  );
}

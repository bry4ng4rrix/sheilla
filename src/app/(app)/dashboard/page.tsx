import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Gauge,
  Megaphone,
  Palmtree,
  ShieldCheck,
  TriangleAlert,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage, type CurrentUser } from "@/lib/session";
import {
  addDays,
  fmtDateTime,
  fmtDay,
  fmtMinutes,
  fmtTime,
  localDay,
} from "@/lib/dates";
import {
  ANNOUNCEMENT_TYPE,
  ATTENDANCE_STATUS,
  LEAVE_STATUS,
  LEAVE_TYPE_LABELS,
} from "@/lib/labels";
import { KpiCard } from "@/components/shared/kpi-card";
import { Panel } from "@/components/shared/panel";
import { EnumBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";
import {
  DepartmentBars,
  LatenessArea,
  MonthlyChart,
  PresenceDonut,
  RoleDonut,
} from "@/components/dashboard/charts";
import { TodayPunch } from "@/components/attendance/today-punch";
import { adminStats, hrStats } from "@/server/services/dashboard";
import { leaveBalance } from "@/server/services/leaves";
import { buildSheet } from "@/server/services/attendance";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Tableau de bord" };

function Greeting({ user, subtitle }: { user: CurrentUser; subtitle: string }) {
  const hour = Number(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Indian/Antananarivo",
      hour: "numeric",
    }).format(new Date()),
  );
  const first = user.employee?.firstName ?? user.name.split(" ")[0];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 p-6 text-white shadow-lg shadow-orange-500/25 animate-rise sm:p-8">
      <svg
        className="absolute right-0 bottom-0 h-full opacity-20"
        viewBox="0 0 300 160"
        aria-hidden
      >
        <circle
          cx="250"
          cy="40"
          r="90"
          fill="none"
          stroke="white"
          strokeWidth="18"
        />
        <circle cx="250" cy="40" r="40" fill="white" opacity=".4" />
      </svg>
      <p className="relative text-sm font-medium text-orange-50">
        {new Intl.DateTimeFormat("fr-FR", {
          timeZone: "Indian/Antananarivo",
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date())}
      </p>
      <h1 className="relative mt-1 text-2xl font-extrabold sm:text-3xl">
        {hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir"},{" "}
        {first} !
      </h1>
      <p className="relative mt-1 max-w-xl text-orange-50/95">{subtitle}</p>
    </div>
  );
}

async function HrDashboard() {
  const s = await hrStats();
  const pendingList = await prisma.leaveRequest.findMany({
    where: { status: "PENDING" },
    include: { employee: true },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Employés actifs"
          value={s.activeEmployees}
          icon={<Users />}
          hint={`${s.departments} services · ${s.positions} postes`}
        />
        <KpiCard
          label="Demandes en attente"
          value={s.pending}
          icon={<ClipboardCheck />}
          accent="amber"
          href="/hr/leave-requests?status=PENDING"
          hint="À traiter par le service RH"
          delay={60}
        />
        <KpiCard
          label="Taux de présence (30 j)"
          value={`${s.summary.rate}%`}
          icon={<Gauge />}
          accent="teal"
          href="/attendance/history"
          hint={`${s.summary.present} présences sur ${s.summary.planned} jours planifiés`}
          delay={120}
        />
        <KpiCard
          label="Anomalies à traiter"
          value={s.anomalies}
          icon={<TriangleAlert />}
          accent="rose"
          href="/attendance/anomalies"
          hint={`${s.onLeave} agent(s) en congé aujourd'hui`}
          delay={180}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          title="Évolution mensuelle"
          description="Effectif vs demandes de congé reçues (12 mois)"
          className="xl:col-span-2"
          delay={100}
        >
          <MonthlyChart data={s.months} />
        </Panel>
        <Panel
          title="Présence sur 30 jours"
          description="Jours planifiés uniquement"
          delay={160}
        >
          <PresenceDonut {...s.summary} />
        </Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          title="Répartition par service"
          description="Agents actifs"
          delay={200}
        >
          <DepartmentBars data={s.byDepartment} />
        </Panel>
        <Panel
          title="Évolution des retards"
          description="Nombre de retards par mois"
          delay={240}
        >
          <LatenessArea data={s.months} />
        </Panel>
        <Panel
          title="Demandes à traiter"
          action={
            <Link
              href="/hr/leave-requests"
              className="text-xs font-semibold text-orange-600 hover:underline"
            >
              Tout voir
            </Link>
          }
          delay={280}
          bodyClassName="p-0"
        >
          {pendingList.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Aucune demande en attente"
                description="Tout est à jour 🎉"
              />
            </div>
          ) : (
            <ul className="divide-y">
              {pendingList.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/hr/leave-requests/${r.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-orange-50/50"
                  >
                    <EmployeeAvatar
                      firstName={r.employee.firstName}
                      lastName={r.employee.lastName}
                      photoKey={r.employee.photoKey}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {r.employee.firstName} {r.employee.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {LEAVE_TYPE_LABELS[r.type]} · {fmtDay(r.startDate)} →{" "}
                        {fmtDay(r.endDate)}
                      </p>
                    </div>
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-700">
                      {r.days} j
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Panel
        title="Aujourd'hui"
        description={`${s.todayExpected} agent(s) planifié(s)`}
        delay={300}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["Présents", s.today.present, "text-emerald-600"],
            ["En retard", s.today.late, "text-amber-600"],
            ["Absents", s.today.absent, "text-red-600"],
            ["Anomalies", s.today.anomaly, "text-violet-600"],
            ["En congé", s.today.leave, "text-sky-600"],
          ].map(([l, v, c]) => (
            <div
              key={l as string}
              className="rounded-xl bg-stone-50 p-4 text-center"
            >
              <p className={`text-2xl font-extrabold ${c}`}>{v as number}</p>
              <p className="text-xs font-medium text-muted-foreground">
                {l as string}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

async function AdminDashboard() {
  const [a, s, registrations] = await Promise.all([
    adminStats(),
    hrStats(),
    prisma.user.count({ where: { approvalStatus: "PENDING" } }),
  ]);
  return (
    <>
      {registrations > 0 && (
        <Link
          href="/admin/registrations"
          className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 animate-rise hover:bg-amber-100"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-amber-400 text-white shadow-sm">
            <UserPlus className="size-5" />
          </span>
          <span className="flex-1 font-semibold">
            {registrations} demande{registrations > 1 ? "s" : ""} d&apos;inscription en attente de validation
          </span>
          <span className="text-sm font-bold text-orange-700">Traiter →</span>
        </Link>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Effectif global"
          value={s.activeEmployees}
          icon={<Users />}
        />
        <KpiCard
          label="Comptes actifs"
          value={`${a.activeUsers}/${a.users}`}
          icon={<ShieldCheck />}
          accent="navy"
          href="/admin/users"
          delay={50}
        />
        <KpiCard
          label="Services"
          value={s.departments}
          icon={<Building2 />}
          accent="teal"
          href="/organization/services"
          delay={100}
        />
        <KpiCard
          label="Postes"
          value={s.positions}
          icon={<BriefcaseBusiness />}
          accent="violet"
          href="/organization/positions"
          delay={150}
        />
        <KpiCard
          label="Demandes en attente"
          value={s.pending}
          icon={<ClipboardCheck />}
          accent="amber"
          href="/hr/leave-requests?status=PENDING"
          delay={200}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          title="Statistiques globales"
          description="Effectif et demandes reçues sur 12 mois"
          className="xl:col-span-2"
        >
          <MonthlyChart data={s.months} />
        </Panel>
        <Panel title="Comptes par rôle">
          <RoleDonut data={a.byRole} />
          <div className="mt-4 rounded-xl bg-stone-50 p-3 text-center text-sm">
            Taux de présence (30 j) :{" "}
            <span className="font-bold text-teal-700">{s.summary.rate}%</span>
          </div>
        </Panel>
      </div>
      <Panel
        title="Activité récente"
        description="Journal d'audit"
        action={
          <Link
            href="/admin/audit"
            className="text-xs font-semibold text-orange-600 hover:underline"
          >
            Journal complet
          </Link>
        }
        bodyClassName="p-0"
      >
        <ul className="divide-y">
          {a.activity.map((l) => (
            <li
              key={l.id}
              className="flex items-center gap-3 px-5 py-3 text-sm"
            >
              <span className="grid size-8 place-items-center rounded-full bg-orange-50 text-orange-600">
                <Activity className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-semibold">
                  {l.user?.name ?? "Système"}
                </span>{" "}
                <span className="text-muted-foreground">— {l.action}</span>
                <span className="ml-1 text-xs text-stone-400">{l.entity}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {fmtDateTime(l.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

async function EmployeeDashboard({ user }: { user: CurrentUser }) {
  const employeeId = user.employeeId!;
  const today = localDay();
  const [balance, requests, announcements, notifications, sheet] =
    await Promise.all([
      leaveBalance(employeeId),
      prisma.leaveRequest.findMany({
        where: { employeeId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.announcement.findMany({
        where: {
          status: "PUBLISHED",
          OR: [{ expiresAt: null }, { expiresAt: { gte: today } }],
        },
        orderBy: { publishedAt: "desc" },
        take: 3,
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      buildSheet(addDays(today, -6), today, { id: employeeId }),
    ]);
  const emp = user.employee!;
  const days = sheet.filter((r) => r.status !== "OFF").reverse();
  return (
    <>
      <TodayPunch employeeId={employeeId} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Solde de congés"
          value={`${balance.remaining} j`}
          icon={<Palmtree />}
          accent="teal"
          hint={`${balance.used} pris sur ${balance.entitlement} · ${balance.pending} en attente`}
          href="/leaves"
        />
        <KpiCard
          label="Demandes en cours"
          value={requests.filter((r) => r.status === "PENDING").length}
          icon={<CalendarDays />}
          accent="amber"
          href="/leaves"
          delay={60}
        />
        <KpiCard
          label="Retards (7 j)"
          value={sheet.filter((r) => r.status === "LATE").length}
          icon={<CalendarClock />}
          accent="rose"
          hint={fmtMinutes(sheet.reduce((s, r) => s + r.lateMinutes, 0))}
          href="/attendance/history"
          delay={120}
        />
        <KpiCard
          label="Jours présents (7 j)"
          value={
            sheet.filter((r) => r.status === "PRESENT" || r.status === "LATE")
              .length
          }
          icon={<UserCheck />}
          href="/attendance/history"
          delay={180}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Mes informations" delay={100}>
          <div className="flex items-center gap-4">
            <EmployeeAvatar
              firstName={emp.firstName}
              lastName={emp.lastName}
              photoKey={emp.photoKey}
              size="lg"
            />
            <div>
              <p className="text-lg font-bold">
                {emp.firstName} {emp.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                {emp.position.title}
              </p>
              <p className="text-xs font-semibold text-orange-600">
                {emp.position.department.name}
              </p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Matricule</dt>
              <dd className="font-semibold">{emp.matricule}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Recrutement</dt>
              <dd className="font-semibold">{fmtDay(emp.hireDate)}</dd>
            </div>
          </dl>
          <Link
            href="/profile"
            className={buttonVariants({
              variant: "outline",
              className: "mt-5 w-full",
            })}
          >
            Voir mon profil
          </Link>
        </Panel>
        <Panel
          title="Derniers pointages"
          description="7 derniers jours"
          action={
            <Link
              href="/attendance/history"
              className="text-xs font-semibold text-orange-600 hover:underline"
            >
              Historique
            </Link>
          }
          bodyClassName="p-0"
          delay={150}
        >
          <ul className="divide-y">
            {days.length === 0 && (
              <li className="p-5 text-sm text-muted-foreground">
                Aucun jour planifié.
              </li>
            )}
            {days.map((r) => (
              <li
                key={r.day.toISOString()}
                className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm"
              >
                <span className="font-medium">{fmtDay(r.day)}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {fmtTime(r.checkIn)} – {fmtTime(r.checkOut)}
                </span>
                <EnumBadge map={ATTENDANCE_STATUS} value={r.status} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title="Mes demandes"
          action={
            <Link
              href="/leaves/create"
              className="text-xs font-semibold text-orange-600 hover:underline"
            >
              Nouvelle demande
            </Link>
          }
          bodyClassName="p-0"
          delay={200}
        >
          {requests.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Aucune demande"
                description="Vos demandes de congé apparaîtront ici."
              />
            </div>
          ) : (
            <ul className="divide-y">
              {requests.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/leaves/${r.id}`}
                    className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-orange-50/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {LEAVE_TYPE_LABELS[r.type]}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {fmtDay(r.startDate)} → {fmtDay(r.endDate)} · {r.days} j
                      </span>
                    </span>
                    <EnumBadge map={LEAVE_STATUS} value={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Dernières annonces"
          action={
            <Link
              href="/announcements"
              className="text-xs font-semibold text-orange-600 hover:underline"
            >
              Toutes
            </Link>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y">
            {announcements.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/announcements/${a.id}`}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-orange-50/50"
                >
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-600">
                    <Megaphone className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {a.title}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <EnumBadge map={ANNOUNCEMENT_TYPE} value={a.type} />{" "}
                      {fmtDateTime(a.publishedAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title="Notifications"
          action={
            <Link
              href="/notifications"
              className="text-xs font-semibold text-orange-600 hover:underline"
            >
              Toutes
            </Link>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y">
            {notifications.length === 0 && (
              <li className="p-5 text-sm text-muted-foreground">
                Aucune notification.
              </li>
            )}
            {notifications.map((n) => (
              <li key={n.id} className="flex gap-3 px-5 py-3">
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-stone-300" : "bg-orange-500"}`}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{n.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {n.message}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

export default async function DashboardPage() {
  const user = await requirePage();
  const subtitle =
    user.roleCode === "ADMIN"
      ? "Supervision de la plateforme : comptes, organisation et activité."
      : user.roleCode === "HR"
        ? "Voici l'état du personnel et des demandes à traiter aujourd'hui."
        : "Retrouvez votre pointage du jour, vos congés et les dernières informations.";
  return (
    <>
      <Greeting user={user} subtitle={subtitle} />
      {user.roleCode === "ADMIN" ? (
        <AdminDashboard />
      ) : user.roleCode === "HR" ? (
        <HrDashboard />
      ) : user.employeeId ? (
        <EmployeeDashboard user={user} />
      ) : null}
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ChevronLeft, ChevronRight, Clock, Moon, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import {
  addDays,
  dayKey,
  fmtDay,
  fmtMinutes,
  localDay,
  parseDay,
  weekdayIndex,
} from "@/lib/dates";
import { SCHEDULE_CATEGORY, WEEKDAYS } from "@/lib/labels";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActionButton } from "@/components/shared/action-button";
import { FilterBar } from "@/components/shared/filter-bar";
import { ScheduleDialog, ShiftDialog } from "@/components/attendance/dialogs";
import { PlanningCell } from "@/components/attendance/planning-cell";
import { ScheduleSelect } from "@/components/attendance/schedule-select";
import { buttonVariants } from "@/components/ui/button";
import { loadPlanning } from "@/server/services/attendance";
import {
  crossesMidnight,
  shiftMinutes,
} from "@/server/services/attendance-engine";
import { setDefaultScheduleAction } from "@/server/actions/attendance";
import { cn } from "cn";

export const metadata: Metadata = { title: "Horaires & plannings" };

export default async function SchedulesPage({
  searchParams,
}: PageProps<"/attendance/schedules">) {
  await requirePage("attendance.manage");
  const sp = await searchParams;
  const str = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : "";
  const today = localDay();
  let start = addDays(today, -weekdayIndex(today));
  try {
    if (str("start")) start = parseDay(str("start"));
  } catch {}
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i));
  const where: Prisma.EmployeeWhereInput = {
    deletedAt: null,
    ...(str("department")
      ? { position: { departmentId: str("department") } }
      : {}),
    ...(str("team") ? { teamId: str("team") } : {}),
  };

  const [shifts, schedules, departments, teams, planning, overrides] =
    await Promise.all([
      prisma.shift.findMany({ orderBy: { startTime: "asc" } }),
      prisma.workSchedule.findMany({
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        include: { _count: { select: { teams: true, employees: true } } },
      }),
      prisma.department.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.team.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      loadPlanning(days[0], days[13], where),
      prisma.employeeSchedule.findMany({
        where: { date: { gte: days[0], lte: days[13] } },
        select: { employeeId: true, date: true, kind: true },
      }),
    ]);
  const shiftByCode = new Map(shifts.map((s) => [s.code, s]));
  const hasOverride = new Set(
    overrides
      .filter((o) => o.kind !== "ON_CALL")
      .map((o) => `${o.employeeId}|${dayKey(o.date)}`),
  );
  const nav = (d: Date) =>
    `?${new URLSearchParams({ ...(str("department") ? { department: str("department") } : {}), ...(str("team") ? { team: str("team") } : {}), start: dayKey(d) })}`;
  const employees = [...planning.employees].sort(
    (a, b) =>
      (a.team?.name ?? "~").localeCompare(b.team?.name ?? "~") ||
      a.lastName.localeCompare(b.lastName),
  );

  return (
    <>
      <PageHeader
        icon={<Clock />}
        title="Horaires & plannings"
        description="Horaires standards, décalés, de nuit, rotations d'équipes et astreintes"
        actions={
          <>
            <ShiftDialog />
            <ScheduleDialog />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {shifts.map((s) => (
          <div
            key={s.id}
            className="card-hover flex items-center gap-4 rounded-2xl border bg-card p-4"
          >
            <span
              className="grid size-12 shrink-0 place-items-center rounded-xl text-lg font-extrabold text-white shadow-md"
              style={{ background: s.color }}
            >
              {s.code}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-bold">
                {s.name}{" "}
                {crossesMidnight(s) && (
                  <Moon className="size-4 text-indigo-500" />
                )}
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                {s.startTime} → {s.endTime}
                {crossesMidnight(s) ? " (J+1)" : ""} ·{" "}
                {fmtMinutes(shiftMinutes(s))}
              </p>
              <p className="text-xs text-muted-foreground">
                Tolérance {s.graceMinutes} min
              </p>
            </div>
            <ShiftDialog shift={s} />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {schedules.map((s) => (
          <Panel
            key={s.id}
            title={
              <span className="flex items-center gap-2">
                {s.name}{" "}
                {s.isDefault && (
                  <StatusBadge tone="brand">Par défaut</StatusBadge>
                )}
              </span>
            }
            description={`${SCHEDULE_CATEGORY[s.category]} · ${s.kind === "WEEKLY" ? "hebdomadaire" : `rotation de ${s.pattern.split(",").length} jours`} · ${s._count.teams} équipe(s), ${s._count.employees} agent(s) en individuel`}
            action={
              <div className="flex">
                {!s.isDefault && (
                  <ActionButton
                    variant="ghost"
                    size="icon-sm"
                    action={setDefaultScheduleAction.bind(null, s.id)}
                  >
                    <Star />
                  </ActionButton>
                )}
                <ScheduleDialog
                  schedule={{
                    ...s,
                    cycleStart: s.cycleStart ? dayKey(s.cycleStart) : "",
                  }}
                />
              </div>
            }
          >
            <div className="flex flex-wrap gap-1.5">
              {s.pattern.split(",").map((c, i) => {
                const sh = shiftByCode.get(c);
                return (
                  <div key={i} className="text-center">
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-lg text-xs font-bold",
                        sh ? "text-white" : "bg-stone-100 text-stone-400",
                      )}
                      style={sh ? { background: sh.color } : undefined}
                    >
                      {c}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {s.kind === "WEEKLY" ? WEEKDAYS[i] : `J${i + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
            {s.description && (
              <p className="mt-3 text-sm text-muted-foreground">
                {s.description}
              </p>
            )}
          </Panel>
        ))}
      </div>

      <Panel
        title="Grille de planning"
        description={`Du ${fmtDay(days[0])} au ${fmtDay(days[13])} · cliquez sur une case pour poser une dérogation (poste, repos, astreinte)`}
        action={
          <div className="flex gap-1">
            <Link
              href={nav(addDays(start, -7))}
              className={buttonVariants({
                variant: "outline",
                size: "icon-sm",
              })}
              aria-label="Semaine précédente"
            >
              <ChevronLeft />
            </Link>
            <Link
              href={nav(addDays(today, -weekdayIndex(today)))}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Aujourd&apos;hui
            </Link>
            <Link
              href={nav(addDays(start, 7))}
              className={buttonVariants({
                variant: "outline",
                size: "icon-sm",
              })}
              aria-label="Semaine suivante"
            >
              <ChevronRight />
            </Link>
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="border-b p-3">
          <FilterBar
            selects={[
              {
                name: "department",
                label: "Service",
                options: departments.map((d) => ({
                  value: d.id,
                  label: d.name,
                })),
              },
              {
                name: "team",
                label: "Équipe",
                options: teams.map((t) => ({ value: t.id, label: t.name })),
              },
            ]}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-separate border-spacing-1 p-3 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-56 bg-card text-left font-semibold text-muted-foreground">
                  Agent
                </th>
                {days.map((d) => {
                  const isToday = d.getTime() === today.getTime();
                  const holiday = planning.holidays.has(dayKey(d));
                  return (
                    <th
                      key={d.toISOString()}
                      className={cn(
                        "rounded-md py-1 font-semibold",
                        isToday
                          ? "bg-orange-500 text-white"
                          : holiday
                            ? "bg-amber-100 text-amber-800"
                            : weekdayIndex(d) >= 5
                              ? "bg-stone-100"
                              : "text-muted-foreground",
                      )}
                    >
                      {WEEKDAYS[weekdayIndex(d)]}
                      <span className="block text-[11px] font-bold">
                        {d.getUTCDate()}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td className="sticky left-0 z-10 bg-card pr-2">
                    <p className="truncate font-semibold">
                      {e.lastName} {e.firstName}
                    </p>
                    <ScheduleSelect
                      employeeId={e.id}
                      value={e.scheduleId ?? ""}
                      schedules={schedules.filter((s) => s.isActive)}
                      fallbackLabel={
                        e.team?.schedule
                          ? `Équipe : ${e.team.name}`
                          : "Planning par défaut"
                      }
                    />
                  </td>
                  {days.map((d) => {
                    const plan = planning.planOf(e, d);
                    const leave = planning.leaveOf(e.id, d);
                    return (
                      <td key={d.toISOString()}>
                        {leave ? (
                          <span
                            className="grid h-9 place-items-center rounded-md bg-sky-100 text-[10px] font-bold text-sky-700"
                            title="Congé validé"
                          >
                            CG
                          </span>
                        ) : (
                          <PlanningCell
                            employeeId={e.id}
                            date={dayKey(d)}
                            code={plan.shift?.code ?? null}
                            color={plan.shift?.color ?? null}
                            onCall={plan.onCall}
                            override={hasOverride.has(`${e.id}|${dayKey(d)}`)}
                            shifts={shifts
                              .filter((s) => s.isActive)
                              .map((s) => ({
                                id: s.id,
                                code: s.code,
                                name: s.name,
                                color: s.color,
                              }))}
                            title={`${e.firstName} ${e.lastName} · ${fmtDay(d)}`}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-4 border-t px-5 py-3 text-xs text-muted-foreground">
          {shifts.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5">
              <span
                className="size-3 rounded"
                style={{ background: s.color }}
              />
              {s.code} = {s.name}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-stone-100" />R = Repos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-sky-100" />
            CG = Congé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-500" />
            Astreinte
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded ring-2 ring-stone-900/70" />
            Dérogation
          </span>
        </div>
      </Panel>
    </>
  );
}

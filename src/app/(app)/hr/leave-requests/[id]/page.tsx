import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardCheck, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { fmtDay } from "@/lib/dates";
import { LEAVE_TYPE_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";
import { LeaveSummary, LeaveTimeline } from "@/components/leaves/leave-detail";
import { DecisionPanel } from "@/components/leaves/decision-panel";
import { leaveBalance } from "@/server/services/leaves";

export const metadata: Metadata = { title: "Instruction d'une demande" };

export default async function HrLeavePage({
  params,
}: PageProps<"/hr/leave-requests/[id]">) {
  const user = await requirePage("leaves.manage");
  const { id } = await params;
  const r = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      employee: { include: { position: { include: { department: true } } } },
      attachments: true,
      decisions: {
        include: { decidedBy: { select: { name: true } } },
        orderBy: { decidedAt: "asc" },
      },
    },
  });
  if (!r) notFound();
  const [balance, colleagues] = await Promise.all([
    leaveBalance(r.employeeId, r.startDate.getUTCFullYear()),
    // collègues du même service absents sur la même période : aide à la décision
    prisma.leaveRequest.findMany({
      where: {
        id: { not: r.id },
        status: "APPROVED",
        startDate: { lte: r.endDate },
        endDate: { gte: r.startDate },
        employee: {
          position: { departmentId: r.employee.position.departmentId },
        },
      },
      include: { employee: true },
    }),
  ]);
  const own = r.employeeId === user.employeeId;
  return (
    <>
      <PageHeader
        icon={<ClipboardCheck />}
        title="Instruction de la demande"
        description={`${LEAVE_TYPE_LABELS[r.type]} · réf. ${r.id.slice(-8).toUpperCase()}`}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel>
            <Link
              href={`/employees/${r.employee.id}`}
              className="flex items-center gap-4 hover:opacity-90"
            >
              <EmployeeAvatar
                firstName={r.employee.firstName}
                lastName={r.employee.lastName}
                photoKey={r.employee.photoKey}
                size="lg"
              />
              <div className="flex-1">
                <p className="text-lg font-bold">
                  {r.employee.firstName} {r.employee.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {r.employee.position.title} ·{" "}
                  {r.employee.position.department.name}
                </p>
                <p className="font-mono text-xs text-orange-700">
                  {r.employee.matricule}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-teal-700">
                  {balance.remaining} j
                </p>
                <p className="text-xs text-muted-foreground">
                  solde annuel restant
                </p>
              </div>
            </Link>
          </Panel>
          <LeaveSummary r={r} />
          {colleagues.length > 0 && (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
              <TriangleAlert className="size-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">
                  {colleagues.length} collègue(s) du service déjà absent(s) sur
                  cette période
                </p>
                <ul className="mt-1 text-amber-800">
                  {colleagues.map((c) => (
                    <li key={c.id}>
                      {c.employee.firstName} {c.employee.lastName} —{" "}
                      {fmtDay(c.startDate)} → {fmtDay(c.endDate)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-6">
          {r.status === "PENDING" && (
            <Panel
              title="Décision"
              description={
                own
                  ? undefined
                  : "Le refus doit obligatoirement être motivé (RG05)."
              }
            >
              {own ? (
                <p className="text-sm text-muted-foreground">
                  Vous ne pouvez pas statuer sur votre propre demande : un autre
                  gestionnaire RH doit la traiter.
                </p>
              ) : (
                <DecisionPanel id={r.id} />
              )}
            </Panel>
          )}
          <LeaveTimeline r={r} />
        </div>
      </div>
    </>
  );
}

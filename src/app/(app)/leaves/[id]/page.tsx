import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Ban } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { ActionButton } from "@/components/shared/action-button";
import { LeaveSummary, LeaveTimeline } from "@/components/leaves/leave-detail";
import { cancelLeaveAction } from "@/server/actions/leaves";

export const metadata: Metadata = { title: "Ma demande" };

export default async function MyLeavePage({
  params,
}: PageProps<"/leaves/[id]">) {
  const user = await requirePage("leaves.request");
  const { id } = await params;
  const r = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      attachments: true,
      decisions: {
        include: { decidedBy: { select: { name: true } } },
        orderBy: { decidedAt: "asc" },
      },
    },
  });
  // RG07 : uniquement ses propres demandes
  if (!r || r.employeeId !== user.employeeId) notFound();
  return (
    <>
      <PageHeader
        icon={<CalendarDays />}
        title="Ma demande"
        description={`Référence ${r.id.slice(-8).toUpperCase()}`}
        actions={
          r.status === "PENDING" && (
            <ActionButton
              variant="destructive"
              action={cancelLeaveAction.bind(null, r.id)}
              confirm={{
                title: "Annuler cette demande ?",
                description:
                  "La demande passera au statut « Annulée ». Cette action est définitive.",
                label: "Annuler la demande",
                destructive: true,
              }}
            >
              <Ban /> Annuler la demande
            </ActionButton>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <LeaveSummary r={r} />
        <LeaveTimeline r={r} />
      </div>
    </>
  );
}

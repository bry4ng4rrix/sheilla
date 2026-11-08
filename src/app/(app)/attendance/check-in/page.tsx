import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { requirePage } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TodayPunch } from "@/components/attendance/today-punch";

export const metadata: Metadata = { title: "Pointer mon entrée" };

export default async function CheckINPage() {
  const user = await requirePage("attendance.self");
  if (!user.employeeId)
    return (
      <EmptyState
        title="Compte non rattaché"
        description="Ce compte technique n'est associé à aucun dossier employé."
      />
    );
  return (
    <>
      <PageHeader
        icon={<Clock />}
        title="Pointer mon entrée"
        description="Le pointage est horodaté par le serveur (heure de Madagascar)."
      />
      <TodayPunch employeeId={user.employeeId} highlight="IN" />
    </>
  );
}

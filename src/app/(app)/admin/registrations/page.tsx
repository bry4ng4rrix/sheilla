import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Mail, UserPlus, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { fmtDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { RegistrationReview } from "@/components/admin/registration-review";
import { linkableEmployees } from "@/server/services/users";
import { cn } from "cn";

export const metadata: Metadata = { title: "Inscriptions" };

export default async function RegistrationsPage({ searchParams }: PageProps<"/admin/registrations">) {
  await requirePage("users.manage");
  const { tab } = await searchParams;
  const status = tab === "rejected" ? "REJECTED" : "PENDING";
  const [requests, pendingCount, rejectedCount, employees] = await Promise.all([
    prisma.user.findMany({ where: { approvalStatus: status }, orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" } }),
    prisma.user.count({ where: { approvalStatus: "PENDING" } }),
    prisma.user.count({ where: { approvalStatus: "REJECTED" } }),
    linkableEmployees(),
  ]);
  // dossiers dont le matricule correspond à celui déclaré, encore sans compte
  const matches = await prisma.employee.findMany({
    where: { matricule: { in: requests.map((r) => r.requestedMatricule ?? "").filter(Boolean) }, deletedAt: null, user: null },
    select: { id: true, matricule: true, firstName: true, lastName: true },
  });
  const matchOf = (m: string | null) => matches.find((e) => e.matricule === m) ?? null;
  const tabLink = (key: string, label: string, count: number) => (
    <Link href={key === "pending" ? "?" : `?tab=${key}`} className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold", (key === "rejected") === (status === "REJECTED") ? "bg-orange-500 text-white shadow-sm" : "text-muted-foreground hover:bg-stone-100")}>
      {label} <span className="rounded-full bg-black/10 px-1.5 text-xs">{count}</span>
    </Link>
  );

  return (
    <>
      <PageHeader icon={<UserPlus />} title="Inscriptions" description="Demandes d'accès des employés : validez-les en rattachant chaque compte à son dossier du personnel" />
      <div className="flex w-fit gap-1 rounded-xl border bg-card p-1.5">
        {tabLink("pending", "En attente", pendingCount)}
        {tabLink("rejected", "Refusées", rejectedCount)}
      </div>
      {requests.length === 0 ? (
        <EmptyState icon={<UserPlus />} title={status === "PENDING" ? "Aucune demande en attente" : "Aucune demande refusée"} description={status === "PENDING" ? "Les nouvelles demandes faites depuis la page « Demander un accès » apparaîtront ici." : undefined} />
      ) : (
        <ul className="space-y-3">
          {requests.map((r, i) => {
            const match = matchOf(r.requestedMatricule);
            return (
              <li key={r.id} className="rounded-2xl border bg-card p-5 animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 font-bold text-white">
                      {r.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold">{r.name}</p>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground"><Mail className="size-3.5" /> {r.email}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Demandé le {fmtDateTime(r.createdAt)}</span>
                        <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-stone-700">{r.requestedMatricule ?? "—"}</span>
                        {status === "PENDING" &&
                          (match ? (
                            <StatusBadge tone="success"><CheckCircle2 className="size-3" /> Dossier trouvé : {match.lastName} {match.firstName}</StatusBadge>
                          ) : (
                            <StatusBadge tone="warning">Aucun dossier libre avec ce matricule</StatusBadge>
                          ))}
                      </p>
                      {r.reviewNote && <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 p-2 text-sm text-red-800"><XCircle className="mt-0.5 size-4 shrink-0" /> {r.reviewNote}</p>}
                    </div>
                  </div>
                  {status === "PENDING" && <RegistrationReview id={r.id} name={r.name} suggestedEmployeeId={match?.id ?? null} employees={employees} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

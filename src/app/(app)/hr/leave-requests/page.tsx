import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ClipboardCheck, Paperclip } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { fmtDay, parseDay } from "@/lib/dates";
import { LEAVE_STATUS, LEAVE_TYPE_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { EnumBadge } from "@/components/shared/status-badge";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";
import { Pagination, pageFrom } from "@/components/shared/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "cn";

export const metadata: Metadata = { title: "Demandes de congé" };

export default async function HrLeavesPage({
  searchParams,
}: PageProps<"/hr/leave-requests">) {
  await requirePage("leaves.manage");
  const sp = await searchParams;
  const str = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : "";
  const q = str("q").trim();
  const safeDay = (v: string) => {
    try {
      return v ? parseDay(v) : null;
    } catch {
      return null;
    }
  };
  const from = safeDay(str("from"));
  const to = safeDay(str("to"));
  const where: Prisma.LeaveRequestWhereInput = {
    ...(str("status") ? { status: str("status") as never } : {}),
    ...(str("type") ? { type: str("type") as never } : {}),
    ...(str("department")
      ? { employee: { position: { departmentId: str("department") } } }
      : {}),
    ...(from ? { endDate: { gte: from } } : {}),
    ...(to ? { startDate: { lte: to } } : {}),
    ...(q
      ? {
          employee: {
            OR: [
              { lastName: { contains: q } },
              { firstName: { contains: q } },
              { matricule: { contains: q } },
            ],
          },
        }
      : {}),
  };
  const { page, skip, take } = pageFrom(sp, 15);
  const [total, requests, counts, departments] = await Promise.all([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
      where,
      skip,
      take,
      orderBy: [{ status: "desc" }, { createdAt: "desc" }],
      include: {
        employee: { include: { position: { include: { department: true } } } },
        _count: { select: { attachments: true } },
      },
    }),
    prisma.leaveRequest.groupBy({ by: ["status"], _count: true }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);
  const countOf = (s: string) =>
    counts.find((c) => c.status === s)?._count ?? 0;
  const tab = (s: string, label: string) => (
    <Link
      key={s}
      href={s ? `?status=${s}` : "?"}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
        str("status") === s
          ? "bg-orange-500 text-white shadow-sm"
          : "text-muted-foreground hover:bg-stone-100",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-xs",
          str("status") === s ? "bg-white/25" : "bg-stone-100",
        )}
      >
        {s ? countOf(s) : counts.reduce((x, c) => x + c._count, 0)}
      </span>
    </Link>
  );

  return (
    <>
      <PageHeader
        icon={<ClipboardCheck />}
        title="Demandes de congé"
        description="Instruction des demandes : validation ou refus motivé"
      />
      <div className="flex flex-wrap gap-1 rounded-xl border bg-card p-1.5">
        {tab("", "Toutes")}
        {tab("PENDING", "En attente")}
        {tab("APPROVED", "Validées")}
        {tab("REJECTED", "Refusées")}
        {tab("CANCELLED", "Annulées")}
      </div>
      <FilterBar
        searchPlaceholder="Nom, prénom ou matricule…"
        selects={[
          {
            name: "type",
            label: "Type",
            options: Object.entries(LEAVE_TYPE_LABELS).map(
              ([value, label]) => ({ value, label }),
            ),
          },
          {
            name: "department",
            label: "Service",
            options: departments.map((d) => ({ value: d.id, label: d.name })),
          },
        ]}
        dates={[
          { name: "from", label: "Du" },
          { name: "to", label: "au" },
        ]}
      />
      {requests.length === 0 ? (
        <EmptyState
          title="Aucune demande"
          description="Aucune demande ne correspond à ces critères."
          icon={<ClipboardCheck />}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50/80">
                <TableHead className="pl-5">Agent</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Période</TableHead>
                <TableHead className="text-center">Durée</TableHead>
                <TableHead className="hidden lg:table-cell">Reçue le</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow
                  key={r.id}
                  className={cn(r.status === "PENDING" && "bg-amber-50/30")}
                >
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-3">
                      <EmployeeAvatar
                        firstName={r.employee.firstName}
                        lastName={r.employee.lastName}
                        photoKey={r.employee.photoKey}
                        size="sm"
                      />
                      <div>
                        <p className="font-semibold">
                          {r.employee.firstName} {r.employee.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.employee.position.department.name}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {LEAVE_TYPE_LABELS[r.type]}
                    {r._count.attachments > 0 && (
                      <Paperclip
                        className="ml-1 inline size-3.5 text-orange-500"
                        aria-label="Justificatif joint"
                      />
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {fmtDay(r.startDate)} → {fmtDay(r.endDate)}
                  </TableCell>
                  <TableCell className="text-center font-bold">
                    {r.days} j
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {fmtDay(r.createdAt)}
                  </TableCell>
                  <TableCell>
                    <EnumBadge map={LEAVE_STATUS} value={r.status} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Link
                      href={`/hr/leave-requests/${r.id}`}
                      className={cn(
                        "text-sm font-semibold",
                        r.status === "PENDING"
                          ? "text-orange-600"
                          : "text-muted-foreground",
                      )}
                    >
                      {r.status === "PENDING" ? "Traiter →" : "Voir"}
                    </Link>
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

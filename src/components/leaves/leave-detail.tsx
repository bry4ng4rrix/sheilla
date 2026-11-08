import {
  CheckCircle2,
  Clock,
  FileText,
  Send,
  XCircle,
  Ban,
} from "lucide-react";
import type {
  LeaveAttachment,
  LeaveDecision,
  LeaveRequest,
  User,
} from "@prisma/client";
import { fmtDateTime, fmtDay } from "@/lib/dates";
import { LEAVE_STATUS, LEAVE_TYPE_LABELS } from "@/lib/labels";
import { EnumBadge } from "@/components/shared/status-badge";
import { Panel } from "@/components/shared/panel";

type Full = LeaveRequest & {
  attachments: LeaveAttachment[];
  decisions: (LeaveDecision & { decidedBy: Pick<User, "name"> })[];
};

export function LeaveSummary({ r }: { r: Full }) {
  return (
    <Panel
      title={LEAVE_TYPE_LABELS[r.type]}
      action={<EnumBadge map={LEAVE_STATUS} value={r.status} />}
    >
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-orange-50 p-4 text-center">
          <p className="text-xs text-orange-800/70">Du</p>
          <p className="font-bold">{fmtDay(r.startDate)}</p>
        </div>
        <div className="rounded-xl bg-orange-50 p-4 text-center">
          <p className="text-xs text-orange-800/70">Au</p>
          <p className="font-bold">{fmtDay(r.endDate)}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-4 text-center text-white">
          <p className="text-xs text-orange-100">Durée</p>
          <p className="text-xl font-extrabold">{r.days} j</p>
        </div>
      </div>
      <div className="mt-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase">
          Motif
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm">{r.reason}</p>
      </div>
      {r.attachments.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Justificatifs
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {r.attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={`/api/files/${a.fileKey}`}
                  className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:border-orange-300 hover:bg-orange-50"
                >
                  <FileText className="size-4 text-orange-500" />{" "}
                  {a.originalName}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({Math.round(a.size / 1024)} Ko)
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

export function LeaveTimeline({ r }: { r: Full }) {
  const steps = [
    {
      icon: <Send />,
      color: "bg-orange-500",
      title: "Demande soumise",
      date: r.createdAt,
      text: null as string | null,
    },
    ...r.decisions.map((d) => ({
      icon: d.decision === "APPROVED" ? <CheckCircle2 /> : <XCircle />,
      color: d.decision === "APPROVED" ? "bg-emerald-500" : "bg-red-500",
      title: `${d.decision === "APPROVED" ? "Validée" : "Refusée"} par ${d.decidedBy.name}`,
      date: d.decidedAt,
      text: d.comment,
    })),
    ...(r.status === "CANCELLED"
      ? [
          {
            icon: <Ban />,
            color: "bg-stone-400",
            title: "Annulée par l'agent",
            date: r.cancelledAt ?? r.updatedAt,
            text: null,
          },
        ]
      : []),
    ...(r.status === "PENDING"
      ? [
          {
            icon: <Clock />,
            color: "bg-amber-400",
            title: "En attente de décision RH",
            date: null,
            text: "Aucun droit d'absence tant que la demande n'est pas validée.",
          },
        ]
      : []),
  ];
  return (
    <Panel title="Historique">
      <ol className="space-y-5">
        {steps.map((s, i) => (
          <li key={i} className="relative flex gap-3">
            {i < steps.length - 1 && (
              <span className="absolute top-9 bottom-[-20px] left-[17px] w-0.5 bg-stone-100" />
            )}
            <span
              className={`relative grid size-9 shrink-0 place-items-center rounded-full text-white shadow-sm [&_svg]:size-4 ${s.color}`}
            >
              {s.icon}
            </span>
            <div>
              <p className="text-sm font-semibold">{s.title}</p>
              {s.date && (
                <p className="text-xs text-muted-foreground">
                  {fmtDateTime(s.date)}
                </p>
              )}
              {s.text && (
                <p className="mt-1 rounded-lg bg-stone-50 p-2 text-sm">
                  {s.text}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

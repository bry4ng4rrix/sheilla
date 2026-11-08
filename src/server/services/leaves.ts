import "server-only";
import type { LeaveType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit, notify, usersWithRole } from "@/lib/audit";
import { AppError, ForbiddenError } from "@/lib/errors";
import { localDay, parseDay } from "@/lib/dates";
import { storage } from "@/lib/storage";
import { LEAVE_TYPE_LABELS } from "@/lib/labels";
import { countLeaveDays } from "./leave-rules";
import { getCalendar, getSettings } from "./settings";

export async function leaveBalance(
  employeeId: string,
  year = localDay().getUTCFullYear(),
) {
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year, 11, 31));
  const [settings, taken, pending] = await Promise.all([
    getSettings(),
    prisma.leaveRequest.aggregate({
      where: {
        employeeId,
        type: "ANNUAL",
        status: "APPROVED",
        startDate: { gte: from, lte: to },
      },
      _sum: { days: true },
    }),
    prisma.leaveRequest.aggregate({
      where: {
        employeeId,
        type: "ANNUAL",
        status: "PENDING",
        startDate: { gte: from, lte: to },
      },
      _sum: { days: true },
    }),
  ]);
  const entitlement = Number(settings["leave.annualDays"]);
  const used = taken._sum.days ?? 0;
  return {
    entitlement,
    used,
    pending: pending._sum.days ?? 0,
    remaining: entitlement - used,
  };
}

export async function previewDays(type: LeaveType, start: string, end: string) {
  const s = parseDay(start);
  const e = parseDay(end);
  return countLeaveDays(type, s, e, await getCalendar(s, e));
}

export async function submitLeave(params: {
  employeeId: string;
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  files: File[];
}) {
  const start = parseDay(params.startDate);
  const end = parseDay(params.endDate);
  if (end < start)
    throw new AppError(
      "La date de fin doit être postérieure ou égale à la date de début.",
    );
  const days = countLeaveDays(
    params.type,
    start,
    end,
    await getCalendar(start, end),
  );
  if (days <= 0)
    throw new AppError("La période ne contient aucun jour ouvrable.");

  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: params.employeeId,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (overlap)
    throw new AppError(
      "Cette période chevauche une demande déjà en attente ou validée.",
    );

  if (params.type === "ANNUAL") {
    const b = await leaveBalance(params.employeeId, start.getUTCFullYear());
    if (days > b.remaining - b.pending)
      throw new AppError(
        `Solde insuffisant : ${b.remaining - b.pending} jour(s) disponible(s).`,
      );
  }
  if (params.type === "SICK" && params.files.length === 0)
    throw new AppError(
      "Un certificat médical est requis pour un congé maladie.",
    );

  const saved: Awaited<ReturnType<typeof storage.save>>[] = [];
  for (const f of params.files.slice(0, 3))
    saved.push(await storage.save("leave-attachments", f));

  try {
    const request = await prisma.$transaction(async (tx) => {
      const r = await tx.leaveRequest.create({
        data: {
          employeeId: params.employeeId,
          type: params.type,
          startDate: start,
          endDate: end,
          days,
          reason: params.reason,
          attachments: {
            create: saved.map((s) => ({
              fileKey: s.key,
              originalName: s.originalName,
              mimeType: s.mimeType,
              size: s.size,
            })),
          },
        },
        include: { employee: true },
      });
      await notify(
        await usersWithRole(["HR"], tx),
        {
          title: "Nouvelle demande de congé",
          message: `${r.employee.firstName} ${r.employee.lastName} — ${LEAVE_TYPE_LABELS[r.type]} (${days} j)`,
          link: `/hr/leave-requests/${r.id}`,
        },
        tx,
      );
      await audit(
        {
          userId: params.userId,
          action: "leave.submit",
          entity: "LeaveRequest",
          entityId: r.id,
          after: {
            type: r.type,
            startDate: params.startDate,
            endDate: params.endDate,
            days,
          },
        },
        tx,
      );
      return r;
    });
    return request;
  } catch (e) {
    await Promise.all(saved.map((s) => storage.remove(s.key)));
    throw e;
  }
}

export async function cancelLeave(
  id: string,
  employeeId: string,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const res = await tx.leaveRequest.updateMany({
      where: { id, employeeId, status: "PENDING" },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (res.count !== 1)
      throw new AppError("Seule une demande en attente peut être annulée.");
    await audit(
      { userId, action: "leave.cancel", entity: "LeaveRequest", entityId: id },
      tx,
    );
  });
}

/** Décision RH (BF06) : transition atomique PENDING → APPROVED/REJECTED, motif obligatoire pour un refus (RG05). */
export async function decideLeave(params: {
  id: string;
  decision: "APPROVED" | "REJECTED";
  comment: string | null;
  actor: { id: string; employeeId: string | null };
}) {
  if (
    params.decision === "REJECTED" &&
    (!params.comment || params.comment.trim().length < 5)
  ) {
    throw new AppError("Un motif de refus est obligatoire (RG05).");
  }
  return prisma.$transaction(async (tx) => {
    const request = await tx.leaveRequest.findUnique({
      where: { id: params.id },
      include: { employee: { include: { user: true } } },
    });
    if (!request) throw new AppError("Demande introuvable.", 404);
    if (request.employeeId === params.actor.employeeId)
      throw new ForbiddenError(
        "Vous ne pouvez pas statuer sur votre propre demande.",
      );

    if (params.decision === "APPROVED") {
      const conflict = await tx.leaveRequest.findFirst({
        where: {
          id: { not: request.id },
          employeeId: request.employeeId,
          status: "APPROVED",
          startDate: { lte: request.endDate },
          endDate: { gte: request.startDate },
        },
      });
      if (conflict)
        throw new AppError("Un congé validé chevauche déjà cette période.");
    }

    const res = await tx.leaveRequest.updateMany({
      where: { id: request.id, status: "PENDING" },
      data: { status: params.decision },
    });
    if (res.count !== 1)
      throw new AppError("Cette demande a déjà été traitée.");
    await tx.leaveDecision.create({
      data: {
        leaveRequestId: request.id,
        decision: params.decision,
        comment: params.comment,
        decidedById: params.actor.id,
      },
    });

    if (request.employee.user) {
      const approved = params.decision === "APPROVED";
      await notify(
        [request.employee.user.id],
        {
          title: approved
            ? "Demande de congé validée"
            : "Demande de congé refusée",
          message: `${LEAVE_TYPE_LABELS[request.type]} du ${request.startDate.toLocaleDateString("fr-FR", { timeZone: "UTC" })}${approved ? "" : ` — Motif : ${params.comment}`}`,
          link: `/leaves/${request.id}`,
        },
        tx,
      );
    }
    await audit(
      {
        userId: params.actor.id,
        action:
          params.decision === "APPROVED" ? "leave.approve" : "leave.reject",
        entity: "LeaveRequest",
        entityId: request.id,
        before: { status: "PENDING" },
        after: { status: params.decision, comment: params.comment },
      },
      tx,
    );
  });
}

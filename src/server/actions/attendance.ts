"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { AppError, runAction } from "@/lib/errors";
import { fromLocalInput, parseDay } from "@/lib/dates";
import { requireEmployeeId, requireUser } from "@/lib/session";
import {
  correctionSchema,
  formToObject,
  overrideSchema,
  scheduleSchema,
  shiftSchema,
} from "@/lib/validations";
import { correctDay, punch } from "@/server/services/attendance";

const refresh = () => {
  revalidatePath("/attendance", "layout");
  revalidatePath("/dashboard");
};

export async function selfPunchAction(type: "IN" | "OUT") {
  return runAction(
    async () => {
      const user = await requireUser("attendance.self");
      await punch({
        employeeId: requireEmployeeId(user),
        type,
        source: "SELF",
        actorId: user.id,
      });
      refresh();
    },
    type === "IN" ? "Entrée enregistrée." : "Sortie enregistrée.",
  );
}

export async function correctDayAction(form: FormData) {
  return runAction(async () => {
    const user = await requireUser("attendance.manage");
    const d = correctionSchema.parse(formToObject(form));
    await correctDay({
      employeeId: d.employeeId,
      day: parseDay(d.date),
      checkIn: d.checkIn ? fromLocalInput(d.checkIn) : null,
      checkOut: d.checkOut ? fromLocalInput(d.checkOut) : null,
      manualStatus: d.manualStatus,
      note: d.note,
      actorId: user.id,
    });
    refresh();
  }, "Journée corrigée et journalisée.");
}

export async function saveShiftAction(id: string | null, form: FormData) {
  return runAction(async () => {
    const user = await requireUser("attendance.manage");
    const data = shiftSchema.parse(formToObject(form));
    const s = id
      ? await prisma.shift.update({ where: { id }, data })
      : await prisma.shift.create({ data });
    await audit({
      userId: user.id,
      action: id ? "shift.update" : "shift.create",
      entity: "Shift",
      entityId: s.id,
      after: data,
    });
    refresh();
  }, "Poste horaire enregistré.");
}

export async function saveScheduleAction(id: string | null, form: FormData) {
  return runAction(async () => {
    const user = await requireUser("attendance.manage");
    const data = scheduleSchema.parse(formToObject(form));
    const codes = new Set(
      (await prisma.shift.findMany({ select: { code: true } })).map(
        (s) => s.code,
      ),
    );
    const unknown = data.pattern
      .split(",")
      .filter((c) => c !== "R" && !codes.has(c));
    if (unknown.length)
      throw new AppError(`Codes de poste inconnus : ${unknown.join(", ")}`);
    const payload = {
      ...data,
      cycleStart: data.cycleStart ? parseDay(data.cycleStart) : null,
    };
    const s = id
      ? await prisma.workSchedule.update({ where: { id }, data: payload })
      : await prisma.workSchedule.create({ data: payload });
    await audit({
      userId: user.id,
      action: id ? "schedule.update" : "schedule.create",
      entity: "WorkSchedule",
      entityId: s.id,
      after: data,
    });
    refresh();
  }, "Planning enregistré.");
}

export async function setDefaultScheduleAction(id: string) {
  return runAction(async () => {
    const user = await requireUser("attendance.manage");
    await prisma.$transaction([
      prisma.workSchedule.updateMany({ data: { isDefault: false } }),
      prisma.workSchedule.update({ where: { id }, data: { isDefault: true } }),
    ]);
    await audit({
      userId: user.id,
      action: "schedule.set_default",
      entity: "WorkSchedule",
      entityId: id,
    });
    refresh();
  }, "Planning par défaut modifié.");
}

export async function assignScheduleAction(
  employeeId: string,
  scheduleId: string | null,
) {
  return runAction(async () => {
    const user = await requireUser("attendance.manage");
    await prisma.employee.update({
      where: { id: employeeId },
      data: { scheduleId },
    });
    await audit({
      userId: user.id,
      action: "employee.schedule_assign",
      entity: "Employee",
      entityId: employeeId,
      after: { scheduleId },
    });
    refresh();
  }, "Planning individuel mis à jour.");
}

/** Dérogation ponctuelle au planning : poste précis, repos ou astreinte. */
export async function setOverrideAction(form: FormData) {
  return runAction(async () => {
    const user = await requireUser("attendance.manage");
    const d = overrideSchema.parse(formToObject(form));
    const date = parseDay(d.date);
    await prisma.$transaction(async (tx) => {
      if (d.kind === "CLEAR") {
        await tx.employeeSchedule.deleteMany({
          where: { employeeId: d.employeeId, date },
        });
      } else if (d.kind === "ON_CALL") {
        await tx.employeeSchedule.upsert({
          where: {
            employeeId_date_kind: {
              employeeId: d.employeeId,
              date,
              kind: "ON_CALL",
            },
          },
          create: {
            employeeId: d.employeeId,
            date,
            kind: "ON_CALL",
            note: d.note,
          },
          update: { note: d.note },
        });
      } else {
        if (d.kind === "SHIFT" && !d.shiftId)
          throw new AppError("Choisissez un poste.");
        await tx.employeeSchedule.deleteMany({
          where: {
            employeeId: d.employeeId,
            date,
            kind: { in: ["SHIFT", "REST"] },
          },
        });
        await tx.employeeSchedule.create({
          data: {
            employeeId: d.employeeId,
            date,
            kind: d.kind,
            shiftId: d.kind === "SHIFT" ? d.shiftId : null,
            note: d.note,
          },
        });
      }
      await audit(
        {
          userId: user.id,
          action: "schedule.override",
          entity: "Employee",
          entityId: d.employeeId,
          after: d,
        },
        tx,
      );
    });
    refresh();
  }, "Planning du jour mis à jour.");
}

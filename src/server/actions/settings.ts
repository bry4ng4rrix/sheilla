"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/errors";
import { parseDay } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { formToObject, holidaySchema, settingsSchema } from "@/lib/validations";
import { getSettings } from "@/server/services/settings";

export async function saveSettingsAction(form: FormData) {
  return runAction(async () => {
    const user = await requireUser("settings.manage");
    const data = settingsSchema.parse({
      ...formToObject(form),
      "leave.workingDays": form.getAll("leave.workingDays").join(","),
    });
    const before = await getSettings();
    await prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(data)) {
        await tx.systemSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
      }
      await audit(
        {
          userId: user.id,
          action: "settings.update",
          entity: "SystemSetting",
          before,
          after: data,
        },
        tx,
      );
    });
    revalidatePath("/settings");
  }, "Paramètres enregistrés.");
}

export async function addHolidayAction(form: FormData) {
  return runAction(async () => {
    const user = await requireUser("holidays.manage");
    const d = holidaySchema.parse(formToObject(form));
    const h = await prisma.holiday.create({
      data: { date: parseDay(d.date), name: d.name },
    });
    await audit({
      userId: user.id,
      action: "holiday.create",
      entity: "Holiday",
      entityId: h.id,
      after: d,
    });
    revalidatePath("/settings");
  }, "Jour férié ajouté.");
}

export async function deleteHolidayAction(id: string) {
  return runAction(async () => {
    const user = await requireUser("holidays.manage");
    const h = await prisma.holiday.delete({ where: { id } });
    await audit({
      userId: user.id,
      action: "holiday.delete",
      entity: "Holiday",
      entityId: id,
      before: { date: h.date, name: h.name },
    });
    revalidatePath("/settings");
  }, "Jour férié supprimé.");
}

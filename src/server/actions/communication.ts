"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit, notify } from "@/lib/audit";
import { runAction } from "@/lib/errors";
import { parseDay } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { fileFrom, storage } from "@/lib/storage";
import { announcementSchema, formToObject } from "@/lib/validations";

export async function saveAnnouncementAction(
  id: string | null,
  form: FormData,
) {
  return runAction(async () => {
    const user = await requireUser("announcements.manage");
    const d = announcementSchema.parse(formToObject(form));
    const image = fileFrom(form, "image");
    const saved = image ? await storage.save("announcements", image) : null;
    const before = id
      ? await prisma.announcement.findUniqueOrThrow({
          where: { id },
          include: { attachments: true },
        })
      : null;
    const firstPublish =
      d.status === "PUBLISHED" && before?.status !== "PUBLISHED";
    const data = {
      title: d.title,
      type: d.type,
      content: d.content,
      status: d.status,
      expiresAt: d.expiresAt ? parseDay(d.expiresAt) : null,
      ...(firstPublish ? { publishedAt: new Date() } : {}),
    };
    const a = await prisma.$transaction(async (tx) => {
      const a = before
        ? await tx.announcement.update({ where: { id: before.id }, data })
        : await tx.announcement.create({
            data: { ...data, authorId: user.id },
          });
      if (saved) {
        await tx.announcementAttachment.deleteMany({
          where: { announcementId: a.id },
        });
        await tx.announcementAttachment.create({
          data: {
            announcementId: a.id,
            fileKey: saved.key,
            originalName: saved.originalName,
            mimeType: saved.mimeType,
            size: saved.size,
          },
        });
      }
      if (firstPublish) {
        const recipients = await tx.user.findMany({
          where: { isActive: true, id: { not: user.id } },
          select: { id: true },
        });
        await notify(
          recipients.map((r) => r.id),
          {
            title:
              d.type === "URGENT"
                ? "⚠ Information urgente"
                : "Nouvelle annonce",
            message: d.title,
            link: `/announcements/${a.id}`,
          },
          tx,
        );
      }
      await audit(
        {
          userId: user.id,
          action: before ? "announcement.update" : "announcement.create",
          entity: "Announcement",
          entityId: a.id,
          after: { title: d.title, status: d.status },
        },
        tx,
      );
      return a;
    });
    if (saved)
      for (const old of before?.attachments ?? [])
        await storage.remove(old.fileKey);
    revalidatePath("/announcements");
    revalidatePath(`/announcements/${a.id}`);
    return { id: a.id };
  }, "Annonce enregistrée.");
}

export async function markNotificationReadAction(id: string) {
  return runAction(async () => {
    const user = await requireUser();
    await prisma.notification.updateMany({
      where: { id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/notifications");
  });
}

export async function markAllNotificationsReadAction() {
  return runAction(async () => {
    const user = await requireUser();
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/", "layout");
  }, "Toutes les notifications sont lues.");
}

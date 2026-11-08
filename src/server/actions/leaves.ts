"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/errors";
import { requireEmployeeId, requireUser } from "@/lib/session";
import {
  decisionSchema,
  formToObject,
  leaveSchema,
  LEAVE_TYPES,
} from "@/lib/validations";
import {
  cancelLeave,
  decideLeave,
  previewDays,
  submitLeave,
} from "@/server/services/leaves";

const refresh = () => {
  revalidatePath("/leaves");
  revalidatePath("/hr/leave-requests");
  revalidatePath("/dashboard");
};

export async function submitLeaveAction(form: FormData) {
  return runAction(async () => {
    const user = await requireUser("leaves.request");
    const employeeId = requireEmployeeId(user);
    const data = leaveSchema.parse(formToObject(form));
    const files = form
      .getAll("attachments")
      .filter((f): f is File => f instanceof File && f.size > 0);
    const r = await submitLeave({
      ...data,
      employeeId,
      userId: user.id,
      files,
    });
    refresh();
    return { id: r.id };
  }, "Demande envoyée. Elle reste en attente de décision RH.");
}

export async function previewLeaveDaysAction(
  type: string,
  start: string,
  end: string,
) {
  await requireUser("leaves.request");
  if (
    !LEAVE_TYPES.includes(type as (typeof LEAVE_TYPES)[number]) ||
    !start ||
    !end ||
    end < start
  )
    return 0;
  return previewDays(type as (typeof LEAVE_TYPES)[number], start, end);
}

export async function cancelLeaveAction(id: string) {
  return runAction(async () => {
    const user = await requireUser("leaves.request");
    await cancelLeave(id, requireEmployeeId(user), user.id);
    refresh();
    revalidatePath(`/leaves/${id}`);
  }, "Demande annulée.");
}

export async function decideLeaveAction(id: string, form: FormData) {
  return runAction(async () => {
    const user = await requireUser("leaves.manage");
    const data = decisionSchema.parse(formToObject(form));
    await decideLeave({
      id,
      ...data,
      actor: { id: user.id, employeeId: user.employeeId },
    });
    refresh();
    revalidatePath(`/hr/leave-requests/${id}`);
  }, "Décision enregistrée et employé notifié.");
}

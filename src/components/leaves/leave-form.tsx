"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Loader2, Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  ActionFormProvider,
  FormField,
  useActionForm,
} from "@/components/shared/form";
import { leaveSchema } from "@/lib/validations";
import { LEAVE_TYPE_LABELS } from "@/lib/labels";
import {
  previewLeaveDaysAction,
  submitLeaveAction,
} from "@/server/actions/leaves";

export function LeaveForm({ available }: { available: number }) {
  const router = useRouter();
  const [days, setDays] = useState<number | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const { form, ref, onSubmit, pending } = useActionForm({
    schema: leaveSchema,
    defaultValues: { type: "ANNUAL", startDate: "", endDate: "", reason: "" },
    action: submitLeaveAction,
    onSuccess: (d) => router.push(`/leaves/${(d as { id: string }).id}`),
  });
  const [type, start, end] = form.watch(["type", "startDate", "endDate"]);

  const validRange = !!start && !!end && end >= start;
  useEffect(() => {
    if (!validRange) return;
    let live = true;
    previewLeaveDaysAction(type, start, end).then((n) => live && setDays(n));
    return () => {
      live = false;
    };
  }, [type, start, end, validRange]);
  const shown = validRange ? days : null;

  const over = type === "ANNUAL" && shown !== null && shown > available;

  return (
    <ActionFormProvider form={form}>
      <form ref={ref} onSubmit={onSubmit} noValidate className="space-y-5">
        <FormField name="type" label="Type de demande" required>
          <NativeSelect
            id="type"
            className="w-full [&_select]:h-10"
            {...form.register("type")}
          >
            {Object.entries(LEAVE_TYPE_LABELS).map(([v, l]) => (
              <NativeSelectOption key={v} value={v}>
                {l}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField name="startDate" label="Date de début" required>
            <Input
              id="startDate"
              type="date"
              className="h-10"
              {...form.register("startDate")}
            />
          </FormField>
          <FormField name="endDate" label="Date de fin" required>
            <Input
              id="endDate"
              type="date"
              className="h-10"
              min={start}
              {...form.register("endDate")}
            />
          </FormField>
        </div>
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 ${over ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50/60"}`}
        >
          <span className="grid size-10 place-items-center rounded-lg bg-white text-orange-600 shadow-sm">
            <CalendarRange className="size-5" />
          </span>
          <div className="text-sm">
            <p className="font-bold">
              {shown === null
                ? "Durée calculée automatiquement"
                : `${shown} jour${shown > 1 ? "s" : ""} décompté${shown > 1 ? "s" : ""}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {type === "SICK" || type === "MATERNITY" || type === "PATERNITY"
                ? "Jours calendaires."
                : "Jours ouvrables, hors week-ends et jours fériés."}
              {type === "ANNUAL" && ` Solde disponible : ${available} j.`}
              {over && (
                <span className="font-semibold text-red-700">
                  {" "}
                  Solde insuffisant.
                </span>
              )}
            </p>
          </div>
        </div>
        <FormField
          name="reason"
          label="Motif"
          required
          hint="Obligatoire (RG03)."
        >
          <Textarea
            id="reason"
            rows={4}
            placeholder="Précisez le motif de votre demande…"
            {...form.register("reason")}
          />
        </FormField>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-stone-700">
            Justificatifs{" "}
            {type === "SICK" && (
              <span className="text-orange-600">* (certificat médical)</span>
            )}
          </p>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-stone-200 p-4 text-sm hover:border-orange-300 hover:bg-orange-50/40">
            <Paperclip className="size-5 text-orange-500" />
            <span className="text-muted-foreground">
              {files.length
                ? files.join(", ")
                : "PDF, JPG ou PNG · 3 fichiers max, 5 Mo chacun"}
            </span>
            <input
              type="file"
              name="attachments"
              multiple
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) =>
                setFiles([...(e.target.files ?? [])].map((f) => f.name))
              }
            />
          </label>
        </div>
        <div className="rounded-lg bg-stone-50 p-3 text-xs text-muted-foreground">
          Une demande en attente ne vaut pas autorisation d&apos;absence (RG04)
          : attendez la décision du service RH.
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.back()}
          >
            Annuler
          </Button>
          <Button type="submit" size="lg" disabled={pending || over}>
            {pending ? <Loader2 className="animate-spin" /> : <Send />} Envoyer
            la demande
          </Button>
        </div>
      </form>
    </ActionFormProvider>
  );
}

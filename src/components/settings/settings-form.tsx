"use client";

import { Loader2, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ActionFormProvider,
  FormField,
  useActionForm,
} from "@/components/shared/form";
import { holidaySchema } from "@/lib/validations";
import { WEEKDAYS } from "@/lib/labels";
import {
  addHolidayAction,
  saveSettingsAction,
} from "@/server/actions/settings";

/** Clés à points ("leave.annualDays") : formulaire non contrôlé, validé côté serveur par settingsSchema. */
export function SettingsForm({ values }: { values: Record<string, string> }) {
  const [pending, start] = useTransition();
  const working = new Set(values["leave.workingDays"].split(","));
  const field = (key: string, label: string, type = "text") => (
    <FormField name={key} label={label}>
      <Input
        id={key}
        name={key}
        type={type}
        defaultValue={values[key]}
        required
      />
    </FormField>
  );
  return (
    <form
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          const r = await saveSettingsAction(fd);
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
        })
      }
    >
      {field("company.name", "Nom de l'organisation (en-tête des rapports)")}
      <div className="grid gap-4 sm:grid-cols-3">
        {field("leave.annualDays", "Droit annuel (jours)", "number")}
        {field(
          "attendance.overtimeThreshold",
          "Seuil de dépassement (min)",
          "number",
        )}
        {field(
          "attendance.missingCheckoutGrace",
          "Délai « sortie manquante » (min)",
          "number",
        )}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-stone-700">
          Jours ouvrables (calcul des congés)
        </legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d, i) => (
            <label
              key={d}
              className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50"
            >
              <input
                type="checkbox"
                name="leave.workingDays"
                value={i}
                defaultChecked={working.has(String(i))}
                className="accent-orange-600"
              />{" "}
              {d}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}{" "}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

export function HolidayForm() {
  const router = useRouter();
  const { form, ref, onSubmit, pending } = useActionForm({
    schema: holidaySchema,
    defaultValues: { date: "", name: "" },
    action: addHolidayAction,
    onSuccess: () => {
      form.reset();
      router.refresh();
    },
  });
  return (
    <ActionFormProvider form={form}>
      <form
        ref={ref}
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <FormField name="date" label="Date">
          <Input id="date" type="date" {...form.register("date")} />
        </FormField>
        <FormField name="name" label="Libellé" className="flex-1 space-y-1.5">
          <Input
            id="name"
            placeholder="Ex. : Fête de l'Indépendance"
            {...form.register("name")}
          />
        </FormField>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Ajouter
        </Button>
      </form>
    </ActionFormProvider>
  );
}

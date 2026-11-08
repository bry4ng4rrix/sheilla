"use client";

import { Pencil, Plus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form";
import {
  correctionSchema,
  scheduleSchema,
  shiftSchema,
} from "@/lib/validations";
import { SCHEDULE_CATEGORY } from "@/lib/labels";
import {
  correctDayAction,
  saveScheduleAction,
  saveShiftAction,
} from "@/server/actions/attendance";

export function CorrectionDialog({
  employeeId,
  employeeName,
  date,
  dateLabel,
  checkIn,
  checkOut,
  label = "Traiter",
}: {
  employeeId: string;
  employeeName: string;
  date: string;
  dateLabel: string;
  checkIn: string;
  checkOut: string;
  label?: string;
}) {
  return (
    <FormDialog
      trigger={
        <Button size="sm" variant="outline">
          <Wrench /> {label}
        </Button>
      }
      title={`${employeeName} — ${dateLabel}`}
      description="Saisie ou correction administrative. Les anciennes valeurs sont conservées dans le journal d'audit."
      schema={correctionSchema}
      defaultValues={{
        employeeId,
        date,
        checkIn,
        checkOut,
        manualStatus: "",
        note: "",
      }}
      action={correctDayAction}
    >
      {({ register }) => (
        <>
          <input type="hidden" {...register("employeeId")} />
          <input type="hidden" {...register("date")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField name="checkIn" label="Entrée">
              <Input
                id="checkIn"
                type="datetime-local"
                {...register("checkIn")}
              />
            </FormField>
            <FormField name="checkOut" label="Sortie">
              <Input
                id="checkOut"
                type="datetime-local"
                {...register("checkOut")}
              />
            </FormField>
          </div>
          <FormField
            name="manualStatus"
            label="Statut retenu"
            hint="Laisser « Calcul automatique » pour appliquer le planning."
          >
            <NativeSelect
              id="manualStatus"
              className="w-full"
              {...register("manualStatus")}
            >
              <NativeSelectOption value="">
                Calcul automatique
              </NativeSelectOption>
              <NativeSelectOption value="PRESENT">
                Présent (retard justifié)
              </NativeSelectOption>
              <NativeSelectOption value="AUTHORIZED">
                Absence autorisée / justifiée
              </NativeSelectOption>
              <NativeSelectOption value="ABSENT">
                Absence injustifiée confirmée
              </NativeSelectOption>
              <NativeSelectOption value="LATE">
                Retard confirmé
              </NativeSelectOption>
            </NativeSelect>
          </FormField>
          <FormField name="note" label="Observation" required>
            <Textarea
              id="note"
              rows={3}
              placeholder="Ex. : oubli de pointage confirmé par le chef de quart"
              {...register("note")}
            />
          </FormField>
        </>
      )}
    </FormDialog>
  );
}

type Shift = {
  id: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  color: string;
};

export function ShiftDialog({ shift }: { shift?: Shift }) {
  return (
    <FormDialog
      trigger={
        shift ? (
          <Button variant="ghost" size="icon-sm" aria-label="Modifier">
            <Pencil />
          </Button>
        ) : (
          <Button variant="outline">
            <Plus /> Poste horaire
          </Button>
        )
      }
      title={shift ? `Poste ${shift.code}` : "Nouveau poste horaire"}
      description="Une heure de fin antérieure au début crée un poste de nuit qui traverse minuit."
      schema={shiftSchema}
      defaultValues={
        {
          code: shift?.code ?? "",
          name: shift?.name ?? "",
          startTime: shift?.startTime ?? "08:00",
          endTime: shift?.endTime ?? "16:00",
          graceMinutes: String(shift?.graceMinutes ?? 10),
          color: shift?.color ?? "#EF8200",
        } as never
      }
      action={saveShiftAction.bind(null, shift?.id ?? null)}
    >
      {({ register }) => (
        <div className="grid grid-cols-2 gap-3">
          <FormField name="code" label="Code" required>
            <Input
              id="code"
              maxLength={4}
              className="uppercase"
              {...register("code")}
            />
          </FormField>
          <FormField name="name" label="Nom" required>
            <Input id="name" {...register("name")} />
          </FormField>
          <FormField name="startTime" label="Début" required>
            <Input id="startTime" type="time" {...register("startTime")} />
          </FormField>
          <FormField name="endTime" label="Fin" required>
            <Input id="endTime" type="time" {...register("endTime")} />
          </FormField>
          <FormField name="graceMinutes" label="Tolérance de retard (min)">
            <Input
              id="graceMinutes"
              type="number"
              min={0}
              {...register("graceMinutes")}
            />
          </FormField>
          <FormField name="color" label="Couleur">
            <Input
              id="color"
              type="color"
              className="h-8 p-1"
              {...register("color")}
            />
          </FormField>
        </div>
      )}
    </FormDialog>
  );
}

type Schedule = {
  id: string;
  name: string;
  category: string;
  kind: string;
  pattern: string;
  cycleStart: string;
  description: string | null;
};

export function ScheduleDialog({ schedule }: { schedule?: Schedule }) {
  return (
    <FormDialog
      wide
      trigger={
        schedule ? (
          <Button variant="ghost" size="icon-sm" aria-label="Modifier">
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus /> Nouveau planning
          </Button>
        )
      }
      title={schedule ? "Modifier le planning" : "Nouveau planning"}
      description="Motif de codes de postes séparés par des virgules, « R » pour repos. Hebdomadaire : 7 codes du lundi au dimanche. Rotation : N codes répétés à partir de la date de début."
      schema={scheduleSchema}
      defaultValues={{
        name: schedule?.name ?? "",
        category: (schedule?.category ?? "STANDARD") as never,
        kind: (schedule?.kind ?? "WEEKLY") as never,
        pattern: schedule?.pattern ?? "J,J,J,J,J,R,R",
        cycleStart: schedule?.cycleStart ?? "",
        description: schedule?.description ?? "",
      }}
      action={saveScheduleAction.bind(null, schedule?.id ?? null)}
    >
      {({ register }) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            name="name"
            label="Nom"
            required
            className="space-y-1.5 sm:col-span-2"
          >
            <Input id="name" {...register("name")} />
          </FormField>
          <FormField name="category" label="Catégorie">
            <NativeSelect
              id="category"
              className="w-full"
              {...register("category")}
            >
              {Object.entries(SCHEDULE_CATEGORY).map(([v, l]) => (
                <NativeSelectOption key={v} value={v}>
                  {l}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField name="kind" label="Type">
            <NativeSelect id="kind" className="w-full" {...register("kind")}>
              <NativeSelectOption value="WEEKLY">
                Hebdomadaire
              </NativeSelectOption>
              <NativeSelectOption value="CYCLE">
                Rotation cyclique
              </NativeSelectOption>
            </NativeSelect>
          </FormField>
          <FormField
            name="pattern"
            label="Motif"
            required
            className="space-y-1.5 sm:col-span-2"
          >
            <Input
              id="pattern"
              className="font-mono uppercase"
              placeholder="M,M,A,A,N,N,R,R"
              {...register("pattern")}
            />
          </FormField>
          <FormField name="cycleStart" label="Début du cycle (rotation)">
            <Input id="cycleStart" type="date" {...register("cycleStart")} />
          </FormField>
          <FormField
            name="description"
            label="Description"
            className="space-y-1.5 sm:col-span-2"
          >
            <Textarea id="description" rows={2} {...register("description")} />
          </FormField>
        </div>
      )}
    </FormDialog>
  );
}

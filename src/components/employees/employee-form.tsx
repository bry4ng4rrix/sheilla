"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  ActionFormProvider,
  FormField,
  useActionForm,
} from "@/components/shared/form";
import { Panel } from "@/components/shared/panel";
import { employeeSchema } from "@/lib/validations";
import { CONTRACT_LABELS, EMPLOYEE_STATUS } from "@/lib/labels";
import type { ActionResult } from "@/lib/errors";

type Option = { id: string; label: string };
type Props = {
  action: (fd: FormData) => Promise<ActionResult<unknown>>;
  departments: { name: string; positions: Option[] }[];
  teams: Option[];
  defaults?: Record<string, string>;
  photoUrl?: string | null;
};

export function EmployeeForm({
  action,
  departments,
  teams,
  defaults,
  photoUrl,
}: Props) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(photoUrl ?? null);
  const { form, ref, onSubmit, pending } = useActionForm({
    schema: employeeSchema,
    defaultValues: {
      gender: "M",
      contractType: "CDI",
      status: "ACTIVE",
      ...defaults,
    } as never,
    action,
    onSuccess: (data) =>
      router.push(
        `/employees/${(data as { id?: string } | undefined)?.id ?? defaults?.id ?? ""}`,
      ),
  });
  const r = form.register;
  const sel = "w-full [&_select]:h-10";

  return (
    <ActionFormProvider form={form}>
      <form
        ref={ref}
        onSubmit={onSubmit}
        noValidate
        className="grid gap-6 xl:grid-cols-[300px_1fr]"
      >
        <Panel title="Photo" className="h-fit">
          <label className="group relative mx-auto block size-40 cursor-pointer overflow-hidden rounded-full bg-gradient-to-br from-orange-100 to-orange-200 ring-4 ring-orange-50">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:)
              <img
                src={preview}
                alt="Aperçu"
                className="size-full object-cover"
              />
            ) : (
              <span className="grid size-full place-items-center text-orange-400">
                <Camera className="size-10" />
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-black/50 py-2 text-center text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
              Changer
            </span>
            <input
              type="file"
              name="photo"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPreview(URL.createObjectURL(f));
              }}
            />
          </label>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            JPG, PNG ou WEBP · 5 Mo max.
          </p>
        </Panel>

        <div className="space-y-6">
          <Panel title="Informations personnelles">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                name="matricule"
                label="Matricule"
                required
                hint="Unique (RG01)"
              >
                <Input
                  id="matricule"
                  className="h-10 uppercase"
                  {...r("matricule")}
                />
              </FormField>
              <FormField name="lastName" label="Nom" required>
                <Input id="lastName" className="h-10" {...r("lastName")} />
              </FormField>
              <FormField name="firstName" label="Prénom" required>
                <Input id="firstName" className="h-10" {...r("firstName")} />
              </FormField>
              <FormField name="gender" label="Sexe" required>
                <NativeSelect id="gender" className={sel} {...r("gender")}>
                  <NativeSelectOption value="M">Masculin</NativeSelectOption>
                  <NativeSelectOption value="F">Féminin</NativeSelectOption>
                </NativeSelect>
              </FormField>
              <FormField name="birthDate" label="Date de naissance">
                <Input
                  id="birthDate"
                  type="date"
                  className="h-10"
                  {...r("birthDate")}
                />
              </FormField>
              <FormField name="phone" label="Téléphone">
                <Input
                  id="phone"
                  className="h-10"
                  placeholder="+261 34 …"
                  {...r("phone")}
                />
              </FormField>
              <FormField
                name="email"
                label="E-mail"
                className="space-y-1.5 sm:col-span-2 lg:col-span-1"
              >
                <Input
                  id="email"
                  type="email"
                  className="h-10"
                  {...r("email")}
                />
              </FormField>
              <FormField
                name="address"
                label="Adresse"
                className="space-y-1.5 sm:col-span-2"
              >
                <Input id="address" className="h-10" {...r("address")} />
              </FormField>
            </div>
          </Panel>
          <Panel title="Informations professionnelles">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                name="positionId"
                label="Poste (service)"
                required
                className="space-y-1.5 sm:col-span-2"
              >
                <NativeSelect
                  id="positionId"
                  className={sel}
                  {...r("positionId")}
                >
                  <NativeSelectOption value="">
                    — Choisir un poste —
                  </NativeSelectOption>
                  {departments.map((d) => (
                    <NativeSelectOptGroup key={d.name} label={d.name}>
                      {d.positions.map((p) => (
                        <NativeSelectOption key={p.id} value={p.id}>
                          {p.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelectOptGroup>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField name="teamId" label="Équipe">
                <NativeSelect id="teamId" className={sel} {...r("teamId")}>
                  <NativeSelectOption value="">Aucune</NativeSelectOption>
                  {teams.map((t) => (
                    <NativeSelectOption key={t.id} value={t.id}>
                      {t.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField name="hireDate" label="Date de recrutement" required>
                <Input
                  id="hireDate"
                  type="date"
                  className="h-10"
                  {...r("hireDate")}
                />
              </FormField>
              <FormField name="contractType" label="Type de contrat" required>
                <NativeSelect
                  id="contractType"
                  className={sel}
                  {...r("contractType")}
                >
                  {Object.entries(CONTRACT_LABELS).map(([v, l]) => (
                    <NativeSelectOption key={v} value={v}>
                      {l}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField name="status" label="Statut professionnel">
                <NativeSelect id="status" className={sel} {...r("status")}>
                  {Object.entries(EMPLOYEE_STATUS).map(([v, s]) => (
                    <NativeSelectOption key={v} value={v}>
                      {s.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField name="departureDate" label="Date de départ">
                <Input
                  id="departureDate"
                  type="date"
                  className="h-10"
                  {...r("departureDate")}
                />
              </FormField>
            </div>
          </Panel>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.back()}
            >
              Annuler
            </Button>
            <Button type="submit" size="lg" disabled={pending} className="px-5">
              {pending ? <Loader2 className="animate-spin" /> : <Save />}{" "}
              Enregistrer
            </Button>
          </div>
        </div>
      </form>
    </ActionFormProvider>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  ActionFormProvider,
  FormField,
  useActionForm,
} from "@/components/shared/form";
import { userSchema } from "@/lib/validations";
import { ROLE_LABELS } from "@/lib/permissions";
import type { ActionResult } from "@/lib/errors";

export function UserForm({
  action,
  defaults,
  employees,
  isEdit,
}: {
  action: (fd: FormData) => Promise<ActionResult<unknown>>;
  defaults?: Record<string, string>;
  employees: { id: string; label: string }[];
  isEdit?: boolean;
}) {
  const router = useRouter();
  const { form, ref, onSubmit, pending } = useActionForm({
    schema: userSchema,
    defaultValues: {
      name: "",
      email: "",
      roleCode: "EMPLOYEE",
      employeeId: "",
      password: "",
      ...defaults,
    } as never,
    action,
    onSuccess: (d) =>
      isEdit
        ? router.refresh()
        : router.push(`/admin/users/${(d as { id: string }).id}`),
  });
  const r = form.register;
  return (
    <ActionFormProvider form={form}>
      <form ref={ref} onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField name="name" label="Nom affiché" required>
            <Input id="name" className="h-10" {...r("name")} />
          </FormField>
          <FormField name="email" label="E-mail (identifiant)" required>
            <Input id="email" type="email" className="h-10" {...r("email")} />
          </FormField>
          <FormField name="roleCode" label="Rôle" required>
            <NativeSelect
              id="roleCode"
              className="w-full [&_select]:h-10"
              {...r("roleCode")}
            >
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <NativeSelectOption key={v} value={v}>
                  {l}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField
            name="employeeId"
            label="Dossier employé associé"
            hint="Un dossier ne peut avoir qu'un compte (RG02). Vide = compte technique."
          >
            <NativeSelect
              id="employeeId"
              className="w-full [&_select]:h-10"
              {...r("employeeId")}
            >
              <NativeSelectOption value="">
                Aucun (compte technique)
              </NativeSelectOption>
              {employees.map((e) => (
                <NativeSelectOption key={e.id} value={e.id}>
                  {e.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField
            name="password"
            label={
              isEdit
                ? "Nouveau mot de passe (facultatif)"
                : "Mot de passe initial"
            }
            required={!isEdit}
            hint="10 caractères min., majuscule, minuscule et chiffre."
            className="space-y-1.5 sm:col-span-2"
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              className="h-10"
              {...r("password")}
            />
          </FormField>
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />}{" "}
            Enregistrer
          </Button>
        </div>
      </form>
    </ActionFormProvider>
  );
}

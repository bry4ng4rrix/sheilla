"use client";

import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form";
import { departmentSchema, positionSchema } from "@/lib/validations";
import {
  saveDepartmentAction,
  savePositionAction,
} from "@/server/actions/organization";

type Dep = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export function DepartmentDialog({ dep }: { dep?: Dep }) {
  return (
    <FormDialog
      trigger={
        dep ? (
          <Button variant="ghost" size="icon-sm" aria-label="Modifier">
            <Pencil />
          </Button>
        ) : (
          <Button size="lg">
            <Plus /> Nouveau service
          </Button>
        )
      }
      title={dep ? "Modifier le service" : "Nouveau service"}
      schema={departmentSchema}
      defaultValues={{
        code: dep?.code ?? "",
        name: dep?.name ?? "",
        description: dep?.description ?? "",
      }}
      action={saveDepartmentAction.bind(null, dep?.id ?? null)}
    >
      {({ register }) => (
        <>
          <div className="grid grid-cols-3 gap-3">
            <FormField name="code" label="Code" required>
              <Input id="code" className="uppercase" {...register("code")} />
            </FormField>
            <FormField
              name="name"
              label="Nom du service"
              required
              className="col-span-2 space-y-1.5"
            >
              <Input id="name" {...register("name")} />
            </FormField>
          </div>
          <FormField name="description" label="Missions">
            <Textarea id="description" rows={3} {...register("description")} />
          </FormField>
        </>
      )}
    </FormDialog>
  );
}

type Pos = {
  id: string;
  title: string;
  departmentId: string;
  description: string | null;
};

export function PositionDialog({
  pos,
  departments,
}: {
  pos?: Pos;
  departments: { id: string; name: string }[];
}) {
  return (
    <FormDialog
      trigger={
        pos ? (
          <Button variant="ghost" size="icon-sm" aria-label="Modifier">
            <Pencil />
          </Button>
        ) : (
          <Button size="lg">
            <Plus /> Nouveau poste
          </Button>
        )
      }
      title={pos ? "Modifier le poste" : "Nouveau poste"}
      schema={positionSchema}
      defaultValues={{
        title: pos?.title ?? "",
        departmentId: pos?.departmentId ?? "",
        description: pos?.description ?? "",
      }}
      action={savePositionAction.bind(null, pos?.id ?? null)}
    >
      {({ register }) => (
        <>
          <FormField name="title" label="Intitulé du poste" required>
            <Input id="title" {...register("title")} />
          </FormField>
          <FormField
            name="departmentId"
            label="Service de rattachement"
            required
          >
            <NativeSelect
              id="departmentId"
              className="w-full"
              {...register("departmentId")}
            >
              <NativeSelectOption value="">— Choisir —</NativeSelectOption>
              {departments.map((d) => (
                <NativeSelectOption key={d.id} value={d.id}>
                  {d.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField name="description" label="Description">
            <Textarea id="description" rows={3} {...register("description")} />
          </FormField>
        </>
      )}
    </FormDialog>
  );
}

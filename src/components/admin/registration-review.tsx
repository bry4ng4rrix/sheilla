"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form";
import { rejectRegistrationSchema } from "@/lib/validations";
import { approveRegistrationAction, rejectRegistrationAction } from "@/server/actions/registration";

/** Validation d'une demande : choix du dossier employé à rattacher, ou refus motivé. */
export function RegistrationReview({ id, name, suggestedEmployeeId, employees }: { id: string; name: string; suggestedEmployeeId: string | null; employees: { id: string; label: string }[] }) {
  const [employeeId, setEmployeeId] = useState(suggestedEmployeeId ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();

  const approve = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("employeeId", employeeId);
      const r = await approveRegistrationAction(id, fd);
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <NativeSelect aria-label={`Dossier employé de ${name}`} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full sm:w-72 [&_select]:h-9">
        <NativeSelectOption value="">— Dossier à rattacher —</NativeSelectOption>
        {employees.map((e) => <NativeSelectOption key={e.id} value={e.id}>{e.label}</NativeSelectOption>)}
      </NativeSelect>
      <Button onClick={approve} disabled={pending || !employeeId} className="bg-emerald-600 hover:bg-emerald-700">
        {pending ? <Loader2 className="animate-spin" /> : <Check />} Valider
      </Button>
      <FormDialog
        trigger={<Button variant="destructive"><X /> Refuser</Button>}
        title={`Refuser la demande de ${name}`}
        description="Le motif est conservé et le compte ne pourra pas se connecter."
        schema={rejectRegistrationSchema}
        defaultValues={{ note: "" }}
        action={rejectRegistrationAction.bind(null, id)}
        submitLabel="Refuser la demande"
      >
        {({ register }) => (
          <FormField name="note" label="Motif du refus" required>
            <Textarea id="note" rows={3} placeholder="Ex. : matricule inconnu, contactez le service RH." {...register("note")} />
          </FormField>
        )}
      </FormDialog>
    </div>
  );
}

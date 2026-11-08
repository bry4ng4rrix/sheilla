"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { z } from "zod";
import type {
  DefaultValues,
  FieldValues,
  UseFormReturn,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ActionFormProvider, useActionForm } from "./form";
import type { ActionResult } from "@/lib/errors";

/** Modale de formulaire générique : validation Zod côté client + Server Action. */
export function FormDialog<S extends z.ZodType<unknown, FieldValues>>({
  trigger,
  title,
  description,
  schema,
  defaultValues,
  action,
  submitLabel = "Enregistrer",
  children,
  wide,
}: {
  trigger: React.ReactElement;
  title: string;
  description?: string;
  schema: S;
  defaultValues?: DefaultValues<z.input<S>>;
  action: (fd: FormData) => Promise<ActionResult<unknown>>;
  submitLabel?: string;
  children: (form: UseFormReturn<z.input<S>>) => React.ReactNode;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { form, ref, onSubmit, pending } = useActionForm({
    schema,
    defaultValues,
    action,
    onSuccess: () => {
      setOpen(false);
      form.reset(defaultValues);
      router.refresh();
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className={wide ? "sm:max-w-2xl" : "sm:max-w-lg"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ActionFormProvider form={form}>
          <form ref={ref} onSubmit={onSubmit} noValidate className="space-y-4">
            {children(form)}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />} {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </ActionFormProvider>
      </DialogContent>
    </Dialog>
  );
}

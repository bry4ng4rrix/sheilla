"use client";

import { useRef, useTransition } from "react";
import {
  FormProvider,
  get,
  useForm,
  useFormContext,
  type DefaultValues,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/errors";

/**
 * Formulaire validé côté client par le même schéma Zod que le serveur,
 * puis envoyé à une Server Action sous forme de FormData (fichiers compris).
 */
export function useActionForm<
  S extends z.ZodType<unknown, FieldValues>,
  R = unknown,
>(opts: {
  schema: S;
  defaultValues?: DefaultValues<z.input<S>>;
  action: (form: FormData) => Promise<ActionResult<R>>;
  onSuccess?: (data: R | undefined) => void;
}) {
  const form = useForm<z.input<S>>({
    resolver: zodResolver(opts.schema as never),
    defaultValues: opts.defaultValues,
    mode: "onTouched",
  });
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const onSubmit = form.handleSubmit((_values, event) => {
    const fd = new FormData(event?.target as HTMLFormElement);
    start(async () => {
      const res = await opts.action(fd);
      if (res.ok) {
        if (res.message) toast.success(res.message);
        opts.onSuccess?.(res.data);
      } else {
        toast.error(res.error);
        for (const [k, v] of Object.entries(res.fieldErrors ?? {}))
          form.setError(k as Path<z.input<S>>, { message: v });
      }
    });
  });
  return { form, ref, onSubmit, pending };
}

export function ActionFormProvider<T extends FieldValues>({
  form,
  children,
}: {
  form: UseFormReturn<T>;
  children: React.ReactNode;
}) {
  return <FormProvider {...form}>{children}</FormProvider>;
}

export function FormField({
  name,
  label,
  hint,
  required,
  children,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useFormContext();
  const error = ctx
    ? (get(ctx.formState.errors, name) as { message?: string } | undefined)
        ?.message
    : undefined;
  return (
    <div className={className ?? "space-y-1.5"}>
      <Label htmlFor={name} className="text-stone-700">
        {label}
        {required && <span className="text-orange-600">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Camera, KeyRound, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ActionFormProvider,
  FormField,
  useActionForm,
} from "@/components/shared/form";
import { changePasswordSchema, profileSchema } from "@/lib/validations";
import { updateProfileAction } from "@/server/actions/employees";
import { changePasswordAction } from "@/server/actions/auth";

export function ProfileForm({
  defaults,
  photoUrl,
  initials,
}: {
  defaults: Record<string, string>;
  photoUrl: string | null;
  initials: string;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState(photoUrl);
  const { form, ref, onSubmit, pending } = useActionForm({
    schema: profileSchema,
    defaultValues: defaults as never,
    action: updateProfileAction,
    onSuccess: () => router.refresh(),
  });
  return (
    <ActionFormProvider form={form}>
      <form ref={ref} onSubmit={onSubmit} noValidate className="space-y-4">
        <label className="group relative mx-auto block size-28 cursor-pointer overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-orange-600 ring-4 ring-orange-100">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- aperçu
            <img
              src={preview}
              alt="Photo de profil"
              className="size-full object-cover"
            />
          ) : (
            <span className="grid size-full place-items-center text-3xl font-bold text-white">
              {initials}
            </span>
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Camera />
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
        <FormField name="phone" label="Téléphone">
          <Input id="phone" {...form.register("phone")} />
        </FormField>
        <FormField name="email" label="E-mail personnel">
          <Input id="email" type="email" {...form.register("email")} />
        </FormField>
        <FormField name="address" label="Adresse">
          <Input id="address" {...form.register("address")} />
        </FormField>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Mettre à
          jour
        </Button>
      </form>
    </ActionFormProvider>
  );
}

export function PasswordForm() {
  const { form, ref, onSubmit, pending } = useActionForm({
    schema: changePasswordSchema,
    defaultValues: { current: "", password: "", confirm: "" },
    action: changePasswordAction,
    onSuccess: () => form.reset(),
  });
  return (
    <ActionFormProvider form={form}>
      <form
        ref={ref}
        onSubmit={onSubmit}
        noValidate
        className="space-y-4"
        id="password"
      >
        <FormField name="current" label="Mot de passe actuel">
          <Input
            id="current"
            type="password"
            autoComplete="current-password"
            {...form.register("current")}
          />
        </FormField>
        <FormField
          name="password"
          label="Nouveau mot de passe"
          hint="10 caractères min., majuscule, minuscule et chiffre."
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
          />
        </FormField>
        <FormField name="confirm" label="Confirmation">
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            {...form.register("confirm")}
          />
        </FormField>
        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={pending}
        >
          {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}{" "}
          Changer le mot de passe
        </Button>
      </form>
    </ActionFormProvider>
  );
}

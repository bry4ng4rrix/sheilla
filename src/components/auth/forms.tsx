"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn, Mail, Lock, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ActionFormProvider,
  FormField,
  useActionForm,
} from "@/components/shared/form";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/validations";
import {
  forgotPasswordAction,
  loginAction,
  resetPasswordAction,
} from "@/server/actions/auth";
import { registerAction } from "@/server/actions/registration";

export function LoginForm() {
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { form, ref } = useActionForm({
    schema: loginSchema,
    action: loginAction,
  });

  const onSubmit = form.handleSubmit((_values, event) => {
    const fd = new FormData(event?.target as HTMLFormElement);
    start(async () => {
      setError(null);
      const res = await loginAction(fd);
      if (res && !res.ok) setError(res.error);
    });
  });

  return (
    <ActionFormProvider form={form}>
      <form ref={ref} onSubmit={onSubmit} className="space-y-5" noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}
        <FormField name="email" label="Adresse e-mail professionnelle">
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="prenom.nom@jirama.mg"
              className="h-11 pl-10"
              {...form.register("email")}
            />
          </div>
        </FormField>
        <FormField name="password" label="Mot de passe">
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              className="h-11 pr-10 pl-10"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show ? "Masquer" : "Afficher"}
            >
              {show ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </FormField>
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-orange-600 hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full text-[15px] font-semibold shadow-lg shadow-orange-500/30"
        >
          {pending ? <Loader2 className="animate-spin" /> : <LogIn />} Se
          connecter
        </Button>
      </form>
    </ActionFormProvider>
  );
}

export function ForgotForm() {
  const [sent, setSent] = useState<string | null>(null);
  const { form, ref, onSubmit, pending } = useActionForm({
    schema: forgotSchema,
    action: async (fd) => {
      const r = await forgotPasswordAction(fd);
      if (r.ok) setSent(r.message ?? "");
      return { ...r, message: undefined } as typeof r;
    },
  });
  if (sent)
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        {sent}
      </div>
    );
  return (
    <ActionFormProvider form={form}>
      <form ref={ref} onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormField name="email" label="Adresse e-mail">
          <Input
            id="email"
            type="email"
            className="h-11"
            placeholder="prenom.nom@jirama.mg"
            {...form.register("email")}
          />
        </FormField>
        <Button type="submit" disabled={pending} className="h-11 w-full">
          {pending && <Loader2 className="animate-spin" />} Envoyer le lien
        </Button>
      </form>
    </ActionFormProvider>
  );
}

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const { form, ref, onSubmit, pending } = useActionForm({
    schema: resetSchema,
    defaultValues: { token },
    action: resetPasswordAction,
    onSuccess: () => {
      toast.success("Vous pouvez vous connecter.");
      router.push("/login");
    },
  });
  return (
    <ActionFormProvider form={form}>
      <form ref={ref} onSubmit={onSubmit} className="space-y-5" noValidate>
        <input type="hidden" {...form.register("token")} />
        <FormField
          name="password"
          label="Nouveau mot de passe"
          hint="10 caractères min., avec majuscule, minuscule et chiffre."
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            className="h-11"
            {...form.register("password")}
          />
        </FormField>
        <FormField name="confirm" label="Confirmer le mot de passe">
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            className="h-11"
            {...form.register("confirm")}
          />
        </FormField>
        <Button type="submit" disabled={pending} className="h-11 w-full">
          {pending && <Loader2 className="animate-spin" />} Enregistrer le mot
          de passe
        </Button>
      </form>
    </ActionFormProvider>
  );
}

export function RegisterForm() {
  const [sent, setSent] = useState<string | null>(null);
  const { form, ref, onSubmit, pending } = useActionForm({
    schema: registerSchema,
    defaultValues: { name: "", email: "", matricule: "", password: "", confirm: "" },
    action: async (fd) => {
      const r = await registerAction(fd);
      if (r.ok) setSent(r.message ?? "");
      return { ...r, message: undefined } as typeof r;
    },
  });
  if (sent)
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{sent}</div>
        <Link href="/login" className="block text-center text-sm font-semibold text-orange-600 hover:underline">Retour à la connexion</Link>
      </div>
    );
  const r = form.register;
  return (
    <ActionFormProvider form={form}>
      <form ref={ref} onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField name="name" label="Nom complet"><Input id="name" autoComplete="name" className="h-11" placeholder="Prénom NOM" {...r("name")} /></FormField>
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <FormField name="email" label="Adresse e-mail professionnelle"><Input id="email" type="email" autoComplete="email" className="h-11" placeholder="prenom.nom@jirama.mg" {...r("email")} /></FormField>
          <FormField name="matricule" label="Matricule"><Input id="matricule" className="h-11 uppercase" placeholder="JA-1234" {...r("matricule")} /></FormField>
        </div>
        <FormField name="password" label="Mot de passe" hint="10 caractères min., avec majuscule, minuscule et chiffre."><Input id="password" type="password" autoComplete="new-password" className="h-11" {...r("password")} /></FormField>
        <FormField name="confirm" label="Confirmer le mot de passe"><Input id="confirm" type="password" autoComplete="new-password" className="h-11" {...r("confirm")} /></FormField>
        <Button type="submit" disabled={pending} className="h-11 w-full text-[15px] font-semibold shadow-lg shadow-orange-500/30">
          {pending ? <Loader2 className="animate-spin" /> : <UserPlus />} Demander un accès
        </Button>
      </form>
    </ActionFormProvider>
  );
}

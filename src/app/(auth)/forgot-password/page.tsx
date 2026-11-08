import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ForgotForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPage() {
  return (
    <>
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Retour à la connexion
      </Link>
      <h2 className="text-3xl font-extrabold tracking-tight">
        Mot de passe oublié
      </h2>
      <p className="mt-2 mb-8 text-muted-foreground">
        Saisissez votre e-mail : vous recevrez un lien valable une heure pour
        choisir un nouveau mot de passe.
      </p>
      <ForgotForm />
    </>
  );
}

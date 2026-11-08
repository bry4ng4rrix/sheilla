import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RegisterForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Demande d'accès" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <>
      <Link href="/login" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Retour à la connexion
      </Link>
      <h2 className="text-3xl font-extrabold tracking-tight">Demander un accès</h2>
      <p className="mt-2 mb-8 text-muted-foreground">
        Votre compte sera activé après validation par un administrateur, qui le rattachera à votre dossier du personnel.
      </p>
      <RegisterForm />
    </>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <>
      <h2 className="text-3xl font-extrabold tracking-tight">Bienvenue </h2>
      <p className="mt-2 mb-8 text-muted-foreground">
        Connectez-vous à votre espace RH avec vos identifiants professionnels.
      </p>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-semibold text-orange-600 hover:underline">Demander un accès</Link>
      </p>
      <p className="mt-10 text-center text-xs text-muted-foreground">
        Accès réservé au personnel de la JIRAMA Antsirabe. Toute connexion est
        journalisée.
      </p>
    </>
  );
}

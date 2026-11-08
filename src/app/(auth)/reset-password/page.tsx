import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ResetPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  return (
    <>
      <h2 className="text-3xl font-extrabold tracking-tight">
        Nouveau mot de passe
      </h2>
      <p className="mt-2 mb-8 text-muted-foreground">
        Choisissez un mot de passe robuste que vous n&apos;utilisez nulle part
        ailleurs.
      </p>
      {typeof token === "string" ? (
        <ResetForm token={token} />
      ) : (
        <p className="text-sm text-destructive">
          Lien invalide.{" "}
          <Link href="/forgot-password" className="underline">
            Refaire une demande
          </Link>
        </p>
      )}
    </>
  );
}

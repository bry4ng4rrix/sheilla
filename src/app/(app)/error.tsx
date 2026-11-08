"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border bg-card p-8 text-center">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-red-50 text-red-600">
        <TriangleAlert />
      </div>
      <h2 className="text-lg font-bold">Une erreur est survenue</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Le chargement de cette page a échoué. Réessayez ou contactez
        l&apos;administrateur si le problème persiste.
      </p>
      <Button className="mt-5" onClick={reset}>
        Réessayer
      </Button>
    </div>
  );
}

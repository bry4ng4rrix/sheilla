"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { decideLeaveAction } from "@/server/actions/leaves";

export function DecisionPanel({ id }: { id: string }) {
  const [mode, setMode] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const comment = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const submit = (decision: "APPROVED" | "REJECTED") => {
    const text = comment.current?.value.trim() ?? "";
    if (decision === "REJECTED" && text.length < 5)
      return setError("Le motif de refus est obligatoire (RG05).");
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("decision", decision);
      fd.set("comment", text);
      const r = await decideLeaveAction(id, fd);
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.error);
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button
          size="lg"
          variant={mode === "APPROVED" ? "default" : "outline"}
          className={
            mode === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : ""
          }
          onClick={() => setMode("APPROVED")}
        >
          <Check /> Valider
        </Button>
        <Button
          size="lg"
          variant={mode === "REJECTED" ? "destructive" : "outline"}
          onClick={() => setMode("REJECTED")}
        >
          <X /> Refuser
        </Button>
      </div>
      {mode && (
        <div className="space-y-3 animate-rise">
          <div className="space-y-1.5">
            <Label htmlFor="comment">
              {mode === "REJECTED" ? (
                <>
                  Motif du refus <span className="text-orange-600">*</span>
                </>
              ) : (
                "Commentaire (facultatif)"
              )}
            </Label>
            <Textarea
              id="comment"
              ref={comment}
              rows={4}
              aria-invalid={!!error}
              placeholder={
                mode === "REJECTED"
                  ? "Expliquez la raison du refus à l'agent…"
                  : "Message pour l'agent…"
              }
            />
            {error && (
              <p className="text-xs font-medium text-destructive">{error}</p>
            )}
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={pending}
            variant={mode === "REJECTED" ? "destructive" : "default"}
            onClick={() => submit(mode)}
          >
            {pending && <Loader2 className="animate-spin" />} Confirmer{" "}
            {mode === "APPROVED" ? "la validation" : "le refus"}
          </Button>
        </div>
      )}
    </div>
  );
}

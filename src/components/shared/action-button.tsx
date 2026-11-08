"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ActionResult } from "@/lib/errors";

type Props = {
  action: () => Promise<ActionResult<unknown>>;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  confirm?: {
    title: string;
    description: string;
    label?: string;
    destructive?: boolean;
  };
  redirectTo?: string;
};

/** Bouton qui exécute une Server Action, avec confirmation optionnelle et notification toast. */
export function ActionButton({
  action,
  children,
  variant,
  size,
  className,
  confirm,
  redirectTo,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = () =>
    start(async () => {
      const res = await action();
      setOpen(false);
      if (res.ok) {
        if (res.message) toast.success(res.message);
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } else toast.error(res.error);
    });

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={pending}
        onClick={() => (confirm ? setOpen(true) : run())}
      >
        {pending && <Loader2 className="animate-spin" />}
        {children}
      </Button>
      {confirm && (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirm.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <Button
                variant={confirm.destructive ? "destructive" : "default"}
                disabled={pending}
                onClick={run}
              >
                {pending && <Loader2 className="animate-spin" />}
                {confirm.label ?? "Confirmer"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

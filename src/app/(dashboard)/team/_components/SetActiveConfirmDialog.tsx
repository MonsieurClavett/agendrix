"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  setUserActiveAction,
  type SetActiveState,
} from "@/actions/team/set-active";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initial: SetActiveState = {};

type Props = {
  user: { id: string; name: string | null; email: string };
  desiredActive: boolean;
};

export function SetActiveConfirmDialog({ user, desiredActive }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    setUserActiveAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      setOpen(false);
      router.refresh();
    }
  }, [state.success, open, router]);

  const action = desiredActive ? "Réactiver" : "Désactiver";
  const label = user.name ?? user.email;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={desiredActive ? "outline" : "destructive"}
        >
          {action}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action} {label} ?</DialogTitle>
          <DialogDescription>
            {desiredActive
              ? "L'utilisateur pourra à nouveau se connecter."
              : "L'utilisateur ne pourra plus se connecter. Son historique est conservé."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="userId" value={user.id} />
          <input
            type="hidden"
            name="isActive"
            value={desiredActive ? "true" : "false"}
          />

          {state.error && (
            <p className="text-destructive mb-3 text-sm">{state.error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant={desiredActive ? "default" : "destructive"}
              disabled={pending}
            >
              {pending ? "…" : `Confirmer ${action.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

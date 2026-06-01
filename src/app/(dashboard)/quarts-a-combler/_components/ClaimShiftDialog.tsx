"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createClaimAction,
  type CreateClaimState,
} from "@/actions/openShifts/createClaim";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId: string;
  summary: string;
};

const initial: CreateClaimState = {};

export function ClaimShiftDialog({
  open,
  onOpenChange,
  shiftId,
  summary,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createClaimAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Demande envoyée.");
      onOpenChange(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, open, onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réclamer ce quart</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Confirmer votre demande pour&nbsp;: <strong>{summary}</strong>&nbsp;?
          Votre gestionnaire devra l'approuver.
        </p>
        <form action={formAction}>
          <input type="hidden" name="shiftId" value={shiftId} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Envoi…" : "Envoyer ma demande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

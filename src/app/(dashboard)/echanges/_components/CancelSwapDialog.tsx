"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  cancelSwapAction,
  type CancelSwapState,
} from "@/actions/shiftSwaps/cancel";
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
  swapId: string;
};

const initial: CancelSwapState = {};

export function CancelSwapDialog({ open, onOpenChange, swapId }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(cancelSwapAction, initial);

  useEffect(() => {
    if (state.success && open) {
      toast.success("Proposition annulée.");
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
          <DialogTitle>Annuler la proposition</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Confirmer l'annulation de cette proposition d'échange&nbsp;?
        </p>
        <form action={formAction}>
          <input type="hidden" name="swapId" value={swapId} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Retour
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Annulation…" : "Annuler la proposition"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

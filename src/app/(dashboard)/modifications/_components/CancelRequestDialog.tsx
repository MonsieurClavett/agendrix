"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  cancelShiftChangeRequestAction,
  type CancelShiftChangeState,
} from "@/actions/shiftChangeRequests/cancel";
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
  requestId: string;
};

const initial: CancelShiftChangeState = {};

export function CancelRequestDialog({ open, onOpenChange, requestId }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    cancelShiftChangeRequestAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Demande annulée.");
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
          <DialogTitle>Annuler votre demande ?</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Votre demande sera retirée. Vous pourrez en soumettre une nouvelle.
        </p>
        <form action={formAction}>
          <input type="hidden" name="requestId" value={requestId} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Retour
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Annulation…" : "Annuler la demande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

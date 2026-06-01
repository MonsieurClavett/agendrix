"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  cancelClaimAction,
  type CancelClaimState,
} from "@/actions/openShifts/cancelClaim";
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
  claimId: string;
  summary: string;
};

const initial: CancelClaimState = {};

export function CancelClaimDialog({
  open,
  onOpenChange,
  claimId,
  summary,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    cancelClaimAction,
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
          <DialogTitle>Annuler la demande</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Annuler votre demande pour&nbsp;: <strong>{summary}</strong>&nbsp;?
        </p>
        <form action={formAction}>
          <input type="hidden" name="claimId" value={claimId} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Retour
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Annulation…" : "Annuler ma demande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

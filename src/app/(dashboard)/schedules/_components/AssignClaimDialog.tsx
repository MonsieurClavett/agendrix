"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  assignOpenShiftAction,
  type AssignOpenShiftState,
} from "@/actions/openShifts/assignOpenShift";
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
  claimId: string;
  assigneeName: string;
  shiftSummary: string;
};

const initial: AssignOpenShiftState = {};

export function AssignClaimDialog({
  open,
  onOpenChange,
  shiftId,
  claimId,
  assigneeName,
  shiftSummary,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    assignOpenShiftAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Quart attribué.");
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
          <DialogTitle>Attribuer ce quart</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Attribuer <strong>{shiftSummary}</strong> à&nbsp;
          <strong>{assigneeName}</strong>&nbsp;? Les autres demandes seront
          refusées.
        </p>
        <form action={formAction}>
          <input type="hidden" name="shiftId" value={shiftId} />
          <input type="hidden" name="claimId" value={claimId} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Attribution…" : "Attribuer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

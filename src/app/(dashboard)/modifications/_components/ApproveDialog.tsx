"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  approveShiftChangeRequestAction,
  type ApproveShiftChangeState,
} from "@/actions/shiftChangeRequests/approve";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatHHMM, formatLongDate } from "@/lib/week";
import type { ShiftChangeRequestRow } from "@/lib/repositories/shiftChangeRequest";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ShiftChangeRequestRow;
};

const initial: ApproveShiftChangeState = {};

export function ApproveDialog({ open, onOpenChange, request }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    approveShiftChangeRequestAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Modification approuvée. Shift mis à jour.");
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
          <DialogTitle>Approuver la modification ?</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Le shift sera mis à jour à{" "}
          <strong>{formatLongDate(request.requestedStartsAt)}</strong>{" "}
          <strong className="tabular-nums">
            {formatHHMM(request.requestedStartsAt)}–
            {formatHHMM(request.requestedEndsAt)}
          </strong>
          .
        </p>
        <form action={formAction}>
          <input type="hidden" name="requestId" value={request.id} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Approbation…" : "Approuver"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

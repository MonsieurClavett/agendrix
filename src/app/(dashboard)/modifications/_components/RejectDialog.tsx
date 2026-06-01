"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  rejectShiftChangeRequestAction,
  type RejectShiftChangeState,
} from "@/actions/shiftChangeRequests/reject";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { ShiftChangeRequestRow } from "@/lib/repositories/shiftChangeRequest";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ShiftChangeRequestRow;
};

const initial: RejectShiftChangeState = {};

export function RejectDialog({ open, onOpenChange, request }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    rejectShiftChangeRequestAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Demande refusée.");
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
          <DialogTitle>Refuser la modification</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="requestId" value={request.id} />
          <div className="space-y-1.5">
            <Label htmlFor="managerNote">Raison (optionnelle)</Label>
            <textarea
              id="managerNote"
              name="managerNote"
              maxLength={280}
              rows={3}
              placeholder="Ex. Pas possible cette semaine, on en reparle"
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Refus…" : "Refuser"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

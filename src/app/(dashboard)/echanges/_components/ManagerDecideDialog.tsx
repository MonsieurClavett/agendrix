"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  managerDecideAction,
  type ManagerDecideState,
} from "@/actions/shiftSwaps/managerDecide";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swapId: string;
  decision: "APPROVE" | "REJECT";
};

const initial: ManagerDecideState = {};

export function ManagerDecideDialog({
  open,
  onOpenChange,
  swapId,
  decision,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    managerDecideAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success(
        decision === "APPROVE" ? "Échange approuvé." : "Échange refusé.",
      );
      onOpenChange(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, open, decision, onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {decision === "APPROVE"
              ? "Approuver l'échange"
              : "Refuser l'échange"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="swapId" value={swapId} />
          <input type="hidden" name="decision" value={decision} />
          <p className="text-sm">
            {decision === "APPROVE"
              ? "L'approbation permute immédiatement les deux shifts entre les deux employés."
              : "Le refus laisse les shifts inchangés. Les deux employés seront notifiés."}
          </p>
          {decision === "REJECT" && (
            <div className="space-y-2">
              <Label htmlFor="manager-reason">Raison (optionnelle)</Label>
              <Input
                id="manager-reason"
                name="reason"
                maxLength={280}
                placeholder="Surcharge ce jour-là…"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Retour
            </Button>
            <Button
              type="submit"
              variant={decision === "APPROVE" ? "default" : "destructive"}
              disabled={pending}
            >
              {pending
                ? "Décision…"
                : decision === "APPROVE"
                  ? "Approuver"
                  : "Refuser"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

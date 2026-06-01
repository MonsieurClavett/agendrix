"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  peerAcceptAction,
  type PeerAcceptState,
} from "@/actions/shiftSwaps/peerAccept";
import {
  peerRejectAction,
  type PeerRejectState,
} from "@/actions/shiftSwaps/peerReject";
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
  decision: "ACCEPT" | "REJECT";
};

const initialA: PeerAcceptState = {};
const initialR: PeerRejectState = {};

export function PeerDecideDialog({
  open,
  onOpenChange,
  swapId,
  decision,
}: Props) {
  const router = useRouter();
  const [aState, aFormAction, aPending] = useActionState(
    peerAcceptAction,
    initialA,
  );
  const [rState, rFormAction, rPending] = useActionState(
    peerRejectAction,
    initialR,
  );

  const state = decision === "ACCEPT" ? aState : rState;
  const formAction = decision === "ACCEPT" ? aFormAction : rFormAction;
  const pending = decision === "ACCEPT" ? aPending : rPending;

  useEffect(() => {
    if (state.success && open) {
      toast.success(
        decision === "ACCEPT"
          ? "Acceptation enregistrée."
          : "Refus enregistré.",
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
            {decision === "ACCEPT"
              ? "Accepter cet échange"
              : "Refuser cet échange"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="swapId" value={swapId} />
          <p className="text-sm">
            {decision === "ACCEPT"
              ? "Votre acceptation enverra l'échange au gestionnaire pour validation."
              : "Le proposeur sera notifié de votre refus."}
          </p>
          {decision === "REJECT" && (
            <div className="space-y-2">
              <Label htmlFor="peer-reason">Raison (optionnelle)</Label>
              <Input
                id="peer-reason"
                name="reason"
                maxLength={280}
                placeholder="Indisponible ce jour-là…"
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
              variant={decision === "ACCEPT" ? "default" : "destructive"}
              disabled={pending}
            >
              {pending
                ? "Envoi…"
                : decision === "ACCEPT"
                  ? "Accepter"
                  : "Refuser"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

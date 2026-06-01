"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  deleteTimeOffAction,
  type DeleteTimeOffState,
} from "@/actions/timeOff/delete";
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
  summary: string;
  successLabel?: string;
};

const initial: DeleteTimeOffState = {};

export function CancelTimeOffDialog({
  open,
  onOpenChange,
  requestId,
  summary,
  successLabel = "Demande annulée.",
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deleteTimeOffAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success(successLabel);
      onOpenChange(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, open, onOpenChange, router, successLabel]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer la demande</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Confirmer la suppression&nbsp;: <strong>{summary}</strong> ?
        </p>
        <form action={formAction}>
          <input type="hidden" name="requestId" value={requestId} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

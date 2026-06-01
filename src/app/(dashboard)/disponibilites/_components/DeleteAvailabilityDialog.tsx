"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  deleteAvailabilityAction,
  type DeleteAvailabilityState,
} from "@/actions/availability/delete";
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
  availabilityId: string;
  summary: string;
};

const initial: DeleteAvailabilityState = {};

export function DeleteAvailabilityDialog({
  open,
  onOpenChange,
  availabilityId,
  summary,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deleteAvailabilityAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Plage supprimée.");
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
          <DialogTitle>Supprimer la plage</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Voulez-vous vraiment supprimer la plage&nbsp;
          <strong>{summary}</strong>&nbsp;? Cette action est immédiate.
        </p>
        <form action={formAction}>
          <input type="hidden" name="availabilityId" value={availabilityId} />
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

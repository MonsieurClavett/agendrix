"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteShiftAction, type DeleteState } from "@/actions/shifts/delete";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const initial: DeleteState = {};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId: string;
  summary: string;
};

export function DeleteShiftDialog({
  open,
  onOpenChange,
  shiftId,
  summary,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deleteShiftAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Shift supprimé.");
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
          <DialogTitle>Supprimer ce shift ?</DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="shiftId" value={shiftId} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "…" : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

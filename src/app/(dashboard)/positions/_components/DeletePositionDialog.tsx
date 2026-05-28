"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  deletePositionAction,
  type DeletePositionState,
} from "@/actions/positions/delete";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const initial: DeletePositionState = {};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positionId: string;
  positionName: string;
  shiftCount: number;
};

export function DeletePositionDialog({
  open,
  onOpenChange,
  positionId,
  positionName,
  shiftCount,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deletePositionAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Position supprimée.");
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
          <DialogTitle>Supprimer « {positionName} » ?</DialogTitle>
          <DialogDescription>
            {shiftCount === 0
              ? "Aucun shift n'utilise cette position."
              : `${shiftCount} shift${shiftCount > 1 ? "s utilisent" : " utilise"} cette position. Ils ne seront PAS supprimés — ils perdront simplement leur étiquette de position.`}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="positionId" value={positionId} />
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

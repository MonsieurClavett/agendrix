"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { deleteShiftAction, type DeleteState } from "@/actions/shifts/delete";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initial: DeleteState = {};

type Props = {
  shiftId: string;
  summary: string;
};

export function DeleteShiftDialog({ shiftId, summary }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteShiftAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      setOpen(false);
      router.refresh();
    }
  }, [state.success, open, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          Supprimer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer ce shift ?</DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="shiftId" value={shiftId} />
          {state.error && (
            <p className="text-destructive mb-3 text-sm">{state.error}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
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

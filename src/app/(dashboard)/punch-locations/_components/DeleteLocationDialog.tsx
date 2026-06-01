"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  deletePunchLocationAction,
  type DeletePunchLocationState,
} from "@/actions/punchLocations/delete";
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
  locationId: string;
  locationName: string;
};

const initial: DeletePunchLocationState = {};

export function DeleteLocationDialog({
  open,
  onOpenChange,
  locationId,
  locationName,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deletePunchLocationAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Poste supprimé.");
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
          <DialogTitle>Supprimer le poste</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Supprimer le poste <strong>{locationName}</strong> ? Les pointages
          historiques liés à ce poste sont préservés (l&apos;association
          devient nulle).
        </p>
        <form action={formAction}>
          <input type="hidden" name="id" value={locationId} />
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

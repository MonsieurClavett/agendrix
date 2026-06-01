"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createPunchLocationAction,
  type CreatePunchLocationState,
} from "@/actions/punchLocations/create";
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
};

const initial: CreatePunchLocationState = {};

export function NewLocationDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createPunchLocationAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Poste créé.");
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
          <DialogTitle>Nouveau poste de pointage</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Donnez un nom au poste (ex. « Cuisine », « Bureau accueil »,
          « Entrepôt »). Un QR code sera généré automatiquement pour ce poste.
        </p>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom du poste</Label>
            <Input
              id="name"
              name="name"
              required
              maxLength={80}
              autoFocus
              placeholder="Ex. Restaurant Main St"
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
            <Button type="submit" disabled={pending}>
              {pending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

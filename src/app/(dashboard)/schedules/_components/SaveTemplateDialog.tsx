"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  saveAsTemplateAction,
  type SaveTemplateState,
} from "@/actions/scheduleTemplates/save";
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
  weekStartISO: string;
  weekLabel: string;
};

const initial: SaveTemplateState = {};

export function SaveTemplateDialog({
  open,
  onOpenChange,
  weekStartISO,
  weekLabel,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveAsTemplateAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Modèle sauvegardé.");
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
          <DialogTitle>Sauvegarder comme modèle</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Capturer tous les shifts de la semaine du <strong>{weekLabel}</strong>
          {" "}comme modèle réutilisable. Le modèle stocke les jours, heures,
          assignations et positions — vous pourrez le réappliquer sur n&apos;importe
          quelle autre semaine.
        </p>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="weekStart" value={weekStartISO} />
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom du modèle</Label>
            <Input
              id="name"
              name="name"
              required
              maxLength={80}
              placeholder="Ex. Semaine type été"
              autoComplete="off"
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
              {pending ? "Sauvegarde…" : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

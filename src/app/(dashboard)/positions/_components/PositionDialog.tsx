"use client";

import * as React from "react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createPositionAction,
  type CreatePositionState,
} from "@/actions/positions/create";
import {
  updatePositionAction,
  type UpdatePositionState,
} from "@/actions/positions/update";
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
import { cn } from "@/lib/utils";
import {
  POSITION_COLOR_KEYS,
  POSITION_COLORS,
  type PositionColorKey,
} from "@/lib/positions";

type Position = { id: string; name: string; color: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: Position | null;
};

const initialCreate: CreatePositionState = {};
const initialUpdate: UpdatePositionState = {};

export function PositionDialog({ open, onOpenChange, position }: Props) {
  const router = useRouter();
  const isEdit = !!position;

  const [createState, createForm, createPending] = useActionState(
    createPositionAction,
    initialCreate,
  );
  const [updateState, updateForm, updatePending] = useActionState(
    updatePositionAction,
    initialUpdate,
  );

  const state = isEdit ? updateState : createState;
  const formAction = isEdit ? updateForm : createForm;
  const pending = isEdit ? updatePending : createPending;

  const initialColor = (
    isEdit && POSITION_COLOR_KEYS.includes(position!.color as PositionColorKey)
      ? (position!.color as PositionColorKey)
      : POSITION_COLOR_KEYS[0]
  ) as PositionColorKey;

  const [color, setColor] = useState<PositionColorKey>(initialColor);

  useEffect(() => {
    if (open) setColor(initialColor);
  }, [open, initialColor]);

  useEffect(() => {
    if (state.success && open) {
      toast.success(
        isEdit ? "Position mise à jour." : "Position créée.",
      );
      onOpenChange(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, open, isEdit, onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la position" : "Nouvelle position"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {isEdit && (
            <input type="hidden" name="positionId" value={position!.id} />
          )}
          <input type="hidden" name="color" value={color} />

          <div className="space-y-2">
            <Label htmlFor="position-name">Nom</Label>
            <Input
              id="position-name"
              name="name"
              required
              maxLength={40}
              defaultValue={position?.name ?? ""}
              autoFocus
            />
            {state.fieldErrors?.name && (
              <p className="text-destructive text-xs">
                {state.fieldErrors.name[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex flex-wrap gap-2">
              {POSITION_COLOR_KEYS.map((key) => {
                const palette = POSITION_COLORS[key];
                const selected = color === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setColor(key)}
                    aria-label={key}
                    aria-pressed={selected}
                    className={cn(
                      "size-8 rounded-full border-2 transition-all",
                      selected
                        ? "ring-ring ring-offset-background scale-110 ring-2 ring-offset-2"
                        : "border-border hover:scale-105",
                    )}
                    style={{
                      backgroundColor: palette.swatch,
                      borderColor: selected ? palette.swatch : undefined,
                    }}
                  />
                );
              })}
            </div>
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
              {pending
                ? "Enregistrement…"
                : isEdit
                  ? "Enregistrer"
                  : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

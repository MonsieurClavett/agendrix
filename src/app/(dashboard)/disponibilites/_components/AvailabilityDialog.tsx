"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createAvailabilityAction,
  type CreateAvailabilityState,
} from "@/actions/availability/create";
import {
  updateAvailabilityAction,
  type UpdateAvailabilityState,
} from "@/actions/availability/update";
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
import {
  DAY_LABELS_LONG,
  formatMinutesToHHMM,
} from "@/lib/availability";
import type { AvailabilityRow } from "@/lib/repositories/availability";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetEmployeeId: string;
  defaultDayOfWeek?: number;
  range?: AvailabilityRow | null;
};

const initialCreate: CreateAvailabilityState = {};
const initialUpdate: UpdateAvailabilityState = {};

export function AvailabilityDialog({
  open,
  onOpenChange,
  targetEmployeeId,
  defaultDayOfWeek,
  range,
}: Props) {
  const router = useRouter();
  const isEdit = !!range;

  const [createState, createForm, createPending] = useActionState(
    createAvailabilityAction,
    initialCreate,
  );
  const [updateState, updateForm, updatePending] = useActionState(
    updateAvailabilityAction,
    initialUpdate,
  );

  const state = isEdit ? updateState : createState;
  const formAction = isEdit ? updateForm : createForm;
  const pending = isEdit ? updatePending : createPending;

  useEffect(() => {
    if (state.success && open) {
      toast.success(isEdit ? "Plage mise à jour." : "Plage ajoutée.");
      onOpenChange(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, open, isEdit, onOpenChange, router]);

  const initialDay =
    range?.dayOfWeek ?? defaultDayOfWeek ?? 1; // default to Monday
  const initialStart = range ? formatMinutesToHHMM(range.startMinute) : "09:00";
  const initialEnd = range ? formatMinutesToHHMM(range.endMinute) : "17:00";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la plage" : "Ajouter une plage"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {isEdit ? (
            <input type="hidden" name="availabilityId" value={range!.id} />
          ) : (
            <input
              type="hidden"
              name="targetEmployeeId"
              value={targetEmployeeId}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="availability-day">Jour</Label>
            <select
              id="availability-day"
              name="dayOfWeek"
              required
              defaultValue={String(initialDay)}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-[3px] outline-none"
            >
              {DAY_LABELS_LONG.map((label, idx) => (
                <option key={idx} value={String(idx)}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="availability-start">Début</Label>
              <Input
                id="availability-start"
                name="startTime"
                type="time"
                required
                defaultValue={initialStart}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="availability-end">Fin</Label>
              <Input
                id="availability-end"
                name="endTime"
                type="time"
                required
                defaultValue={initialEnd}
              />
            </div>
          </div>

          <p className="text-muted-foreground text-xs">
            Astuce : pour couvrir une plage qui dépasse minuit, déclarez
            deux plages séparées (par ex. samedi 22:00–23:59 et dimanche
            00:00–02:00).
          </p>

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
                  : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

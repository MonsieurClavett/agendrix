"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createShiftChangeRequestAction,
  type CreateShiftChangeState,
} from "@/actions/shiftChangeRequests/create";
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
import { formatHHMM, formatLongDate } from "@/lib/week";
import type { WeekShift } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: WeekShift;
};

const initial: CreateShiftChangeState = {};

function toDateTimeLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

export function ChangeRequestDialog({ open, onOpenChange, shift }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createShiftChangeRequestAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Demande envoyée à votre gestionnaire.");
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
          <DialogTitle>Demander un changement d&apos;horaire</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Shift initial : <strong>{formatLongDate(shift.startsAt)}</strong>{" "}
          <strong className="tabular-nums">
            {formatHHMM(shift.startsAt)}–{formatHHMM(shift.endsAt)}
          </strong>
          . Votre gestionnaire approuvera ou refusera la modification.
        </p>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="shiftId" value={shift.id} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="requestedStartsAt">Nouveau début</Label>
              <Input
                id="requestedStartsAt"
                name="requestedStartsAt"
                type="datetime-local"
                defaultValue={toDateTimeLocal(shift.startsAt)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="requestedEndsAt">Nouvelle fin</Label>
              <Input
                id="requestedEndsAt"
                name="requestedEndsAt"
                type="datetime-local"
                defaultValue={toDateTimeLocal(shift.endsAt)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Raison (optionnelle)</Label>
            <textarea
              id="reason"
              name="reason"
              maxLength={280}
              rows={3}
              placeholder="Ex. RDV médical en avant-midi"
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] resize-none"
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
              {pending ? "Envoi…" : "Envoyer la demande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

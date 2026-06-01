"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  publishWeekAction,
  type PublishWeekState,
} from "@/actions/shifts/publishWeek";
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
  draftCount: number;
  weekStartISO: string;
  weekLabel: string;
};

const initial: PublishWeekState = {};

export function PublishWeekDialog({
  open,
  onOpenChange,
  draftCount,
  weekStartISO,
  weekLabel,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    publishWeekAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      const count = state.count ?? 0;
      toast.success(
        count > 0 ? `${count} shifts publiés.` : "Aucun shift à publier.",
      );
      onOpenChange(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, state.count, open, onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publier la semaine</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Publier <strong>{draftCount}</strong> shift
          {draftCount > 1 ? "s" : ""} pour la semaine du{" "}
          <strong>{weekLabel}</strong>&nbsp;? Les employés concernés verront
          immédiatement leurs horaires.
        </p>
        <form action={formAction}>
          <input type="hidden" name="weekStart" value={weekStartISO} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Publication…" : "Publier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

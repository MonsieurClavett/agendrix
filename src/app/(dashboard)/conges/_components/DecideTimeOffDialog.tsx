"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  decideTimeOffAction,
  type DecideTimeOffState,
} from "@/actions/timeOff/decide";
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
  requestId: string;
  decision: "APPROVED" | "REJECTED";
  summary: string;
};

const initial: DecideTimeOffState = {};

export function DecideTimeOffDialog({
  open,
  onOpenChange,
  requestId,
  decision,
  summary,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    decideTimeOffAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Décision enregistrée.");
      onOpenChange(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, open, onOpenChange, router]);

  const title =
    decision === "APPROVED" ? "Approuver la demande" : "Refuser la demande";
  const verb = decision === "APPROVED" ? "Approuver" : "Refuser";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm">{summary}</p>
        <form action={formAction}>
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="decision" value={decision} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant={decision === "APPROVED" ? "default" : "destructive"}
              disabled={pending}
            >
              {pending ? "Enregistrement…" : verb}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  deleteTemplateAction,
  type DeleteTemplateState,
} from "@/actions/scheduleTemplates/delete";
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
  templateId: string;
  templateName: string;
};

const initial: DeleteTemplateState = {};

export function DeleteTemplateDialog({
  open,
  onOpenChange,
  templateId,
  templateName,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deleteTemplateAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Modèle supprimé.");
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
          <DialogTitle>Supprimer le modèle</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Supprimer le modèle <strong>{templateName}</strong> ? Les shifts déjà
          créés à partir de ce modèle ne seront pas affectés.
        </p>
        <form action={formAction}>
          <input type="hidden" name="templateId" value={templateId} />
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

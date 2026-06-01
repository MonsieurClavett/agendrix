"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  renameTemplateAction,
  type RenameTemplateState,
} from "@/actions/scheduleTemplates/rename";
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
  templateId: string;
  currentName: string;
};

const initial: RenameTemplateState = {};

export function RenameTemplateDialog({
  open,
  onOpenChange,
  templateId,
  currentName,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    renameTemplateAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Modèle renommé.");
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
          <DialogTitle>Renommer le modèle</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="templateId" value={templateId} />
          <div className="space-y-1.5">
            <Label htmlFor="name">Nouveau nom</Label>
            <Input
              id="name"
              name="name"
              defaultValue={currentName}
              required
              maxLength={80}
              autoComplete="off"
              autoFocus
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
              {pending ? "Enregistrement…" : "Renommer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  deleteAnnouncementAction,
  type DeleteAnnouncementState,
} from "@/actions/announcements/delete";
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
  announcementId: string;
  title: string;
};

const initial: DeleteAnnouncementState = {};

export function DeleteAnnouncementDialog({
  open,
  onOpenChange,
  announcementId,
  title,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deleteAnnouncementAction,
    initial,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Annonce supprimée.");
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
          <DialogTitle>Supprimer l&apos;annonce</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Supprimer l&apos;annonce <strong>{title}</strong> ? Cette action est
          irréversible.
        </p>
        <form action={formAction}>
          <input type="hidden" name="id" value={announcementId} />
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

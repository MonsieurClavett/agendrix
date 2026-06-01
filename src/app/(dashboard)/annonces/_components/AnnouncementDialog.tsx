"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createAnnouncementAction,
  type CreateAnnouncementState,
} from "@/actions/announcements/create";
import {
  updateAnnouncementAction,
  type UpdateAnnouncementState,
} from "@/actions/announcements/update";
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
} & (
  | { mode: "create"; initial?: undefined }
  | { mode: "edit"; initial: { id: string; title: string; body: string } }
);

const initialCreateState: CreateAnnouncementState = {};
const initialUpdateState: UpdateAnnouncementState = {};

export function AnnouncementDialog(props: Props) {
  if (props.mode === "edit") return <EditDialog {...props} />;
  return <CreateDialog {...props} />;
}

function CreateDialog({
  open,
  onOpenChange,
}: Extract<Props, { mode: "create" }>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createAnnouncementAction,
    initialCreateState,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Annonce publiée.");
      onOpenChange(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, open, onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle annonce</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={120}
              autoFocus
              placeholder="Ex. Réunion lundi 9h"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Contenu</Label>
            <textarea
              id="body"
              name="body"
              maxLength={2000}
              rows={6}
              placeholder="Détails de l'annonce…"
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
              {pending ? "Publication…" : "Publier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  open,
  onOpenChange,
  initial,
}: Extract<Props, { mode: "edit" }>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateAnnouncementAction,
    initialUpdateState,
  );

  useEffect(() => {
    if (state.success && open) {
      toast.success("Annonce mise à jour.");
      onOpenChange(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, open, onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;annonce</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={initial.id} />
          <div className="space-y-1.5">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={120}
              defaultValue={initial.title}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Contenu</Label>
            <textarea
              id="body"
              name="body"
              maxLength={2000}
              rows={6}
              defaultValue={initial.body}
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
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

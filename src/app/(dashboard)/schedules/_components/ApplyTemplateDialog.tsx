"use client";

import * as React from "react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  applyTemplateAction,
  type ApplyTemplateState,
} from "@/actions/scheduleTemplates/apply";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export type TemplateOption = {
  id: string;
  name: string;
  shiftCount: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStartISO: string;
  weekLabel: string;
  templates: TemplateOption[];
};

const initial: ApplyTemplateState = {};

export function ApplyTemplateDialog({
  open,
  onOpenChange,
  weekStartISO,
  weekLabel,
  templates,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    applyTemplateAction,
    initial,
  );
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");

  useEffect(() => {
    if (state.success && open) {
      const count = state.createdCount ?? 0;
      toast.success(
        count > 0
          ? `${count} shift${count > 1 ? "s" : ""} créé${count > 1 ? "s" : ""} en brouillon.`
          : "Aucun shift créé (modèle vide).",
      );
      onOpenChange(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error, state.createdCount, open, onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appliquer un modèle</DialogTitle>
        </DialogHeader>
        {templates.length === 0 ? (
          <div className="space-y-3 text-sm">
            <p>
              Aucun modèle disponible. Sauvegardez une semaine existante comme
              modèle depuis la barre d&apos;outils.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Fermer
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <p className="text-sm">
              Copier tous les shifts d&apos;un modèle vers la semaine du{" "}
              <strong>{weekLabel}</strong>. Les shifts créés seront en{" "}
              <strong>brouillon</strong> pour vous laisser ajuster avant
              publication.
            </p>
            <form action={formAction} className="space-y-3">
              <input type="hidden" name="weekStart" value={weekStartISO} />
              <input type="hidden" name="templateId" value={templateId} />
              <div className="space-y-1.5">
                <Label htmlFor="template-select">Modèle</Label>
                <select
                  id="template-select"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm shadow-xs"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.shiftCount} shift{t.shiftCount > 1 ? "s" : ""})
                    </option>
                  ))}
                </select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={pending || !templateId}>
                  {pending ? "Application…" : "Appliquer"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

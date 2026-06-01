"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { formatLongDate } from "@/lib/week";
import { RenameTemplateDialog } from "./RenameTemplateDialog";
import { DeleteTemplateDialog } from "./DeleteTemplateDialog";

export type TemplateListRow = {
  id: string;
  name: string;
  createdAt: Date;
  shiftCount: number;
  createdByName: string | null;
};

type Props = {
  templates: TemplateListRow[];
};

export function TemplatesList({ templates }: Props) {
  const [renaming, setRenaming] = React.useState<TemplateListRow | null>(null);
  const [deleting, setDeleting] = React.useState<TemplateListRow | null>(null);

  if (templates.length === 0) {
    return (
      <div className="bg-card rounded-md border p-8 text-center">
        <p className="text-sm font-medium">Aucun modèle pour le moment</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Ouvrez une semaine d&apos;horaire, puis utilisez « Sauvegarder » dans
          la barre d&apos;outils pour créer votre premier modèle.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
              <th className="px-3 py-2 font-medium">Nom</th>
              <th className="px-3 py-2 font-medium">Shifts</th>
              <th className="px-3 py-2 font-medium">Créé par</th>
              <th className="px-3 py-2 font-medium">Créé le</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2 font-medium">{t.name}</td>
                <td className="text-muted-foreground px-3 py-2 tabular-nums">
                  {t.shiftCount}
                </td>
                <td className="text-muted-foreground px-3 py-2">
                  {t.createdByName ?? "—"}
                </td>
                <td className="text-muted-foreground px-3 py-2">
                  {formatLongDate(t.createdAt)}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRenaming(t)}
                    >
                      Renommer
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleting(t)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {renaming && (
        <RenameTemplateDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setRenaming(null);
          }}
          templateId={renaming.id}
          currentName={renaming.name}
        />
      )}

      {deleting && (
        <DeleteTemplateDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setDeleting(null);
          }}
          templateId={deleting.id}
          templateName={deleting.name}
        />
      )}
    </>
  );
}

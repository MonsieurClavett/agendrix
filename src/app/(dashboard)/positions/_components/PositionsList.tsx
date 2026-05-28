"use client";

import * as React from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPositionColor } from "@/lib/positions";
import { PositionDialog } from "./PositionDialog";
import { DeletePositionDialog } from "./DeletePositionDialog";

type Position = { id: string; name: string; color: string };

type Props = {
  positions: Position[];
  shiftCountsByPositionId: Map<string, number>;
};

export function PositionsList({ positions, shiftCountsByPositionId }: Props) {
  const [editPosition, setEditPosition] = React.useState<Position | null>(
    null,
  );
  const [deletePosition, setDeletePosition] = React.useState<Position | null>(
    null,
  );

  return (
    <>
      <div className="space-y-2">
        {positions.map((p) => {
          const palette = getPositionColor(p.color);
          const count = shiftCountsByPositionId.get(p.id) ?? 0;
          return (
            <Card
              key={p.id}
              className="flex flex-row items-center gap-4 px-4 py-3"
            >
              <div
                className="size-10 shrink-0 rounded-full border"
                style={{ backgroundColor: palette.swatch }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{p.name}</p>
                <p className="text-muted-foreground text-xs">
                  {count === 0
                    ? "Aucun shift assigné"
                    : `${count} shift${count > 1 ? "s" : ""} assigné${count > 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Modifier"
                  onClick={() => setEditPosition(p)}
                >
                  <PencilIcon />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Supprimer"
                  onClick={() => setDeletePosition(p)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {editPosition && (
        <PositionDialog
          key={editPosition.id}
          open={true}
          onOpenChange={(o) => {
            if (!o) setEditPosition(null);
          }}
          position={editPosition}
        />
      )}

      {deletePosition && (
        <DeletePositionDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setDeletePosition(null);
          }}
          positionId={deletePosition.id}
          positionName={deletePosition.name}
          shiftCount={shiftCountsByPositionId.get(deletePosition.id) ?? 0}
        />
      )}
    </>
  );
}

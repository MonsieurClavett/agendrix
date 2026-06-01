"use client";

import * as React from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMinutesToHHMM } from "@/lib/availability";
import type { AvailabilityRow } from "@/lib/repositories/availability";

type Props = {
  range: AvailabilityRow;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function AvailabilityRangeRow({
  range,
  canEdit,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="border-border bg-card flex items-center gap-2 rounded-full border py-1 pr-1 pl-3 text-sm">
      <span className="font-medium tabular-nums">
        {formatMinutesToHHMM(range.startMinute)}–
        {formatMinutesToHHMM(range.endMinute)}
      </span>
      {canEdit && (
        <div className="flex items-center">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={onEdit}
            aria-label="Modifier la plage"
          >
            <PencilIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={onDelete}
            aria-label="Supprimer la plage"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

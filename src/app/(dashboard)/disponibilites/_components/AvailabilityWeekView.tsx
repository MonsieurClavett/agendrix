"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DAY_LABELS_LONG,
  formatMinutesToHHMM,
} from "@/lib/availability";
import type { AvailabilityRow } from "@/lib/repositories/availability";
import { AvailabilityDialog } from "./AvailabilityDialog";
import { AvailabilityRangeRow } from "./AvailabilityRangeRow";
import { DeleteAvailabilityDialog } from "./DeleteAvailabilityDialog";

type Props = {
  ranges: AvailabilityRow[];
  targetEmployeeId: string;
  canEdit: boolean;
};

export function AvailabilityWeekView({
  ranges,
  targetEmployeeId,
  canEdit,
}: Props) {
  const [createState, setCreateState] = React.useState<{
    dayOfWeek: number;
  } | null>(null);
  const [editRange, setEditRange] = React.useState<AvailabilityRow | null>(
    null,
  );
  const [deleteRange, setDeleteRange] =
    React.useState<AvailabilityRow | null>(null);

  const byDay = React.useMemo(() => {
    const map = new Map<number, AvailabilityRow[]>();
    for (let i = 0; i < 7; i++) map.set(i, []);
    for (const r of ranges) {
      map.get(r.dayOfWeek)?.push(r);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startMinute - b.startMinute);
    }
    return map;
  }, [ranges]);

  const deleteSummary = deleteRange
    ? `${DAY_LABELS_LONG[deleteRange.dayOfWeek]} ${formatMinutesToHHMM(deleteRange.startMinute)}–${formatMinutesToHHMM(deleteRange.endMinute)}`
    : "";

  return (
    <>
      <Card>
        <CardContent className="divide-border divide-y p-0">
          {DAY_LABELS_LONG.map((label, dayIdx) => {
            const dayRanges = byDay.get(dayIdx) ?? [];
            return (
              <div
                key={dayIdx}
                className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[140px_1fr_auto] sm:items-center"
              >
                <div className="font-medium">{label}</div>
                <div className="flex flex-wrap gap-2">
                  {dayRanges.length === 0 ? (
                    <span className="text-muted-foreground text-sm">
                      Aucune plage
                    </span>
                  ) : (
                    dayRanges.map((r) => (
                      <AvailabilityRangeRow
                        key={r.id}
                        range={r}
                        canEdit={canEdit}
                        onEdit={() => setEditRange(r)}
                        onDelete={() => setDeleteRange(r)}
                      />
                    ))
                  )}
                </div>
                {canEdit && (
                  <div className="flex justify-start sm:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setCreateState({ dayOfWeek: dayIdx })}
                    >
                      <PlusIcon className="size-4" />
                      Ajouter
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {createState && (
        <AvailabilityDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setCreateState(null);
          }}
          targetEmployeeId={targetEmployeeId}
          defaultDayOfWeek={createState.dayOfWeek}
        />
      )}

      {editRange && (
        <AvailabilityDialog
          key={editRange.id}
          open={true}
          onOpenChange={(o) => {
            if (!o) setEditRange(null);
          }}
          targetEmployeeId={targetEmployeeId}
          range={editRange}
        />
      )}

      {deleteRange && (
        <DeleteAvailabilityDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setDeleteRange(null);
          }}
          availabilityId={deleteRange.id}
          summary={deleteSummary}
        />
      )}
    </>
  );
}

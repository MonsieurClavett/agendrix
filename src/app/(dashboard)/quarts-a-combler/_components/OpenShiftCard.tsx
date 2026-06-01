"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPositionColor } from "@/lib/positions";
import { formatHHMM, formatLongDate } from "@/lib/week";
import type { ShiftRow } from "@/lib/repositories/shift";
import type { ClaimRow } from "@/lib/repositories/shiftClaim";

type Props = {
  shift: ShiftRow;
  myClaim: ClaimRow | null;
  onClaimClick: () => void;
  onCancelClick: () => void;
};

export function OpenShiftCard({
  shift,
  myClaim,
  onClaimClick,
  onCancelClick,
}: Props) {
  const palette = shift.position
    ? getPositionColor(shift.position.color)
    : null;

  return (
    <Card>
      <CardContent
        className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4"
        style={{
          borderLeft: palette ? `3px solid ${palette.accent}` : undefined,
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">
            {formatLongDate(shift.startsAt)}
          </div>
          <div className="text-foreground tabular-nums text-sm">
            {formatHHMM(shift.startsAt)}–{formatHHMM(shift.endsAt)}
          </div>
          <div className="text-muted-foreground text-xs">
            {shift.position?.name ?? "Aucune position"}
            {shift.note ? ` · ${shift.note}` : ""}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {myClaim === null ? (
            <Button type="button" onClick={onClaimClick}>
              Je veux ce quart
            </Button>
          ) : myClaim.status === "PENDING" ? (
            <>
              <Badge variant="secondary">Demande envoyée</Badge>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onCancelClick}
              >
                Annuler
              </Button>
            </>
          ) : myClaim.status === "APPROVED" ? (
            <Badge>Demande approuvée</Badge>
          ) : (
            <Badge variant="destructive">Demande refusée</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { formatHHMM, formatLongDate } from "@/lib/week";
import type { ShiftRow } from "@/lib/repositories/shift";
import type { ClaimRow } from "@/lib/repositories/shiftClaim";
import { CancelClaimDialog } from "./CancelClaimDialog";
import { ClaimShiftDialog } from "./ClaimShiftDialog";
import { OpenShiftCard } from "./OpenShiftCard";

type Props = {
  openShifts: ShiftRow[];
  myClaimByShift: Record<string, ClaimRow>;
};

export function OpenShiftsList({ openShifts, myClaimByShift }: Props) {
  const [claimTarget, setClaimTarget] = React.useState<ShiftRow | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<ClaimRow | null>(
    null,
  );

  if (openShifts.length === 0) {
    return (
      <Card className="mx-auto max-w-md py-10">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <p className="text-lg font-medium">Aucun quart à combler.</p>
          <p className="text-muted-foreground text-sm">
            Revenez plus tard ou demandez à votre gestionnaire.
          </p>
        </CardContent>
      </Card>
    );
  }

  const summaryFor = (shift: ShiftRow): string =>
    `${formatLongDate(shift.startsAt)} ${formatHHMM(shift.startsAt)}–${formatHHMM(shift.endsAt)}${
      shift.position ? ` · ${shift.position.name}` : ""
    }`;

  return (
    <>
      <div className="space-y-3">
        {openShifts.map((shift) => {
          const myClaim = myClaimByShift[shift.id] ?? null;
          return (
            <OpenShiftCard
              key={shift.id}
              shift={shift}
              myClaim={myClaim}
              onClaimClick={() => setClaimTarget(shift)}
              onCancelClick={() => myClaim && setCancelTarget(myClaim)}
            />
          );
        })}
      </div>

      {claimTarget && (
        <ClaimShiftDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setClaimTarget(null);
          }}
          shiftId={claimTarget.id}
          summary={summaryFor(claimTarget)}
        />
      )}

      {cancelTarget && (
        <CancelClaimDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setCancelTarget(null);
          }}
          claimId={cancelTarget.id}
          summary={(() => {
            const shift = openShifts.find((s) => s.id === cancelTarget.shiftId);
            return shift ? summaryFor(shift) : cancelTarget.shiftId;
          })()}
        />
      )}
    </>
  );
}

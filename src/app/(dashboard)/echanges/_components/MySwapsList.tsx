"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ShiftSwapRow } from "@/lib/repositories/shiftSwap";
import { CancelSwapDialog } from "./CancelSwapDialog";
import { SwapCard } from "./SwapCard";

type Props = {
  swaps: ShiftSwapRow[];
};

export function MySwapsList({ swaps }: Props) {
  const [cancelTarget, setCancelTarget] = React.useState<ShiftSwapRow | null>(
    null,
  );

  if (swaps.length === 0) {
    return (
      <Card className="mx-auto max-w-md py-10">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <p className="text-lg font-medium">
            Aucune proposition pour le moment.
          </p>
          <p className="text-muted-foreground text-sm">
            Allez sur la page Horaires et cliquez sur un de vos shifts pour en
            proposer un.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {swaps.map((s) => {
          const cancelable =
            s.status === "PENDING_PEER" || s.status === "PENDING_MANAGER";
          return (
            <SwapCard key={s.id} swap={s} perspective="proposer">
              {cancelable && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setCancelTarget(s)}
                >
                  Annuler
                </Button>
              )}
            </SwapCard>
          );
        })}
      </div>

      {cancelTarget && (
        <CancelSwapDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setCancelTarget(null);
          }}
          swapId={cancelTarget.id}
        />
      )}
    </>
  );
}

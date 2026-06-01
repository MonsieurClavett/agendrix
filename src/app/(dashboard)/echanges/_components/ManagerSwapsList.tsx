"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ShiftSwapRow } from "@/lib/repositories/shiftSwap";
import { ManagerDecideDialog } from "./ManagerDecideDialog";
import { SwapCard } from "./SwapCard";

type Props = {
  swaps: ShiftSwapRow[];
};

export function ManagerSwapsList({ swaps }: Props) {
  const [decideTarget, setDecideTarget] = React.useState<{
    swap: ShiftSwapRow;
    decision: "APPROVE" | "REJECT";
  } | null>(null);

  if (swaps.length === 0) {
    return (
      <Card className="mx-auto max-w-md py-10">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <p className="text-lg font-medium">Aucun échange à approuver.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {swaps.map((s) => (
          <SwapCard key={s.id} swap={s} perspective="manager">
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() =>
                setDecideTarget({ swap: s, decision: "APPROVE" })
              }
            >
              Approuver
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() =>
                setDecideTarget({ swap: s, decision: "REJECT" })
              }
            >
              Refuser
            </Button>
          </SwapCard>
        ))}
      </div>

      {decideTarget && (
        <ManagerDecideDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setDecideTarget(null);
          }}
          swapId={decideTarget.swap.id}
          decision={decideTarget.decision}
        />
      )}
    </>
  );
}

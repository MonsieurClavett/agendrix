"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ShiftSwapRow } from "@/lib/repositories/shiftSwap";
import { PeerDecideDialog } from "./PeerDecideDialog";
import { SwapCard } from "./SwapCard";

type Props = {
  swaps: ShiftSwapRow[];
};

export function IncomingSwapsList({ swaps }: Props) {
  const [decideTarget, setDecideTarget] = React.useState<{
    swap: ShiftSwapRow;
    decision: "ACCEPT" | "REJECT";
  } | null>(null);

  if (swaps.length === 0) {
    return (
      <Card className="mx-auto max-w-md py-10">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <p className="text-lg font-medium">
            Aucune proposition à traiter.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {swaps.map((s) => (
          <SwapCard key={s.id} swap={s} perspective="incoming">
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() =>
                setDecideTarget({ swap: s, decision: "ACCEPT" })
              }
            >
              Accepter
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
        <PeerDecideDialog
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

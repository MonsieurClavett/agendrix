"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatHHMM, formatLongDate } from "@/lib/week";
import type { ShiftSwapRow } from "@/lib/repositories/shiftSwap";

type Props = {
  swap: ShiftSwapRow;
  perspective: "proposer" | "incoming" | "manager";
  children?: React.ReactNode;
};

function statusLabel(status: ShiftSwapRow["status"]): string {
  switch (status) {
    case "PENDING_PEER":
      return "En attente du collègue";
    case "PENDING_MANAGER":
      return "En attente du gestionnaire";
    case "APPROVED":
      return "Approuvé";
    case "REJECTED_BY_PEER":
      return "Refusé par le collègue";
    case "REJECTED_BY_MANAGER":
      return "Refusé par le gestionnaire";
    case "CANCELED_BY_PROPOSER":
      return "Annulé";
  }
}

function statusVariant(
  status: ShiftSwapRow["status"],
): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "APPROVED") return "default";
  if (
    status === "REJECTED_BY_PEER" ||
    status === "REJECTED_BY_MANAGER" ||
    status === "CANCELED_BY_PROPOSER"
  )
    return "destructive";
  return "secondary";
}

function shiftLabel(s: ShiftSwapRow["proposerShift"]): string {
  return `${formatLongDate(s.startsAt)} ${formatHHMM(s.startsAt)}–${formatHHMM(s.endsAt)}`;
}

export function SwapCard({ swap, perspective, children }: Props) {
  const proposerName = swap.proposerUser.name ?? "(sans nom)";
  const targetName = swap.targetUser.name ?? "(sans nom)";

  return (
    <Card>
      <CardContent className="space-y-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(swap.status)}>
            {statusLabel(swap.status)}
          </Badge>
          {perspective === "manager" && (
            <span className="text-muted-foreground text-xs">
              Demande de {proposerName}
            </span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border p-2 text-sm">
            <p className="text-muted-foreground text-xs">
              {perspective === "incoming" ? "Vous prendriez" : `${proposerName} cède`}
            </p>
            <p className="font-medium">{shiftLabel(swap.proposerShift)}</p>
          </div>
          <div className="rounded-md border p-2 text-sm">
            <p className="text-muted-foreground text-xs">
              {perspective === "incoming"
                ? "Vous cédez"
                : perspective === "proposer"
                  ? `${targetName} cèderait`
                  : `${targetName} cède`}
            </p>
            <p className="font-medium">{shiftLabel(swap.targetShift)}</p>
          </div>
        </div>
        {swap.proposerMessage && (
          <p className="text-muted-foreground text-sm italic">
            « {swap.proposerMessage} »
          </p>
        )}
        {swap.peerRejectionReason && (
          <p className="text-muted-foreground text-xs">
            Raison du refus : {swap.peerRejectionReason}
          </p>
        )}
        {swap.managerRejectionReason && (
          <p className="text-muted-foreground text-xs">
            Raison du refus du gestionnaire : {swap.managerRejectionReason}
          </p>
        )}
        {children && (
          <div className="flex flex-wrap items-center gap-2">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

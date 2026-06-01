"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatHHMM, formatLongDate } from "@/lib/week";
import type { ShiftChangeRequestRow } from "@/lib/repositories/shiftChangeRequest";
import { CancelRequestDialog } from "./CancelRequestDialog";

const STATUS_LABELS: Record<ShiftChangeRequestRow["status"], string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
  CANCELED_BY_EMPLOYEE: "Annulée",
};

const STATUS_TONE: Record<ShiftChangeRequestRow["status"], string> = {
  PENDING: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  APPROVED: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
  REJECTED: "border-rose-500/40 text-rose-700 dark:text-rose-400",
  CANCELED_BY_EMPLOYEE: "border-muted-foreground/40 text-muted-foreground",
};

export function MyRequestsList({
  requests,
}: {
  requests: ShiftChangeRequestRow[];
}) {
  const [canceling, setCanceling] = React.useState<ShiftChangeRequestRow | null>(
    null,
  );
  return (
    <>
      <div className="grid gap-3">
        {requests.map((req) => (
          <article key={req.id} className="bg-card rounded-xl border p-4">
            <header className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className={STATUS_TONE[req.status]}>
                {STATUS_LABELS[req.status]}
              </Badge>
              <span className="text-muted-foreground text-xs">
                Demande pour le shift du {formatLongDate(req.shift.startsAt)}
              </span>
            </header>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wide font-medium">
                  Initial
                </p>
                <p className="tabular-nums">
                  {formatHHMM(req.shift.startsAt)}–
                  {formatHHMM(req.shift.endsAt)}
                </p>
              </div>
              <div className="rounded-lg border-primary/30 border bg-primary/5 p-3">
                <p className="text-primary text-[10px] uppercase tracking-wide font-medium">
                  Demandé
                </p>
                <p className="tabular-nums">
                  {formatHHMM(req.requestedStartsAt)}–
                  {formatHHMM(req.requestedEndsAt)}
                </p>
              </div>
            </div>

            {req.reason && (
              <p className="text-muted-foreground mt-3 whitespace-pre-wrap text-sm">
                Votre raison : « {req.reason} »
              </p>
            )}
            {req.managerNote && (
              <p className="text-muted-foreground mt-1 whitespace-pre-wrap text-sm">
                Note du gestionnaire : « {req.managerNote} »
              </p>
            )}

            {req.status === "PENDING" && (
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setCanceling(req)}
                >
                  Annuler ma demande
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>

      {canceling && (
        <CancelRequestDialog
          open
          onOpenChange={(o) => {
            if (!o) setCanceling(null);
          }}
          requestId={canceling.id}
        />
      )}
    </>
  );
}

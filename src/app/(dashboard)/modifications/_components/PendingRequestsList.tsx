"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { formatHHMM, formatLongDate } from "@/lib/week";
import type { ShiftChangeRequestRow } from "@/lib/repositories/shiftChangeRequest";
import { ApproveDialog } from "./ApproveDialog";
import { RejectDialog } from "./RejectDialog";

type Props = {
  requests: ShiftChangeRequestRow[];
};

export function PendingRequestsList({ requests }: Props) {
  const [approving, setApproving] = React.useState<ShiftChangeRequestRow | null>(
    null,
  );
  const [rejecting, setRejecting] = React.useState<ShiftChangeRequestRow | null>(
    null,
  );

  return (
    <>
      <div className="grid gap-3">
        {requests.map((req) => (
          <article
            key={req.id}
            className="bg-card lift-on-hover rounded-xl border p-4"
          >
            <header className="mb-3 flex items-center gap-3">
              <Avatar name={req.employee.name ?? req.employee.email} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {req.employee.name ?? req.employee.email}
                </p>
                <p className="text-muted-foreground text-xs">
                  demande à modifier son shift
                </p>
              </div>
            </header>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wide font-medium">
                  Shift prévu
                </p>
                <p className="font-medium">
                  {formatLongDate(req.shift.startsAt)}
                </p>
                <p className="tabular-nums">
                  {formatHHMM(req.shift.startsAt)}–{formatHHMM(req.shift.endsAt)}
                </p>
              </div>
              <div className="rounded-lg border-primary/30 border bg-primary/5 p-3">
                <p className="text-primary text-[10px] uppercase tracking-wide font-medium">
                  Demandé
                </p>
                <p className="font-medium">
                  {formatLongDate(req.requestedStartsAt)}
                </p>
                <p className="tabular-nums">
                  {formatHHMM(req.requestedStartsAt)}–
                  {formatHHMM(req.requestedEndsAt)}
                </p>
              </div>
            </div>

            {req.reason && (
              <p className="text-muted-foreground mt-3 whitespace-pre-wrap text-sm">
                « {req.reason} »
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejecting(req)}
              >
                Refuser
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setApproving(req)}
              >
                Approuver
              </Button>
            </div>
          </article>
        ))}
      </div>

      {approving && (
        <ApproveDialog
          open
          onOpenChange={(o) => {
            if (!o) setApproving(null);
          }}
          request={approving}
        />
      )}
      {rejecting && (
        <RejectDialog
          open
          onOpenChange={(o) => {
            if (!o) setRejecting(null);
          }}
          request={rejecting}
        />
      )}
    </>
  );
}

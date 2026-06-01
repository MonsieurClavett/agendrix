"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatLongDate } from "@/lib/week";
import { TIME_OFF_TYPE_LABELS } from "@/lib/timeOff";
import type { TimeOffRequestRow as TimeOffRow } from "@/lib/repositories/timeOff";
import { DecideTimeOffDialog } from "./DecideTimeOffDialog";
import { TimeOffRequestRow } from "./TimeOffRequestRow";

type Props = {
  requests: TimeOffRow[];
};

export function ManagerPendingList({ requests }: Props) {
  const [decideTarget, setDecideTarget] = React.useState<{
    request: TimeOffRow;
    decision: "APPROVED" | "REJECTED";
  } | null>(null);

  if (requests.length === 0) {
    return (
      <Card className="mx-auto max-w-md py-10">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <p className="text-lg font-medium">Aucune demande à approuver.</p>
          <p className="text-muted-foreground text-sm">
            Les nouvelles demandes apparaîtront ici.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {requests.map((r) => (
          <TimeOffRequestRow key={r.id} request={r} showEmployee>
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() =>
                setDecideTarget({ request: r, decision: "APPROVED" })
              }
            >
              Approuver
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() =>
                setDecideTarget({ request: r, decision: "REJECTED" })
              }
            >
              Refuser
            </Button>
          </TimeOffRequestRow>
        ))}
      </div>

      {decideTarget && (
        <DecideTimeOffDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setDecideTarget(null);
          }}
          requestId={decideTarget.request.id}
          decision={decideTarget.decision}
          summary={`${decideTarget.request.employee.name ?? "(sans nom)"} — ${TIME_OFF_TYPE_LABELS[decideTarget.request.type]} du ${formatLongDate(decideTarget.request.startDate)}${
            decideTarget.request.startDate.getTime() !==
            decideTarget.request.endDate.getTime()
              ? ` au ${formatLongDate(decideTarget.request.endDate)}`
              : ""
          }`}
        />
      )}
    </>
  );
}

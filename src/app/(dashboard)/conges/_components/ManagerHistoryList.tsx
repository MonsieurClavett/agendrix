"use client";

import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { formatLongDate } from "@/lib/week";
import { TIME_OFF_TYPE_LABELS } from "@/lib/timeOff";
import type { TimeOffRequestRow as TimeOffRow } from "@/lib/repositories/timeOff";
import { CancelTimeOffDialog } from "./CancelTimeOffDialog";
import { TimeOffRequestRow } from "./TimeOffRequestRow";

type Props = {
  requests: TimeOffRow[];
};

export function ManagerHistoryList({ requests }: Props) {
  const [deleteTarget, setDeleteTarget] = React.useState<TimeOffRow | null>(
    null,
  );

  if (requests.length === 0) {
    return (
      <Card className="mx-auto max-w-md py-10">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <p className="text-lg font-medium">Aucune décision passée.</p>
          <p className="text-muted-foreground text-sm">
            Les approbations et refus apparaîtront ici.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {requests.map((r) => (
          <TimeOffRequestRow
            key={r.id}
            request={r}
            showEmployee
            canCancel
            onCancelClick={() => setDeleteTarget(r)}
          />
        ))}
      </div>

      {deleteTarget && (
        <CancelTimeOffDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setDeleteTarget(null);
          }}
          requestId={deleteTarget.id}
          summary={`${deleteTarget.employee.name ?? "(sans nom)"} — ${TIME_OFF_TYPE_LABELS[deleteTarget.type]} (${formatLongDate(deleteTarget.startDate)})`}
          successLabel="Demande supprimée."
        />
      )}
    </>
  );
}

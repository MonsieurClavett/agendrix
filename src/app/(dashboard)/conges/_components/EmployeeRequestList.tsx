"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatLongDate } from "@/lib/week";
import { TIME_OFF_TYPE_LABELS } from "@/lib/timeOff";
import type { TimeOffRequestRow as TimeOffRow } from "@/lib/repositories/timeOff";
import { CancelTimeOffDialog } from "./CancelTimeOffDialog";
import { CreateTimeOffDialog } from "./CreateTimeOffDialog";
import { TimeOffRequestRow } from "./TimeOffRequestRow";

type Props = {
  requests: TimeOffRow[];
  targetEmployeeId: string;
};

export function EmployeeRequestList({ requests, targetEmployeeId }: Props) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [cancelTarget, setCancelTarget] = React.useState<TimeOffRow | null>(
    null,
  );

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" />
          Nouvelle demande
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card className="mx-auto max-w-md py-10">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <p className="text-lg font-medium">
              Aucune demande pour le moment.
            </p>
            <p className="text-muted-foreground text-sm">
              Soumettez votre première demande de congé pour qu'elle apparaisse
              ici.
            </p>
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <PlusIcon className="size-4" />
              Nouvelle demande
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <TimeOffRequestRow
              key={r.id}
              request={r}
              canCancel={r.status === "PENDING"}
              onCancelClick={() => setCancelTarget(r)}
            />
          ))}
        </div>
      )}

      {createOpen && (
        <CreateTimeOffDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setCreateOpen(false);
          }}
          targetEmployeeId={targetEmployeeId}
        />
      )}

      {cancelTarget && (
        <CancelTimeOffDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setCancelTarget(null);
          }}
          requestId={cancelTarget.id}
          summary={`${TIME_OFF_TYPE_LABELS[cancelTarget.type]} — ${formatLongDate(cancelTarget.startDate)}${
            cancelTarget.startDate.getTime() !== cancelTarget.endDate.getTime()
              ? ` → ${formatLongDate(cancelTarget.endDate)}`
              : ""
          }`}
        />
      )}
    </>
  );
}

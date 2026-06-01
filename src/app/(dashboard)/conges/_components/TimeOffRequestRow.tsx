"use client";

import * as React from "react";
import { Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatLongDate } from "@/lib/week";
import {
  TIME_OFF_STATUS_LABELS,
  TIME_OFF_TYPE_LABELS,
} from "@/lib/timeOff";
import type { TimeOffRequestRow as TimeOffRow } from "@/lib/repositories/timeOff";

type Props = {
  request: TimeOffRow;
  showEmployee?: boolean;
  canCancel?: boolean;
  onCancelClick?: () => void;
  children?: React.ReactNode;
};

function dateRangeLabel(start: Date, end: Date): string {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) return formatLongDate(start);
  return `${formatLongDate(start)} → ${formatLongDate(end)}`;
}

function statusVariant(status: TimeOffRow["status"]) {
  switch (status) {
    case "APPROVED":
      return "default" as const;
    case "REJECTED":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export function TimeOffRequestRow({
  request,
  showEmployee = false,
  canCancel = false,
  onCancelClick,
  children,
}: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {dateRangeLabel(request.startDate, request.endDate)}
            </span>
            <Badge variant="outline">
              {TIME_OFF_TYPE_LABELS[request.type]}
            </Badge>
            <Badge variant={statusVariant(request.status)}>
              {TIME_OFF_STATUS_LABELS[request.status]}
            </Badge>
            {showEmployee && (
              <span className="text-muted-foreground text-xs">
                · {request.employee.name ?? "(sans nom)"}
              </span>
            )}
          </div>
          {request.reason && (
            <p className="text-muted-foreground mt-1 text-sm">
              {request.reason}
            </p>
          )}
          {request.status !== "PENDING" && request.decidedAt && (
            <p className="text-muted-foreground mt-1 text-xs">
              Décidée le {formatLongDate(request.decidedAt)}
              {request.decidedBy?.name
                ? ` par ${request.decidedBy.name}`
                : ""}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {children}
          {canCancel && onCancelClick && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onCancelClick}
              aria-label="Supprimer la demande"
            >
              <Trash2Icon className="size-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

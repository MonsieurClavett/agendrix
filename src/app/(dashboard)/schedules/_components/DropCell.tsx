"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import { toISODate } from "@/lib/week";

type Props = {
  day: Date;
  employeeId: string;
  enabled: boolean;
  children: React.ReactNode;
};

export function DropCell({ day, employeeId, enabled, children }: Props) {
  const id = `${toISODate(day)}|${employeeId}`;
  const droppable = useDroppable({ id, disabled: !enabled });

  return (
    <div
      ref={enabled ? droppable.setNodeRef : undefined}
      data-cell-id={id}
      className={cn(
        "border-border flex min-h-[72px] flex-col gap-1.5 border-r border-b p-1.5 last:border-r-0",
        droppable.isOver && "bg-primary/10",
      )}
    >
      {children}
    </div>
  );
}

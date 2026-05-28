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
  /** Total height of the cell in px (= 24 * hourHeight typically). */
  height: number;
};

export function DropCell({
  day,
  employeeId,
  enabled,
  children,
  height,
}: Props) {
  const id = `${toISODate(day)}|${employeeId}`;
  const droppable = useDroppable({ id, disabled: !enabled });

  return (
    <div
      ref={enabled ? droppable.setNodeRef : undefined}
      data-cell-id={id}
      style={{ height: `${height}px` }}
      className={cn(
        "border-border relative border-r border-b last:border-r-0",
        droppable.isOver && "bg-accent/40",
      )}
    >
      {children}
    </div>
  );
}

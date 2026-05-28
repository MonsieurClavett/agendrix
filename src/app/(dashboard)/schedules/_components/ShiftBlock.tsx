"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import { formatHHMM, dayDiff } from "@/lib/week";
import type { WeekShift } from "./types";

type Props = {
  shift: WeekShift;
  canDrag: boolean;
  onClick?: () => void;
  /** Pixels per hour (matches WeekGridDesktop `--hour-height`). */
  hourHeight: number;
};

export function ShiftBlock({ shift, canDrag, onClick, hourHeight }: Props) {
  const start = shift.startsAt;
  const end = shift.endsAt;
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const durationMinutes = Math.max(
    30,
    (end.getTime() - start.getTime()) / 60_000,
  );
  const top = (startMinutes / 60) * hourHeight;
  const height = (durationMinutes / 60) * hourHeight;
  const startStr = formatHHMM(start);
  const endStr = formatHHMM(end);
  const offset = dayDiff(start, end);
  const endSuffix = offset > 0 ? ` (+${offset}j)` : "";

  const draggable = useDraggable({
    id: shift.id,
    data: shift,
    disabled: !canDrag,
  });

  const style: React.CSSProperties = {
    top: `${top}px`,
    height: `${height}px`,
    transform: draggable.transform
      ? `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`
      : undefined,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (draggable.isDragging) return;
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  return (
    <div
      ref={canDrag ? draggable.setNodeRef : undefined}
      style={style}
      className={cn(
        "bg-primary text-primary-foreground absolute left-1 right-1 z-10 overflow-hidden rounded-md px-2 py-1 shadow-sm select-none",
        canDrag && "cursor-grab active:cursor-grabbing",
        draggable.isDragging && "z-30 opacity-70 shadow-lg",
        !shift.employee.isActive && "bg-muted text-muted-foreground",
      )}
      onClick={handleClick}
      {...(canDrag ? draggable.attributes : {})}
      {...(canDrag ? draggable.listeners : {})}
    >
      <div className="text-xs font-semibold">
        {startStr}–{endStr}
        {endSuffix}
      </div>
      {shift.note && height > 40 && (
        <div className="mt-0.5 truncate text-xs opacity-90">{shift.note}</div>
      )}
    </div>
  );
}

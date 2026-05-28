"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import { formatHHMM, dayDiff } from "@/lib/week";
import { getPositionColor } from "@/lib/positions";
import type { WeekShift } from "./types";

type Props = {
  shift: WeekShift;
  canDrag: boolean;
  onClick?: () => void;
  showEmployeeName?: boolean;
};

export function ShiftBlock({
  shift,
  canDrag,
  onClick,
  showEmployeeName = false,
}: Props) {
  const startStr = formatHHMM(shift.startsAt);
  const endStr = formatHHMM(shift.endsAt);
  const offset = dayDiff(shift.startsAt, shift.endsAt);
  const endSuffix = offset > 0 ? ` (+${offset}j)` : "";
  const positionName = shift.position?.name;
  const secondary = positionName || shift.note?.trim() || "Quart";

  const draggable = useDraggable({
    id: shift.id,
    data: shift,
    disabled: !canDrag,
  });

  const baseTransform = draggable.transform
    ? `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`
    : undefined;

  const palette = shift.position
    ? getPositionColor(shift.position.color)
    : null;

  const style: React.CSSProperties = {
    transform: baseTransform,
    borderLeft: palette ? `3px solid ${palette.accent}` : undefined,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (draggable.isDragging) return;
    if (!onClick) return;
    e.stopPropagation();
    onClick();
  };

  return (
    <div
      ref={canDrag ? draggable.setNodeRef : undefined}
      style={style}
      className={cn(
        "bg-background hover:bg-accent/40 rounded-md border px-2 py-1.5 text-left shadow-xs select-none",
        canDrag && "cursor-grab active:cursor-grabbing",
        draggable.isDragging && "z-30 opacity-60 shadow-lg",
        !shift.employee.isActive && "border-dashed opacity-70",
        onClick && !canDrag && "cursor-pointer",
      )}
      onClick={handleClick}
      {...(canDrag ? draggable.attributes : {})}
      {...(canDrag ? draggable.listeners : {})}
    >
      {showEmployeeName && (
        <div className="text-foreground truncate text-[11px] font-medium">
          {shift.employee.name ?? "(sans nom)"}
        </div>
      )}
      <div className="text-foreground text-sm font-semibold tabular-nums">
        {startStr}–{endStr}
        {endSuffix}
      </div>
      <div className="text-muted-foreground truncate text-xs">{secondary}</div>
    </div>
  );
}

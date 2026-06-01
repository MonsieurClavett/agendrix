"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { AlertTriangle, CalendarOff, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatHHMM, dayDiff } from "@/lib/week";
import { getPositionColor } from "@/lib/positions";
import { isShiftOffAvailability } from "@/lib/availability";
import type { AvailabilityRow } from "@/lib/repositories/availability";
import type { WeekShift } from "./types";

type Props = {
  shift: WeekShift;
  canDrag: boolean;
  onClick?: () => void;
  showEmployeeName?: boolean;
  availabilities?: AvailabilityRow[];
  isOnApprovedTimeOff?: boolean;
  isInPendingSwap?: boolean;
  onResize?: (shift: WeekShift, newStart: Date, newEnd: Date) => void;
};

// Heuristic: 1 day cell is ~240px wide → 1440 minutes / 240px = 6 min/px.
// Snap is 15 min ⇒ each "step" = 2.5px. Good resolution.
const DAY_WIDTH_PX_DEFAULT = 240;
const MINUTES_PER_DAY = 24 * 60;
const SNAP_MINUTES = 15;
const MIN_DURATION_MIN = 15;
const MAX_DURATION_MIN = 24 * 60;

export function ShiftBlock({
  shift,
  canDrag,
  onClick,
  showEmployeeName = false,
  availabilities = [],
  isOnApprovedTimeOff = false,
  isInPendingSwap = false,
  onResize,
}: Props) {
  const [preview, setPreview] = React.useState<{
    start: Date;
    end: Date;
  } | null>(null);

  const draggable = useDraggable({
    id: shift.id,
    data: shift,
    disabled: !canDrag || preview !== null,
  });

  const effective = preview ?? { start: shift.startsAt, end: shift.endsAt };
  const startStr = formatHHMM(effective.start);
  const endStr = formatHHMM(effective.end);
  const offset = dayDiff(effective.start, effective.end);
  const endSuffix = offset > 0 ? ` (+${offset}j)` : "";
  const positionName = shift.position?.name;
  const secondary = positionName || shift.note?.trim() || "Quart";

  const baseTransform = draggable.transform
    ? `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`
    : undefined;

  const palette = shift.position
    ? getPositionColor(shift.position.color)
    : null;

  const isOff = isShiftOffAvailability(
    { startsAt: shift.startsAt, endsAt: shift.endsAt },
    availabilities,
  );
  const isDraft = shift.status === "DRAFT";
  const isOpenShift = shift.employeeId === null;
  const employeeName = shift.employee?.name ?? "(sans nom)";
  const employeeActive = shift.employee?.isActive ?? true;

  const style: React.CSSProperties = {
    transform: baseTransform,
    borderLeft: palette ? `3px solid ${palette.accent}` : undefined,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (draggable.isDragging) return;
    if (preview !== null) return;
    if (!onClick) return;
    e.stopPropagation();
    onClick();
  };

  const startResize = (edge: "left" | "right") => (e: React.PointerEvent) => {
    if (!onResize) return;
    e.stopPropagation();
    e.preventDefault();
    const originX = e.clientX;
    const originStart = shift.startsAt;
    const originEnd = shift.endsAt;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - originX;
      const rawMin = (dx / DAY_WIDTH_PX_DEFAULT) * MINUTES_PER_DAY;
      const snapped = Math.round(rawMin / SNAP_MINUTES) * SNAP_MINUTES;
      let next: { start: Date; end: Date };
      if (edge === "right") {
        const newEndMs = originEnd.getTime() + snapped * 60_000;
        const minEndMs =
          originStart.getTime() + MIN_DURATION_MIN * 60_000;
        const maxEndMs =
          originStart.getTime() + MAX_DURATION_MIN * 60_000;
        const clamped = Math.min(maxEndMs, Math.max(minEndMs, newEndMs));
        next = { start: originStart, end: new Date(clamped) };
      } else {
        const newStartMs = originStart.getTime() + snapped * 60_000;
        const maxStartMs =
          originEnd.getTime() - MIN_DURATION_MIN * 60_000;
        const minStartMs =
          originEnd.getTime() - MAX_DURATION_MIN * 60_000;
        const clamped = Math.min(maxStartMs, Math.max(minStartMs, newStartMs));
        next = { start: new Date(clamped), end: originEnd };
      }
      setPreview(next);
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };

    const onUp = () => {
      cleanup();
      setPreview((current) => {
        if (current) {
          const changed =
            current.start.getTime() !== originStart.getTime() ||
            current.end.getTime() !== originEnd.getTime();
          if (changed) onResize(shift, current.start, current.end);
        }
        return null;
      });
    };

    const onCancel = () => {
      cleanup();
      setPreview(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  const canResize = !!onResize && canDrag && !isOpenShift;

  return (
    <div
      ref={canDrag && preview === null ? draggable.setNodeRef : undefined}
      style={style}
      className={cn(
        "bg-background hover:bg-accent/40 relative rounded-md border px-2 py-1.5 text-left shadow-xs select-none",
        canDrag && preview === null && "cursor-grab active:cursor-grabbing",
        draggable.isDragging && "z-30 opacity-60 shadow-lg",
        !employeeActive && "border-dashed opacity-70",
        isDraft && "border-dashed opacity-75",
        isOpenShift && "bg-muted/40",
        onClick && !canDrag && "cursor-pointer",
        (isOff || isOnApprovedTimeOff) &&
          "ring-1 ring-amber-500/60 dark:ring-amber-400/60",
        preview !== null &&
          "ring-2 ring-primary/70 dark:ring-primary/60 shadow-md",
      )}
      onClick={handleClick}
      {...(canDrag && preview === null ? draggable.attributes : {})}
      {...(canDrag && preview === null ? draggable.listeners : {})}
    >
      {canResize && (
        <>
          <div
            onPointerDown={startResize("left")}
            className="absolute top-0 bottom-0 left-0 w-1.5 cursor-ew-resize hover:bg-primary/30 z-10"
            aria-label="Redimensionner début"
            role="separator"
          />
          <div
            onPointerDown={startResize("right")}
            className="absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/30 z-10"
            aria-label="Redimensionner fin"
            role="separator"
          />
        </>
      )}
      {(isOff || isOnApprovedTimeOff) && (
        <div className="absolute top-1 right-1 flex items-center gap-0.5">
          {isOff && (
            <AlertTriangle
              className="size-3 text-amber-600 dark:text-amber-400"
              aria-label="Hors disponibilités de l'employé"
            />
          )}
          {isOnApprovedTimeOff && (
            <CalendarOff
              className="size-3 text-amber-600 dark:text-amber-400"
              aria-label="Shift planifié pendant un congé approuvé"
            />
          )}
        </div>
      )}
      {isDraft && (
        <Badge
          variant="outline"
          className="border-muted-foreground/40 text-muted-foreground absolute top-1 left-1 h-4 px-1 text-[9px] font-medium uppercase tracking-wide"
        >
          Brouillon
        </Badge>
      )}
      {!isDraft && isInPendingSwap && (
        <Badge
          variant="outline"
          className="border-blue-500/40 text-blue-600 dark:text-blue-400 absolute top-1 left-1 h-4 px-1 text-[9px] font-medium uppercase tracking-wide"
        >
          Échange
        </Badge>
      )}
      {showEmployeeName && (
        <div
          className={cn(
            "text-foreground truncate text-[11px] font-medium",
            isDraft && "pl-14",
          )}
        >
          {isOpenShift ? (
            <span className="inline-flex items-center gap-1">
              <UserX className="size-3" />
              À combler
            </span>
          ) : (
            employeeName
          )}
        </div>
      )}
      <div
        className={cn(
          "text-foreground text-sm font-semibold tabular-nums",
          isDraft && !showEmployeeName && "pl-14",
        )}
      >
        {startStr}–{endStr}
        {endSuffix}
      </div>
      <div className="text-muted-foreground truncate text-xs">{secondary}</div>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";

import { updateShiftAction } from "@/actions/shifts/update";
import {
  daysOfWeek,
  formatHHMM,
  formatLongDate,
  isSameLocalDay,
  toISODate,
  type WeekRange,
} from "@/lib/week";
import type { AvailabilityRow } from "@/lib/repositories/availability";
import type { ClaimRow } from "@/lib/repositories/shiftClaim";
import type { TimeOffOverlayMap } from "@/lib/timeOff";
import { DeleteShiftDialog } from "./DeleteShiftDialog";
import { EmptyWeekCard } from "./EmptyWeekCard";
import { ScheduleToolbar } from "./ScheduleToolbar";
import type { TemplateOption } from "./ApplyTemplateDialog";
import { ShiftDialog } from "./ShiftDialog";
import { WeekGridDesktop } from "./WeekGridDesktop";
import { WeekStackedMobile } from "./WeekStackedMobile";
import type { Employee, PositionOption, WeekShift } from "./types";

type Props = {
  shifts: WeekShift[];
  range: WeekRange;
  employees: Employee[];
  positions: PositionOption[];
  canMutate: boolean;
  today: Date;
  selectedPositionIds: Set<string>;
  includeNoneFilter: boolean;
  groupBy: "employee" | "position";
  availabilitiesByEmployee: Map<string, AvailabilityRow[]>;
  timeOffByEmployee: TimeOffOverlayMap;
  draftCount: number;
  claimsByShift: Map<string, ClaimRow[]>;
  pendingSwapShiftIds: Set<string>;
  currentUserId: string;
  templates: TemplateOption[];
};

type OptimisticAction = {
  type: "move";
  shiftId: string;
  newStartsAt: Date;
  newEndsAt: Date;
  newEmployeeId: string;
  newEmployeeName: string | null;
  newPositionId: string | null;
  newPosition: { id: string; name: string; color: string } | null;
};

export function ScheduleCalendar({
  shifts,
  range,
  employees,
  positions,
  canMutate,
  today,
  selectedPositionIds,
  includeNoneFilter,
  groupBy,
  availabilitiesByEmployee,
  timeOffByEmployee,
  draftCount,
  claimsByShift,
  pendingSwapShiftIds,
  currentUserId,
  templates,
}: Props) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editShift, setEditShift] = React.useState<WeekShift | null>(null);
  const [deleteShift, setDeleteShift] = React.useState<WeekShift | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = React.useState("");

  const [optimisticShifts, dispatchOptimistic] = React.useOptimistic<
    WeekShift[],
    OptimisticAction
  >(shifts, (state, action) => {
    if (action.type === "move") {
      return state.map((s) =>
        s.id === action.shiftId
          ? {
              ...s,
              startsAt: action.newStartsAt,
              endsAt: action.newEndsAt,
              employeeId: action.newEmployeeId,
              employee: {
                id: action.newEmployeeId,
                name: action.newEmployeeName,
                isActive: s.employee?.isActive ?? true,
              },
              positionId: action.newPositionId,
              position: action.newPosition,
            }
          : s,
      );
    }
    return state;
  });

  const [, startTransition] = React.useTransition();

  const filteredShifts = React.useMemo(() => {
    const anyFilter = selectedPositionIds.size > 0 || includeNoneFilter;
    if (!anyFilter) return optimisticShifts;
    return optimisticShifts.filter((s) => {
      if (s.positionId === null) return includeNoneFilter;
      return selectedPositionIds.has(s.positionId);
    });
  }, [optimisticShifts, selectedPositionIds, includeNoneFilter]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const { rowTotals, dayTotals, grandTotal } = React.useMemo(() => {
    const days = daysOfWeek(range.start);
    const rowTotals = new Map<string, number>();
    const dayTotals = new Array<number>(7).fill(0);
    let grandTotal = 0;

    for (const s of filteredShifts) {
      const minutes = Math.round(
        (s.endsAt.getTime() - s.startsAt.getTime()) / 60_000,
      );
      const rowKey =
        groupBy === "employee"
          ? (s.employeeId ?? "__open__")
          : (s.positionId ?? "none");
      rowTotals.set(rowKey, (rowTotals.get(rowKey) ?? 0) + minutes);

      const dayIndex = days.findIndex((d) => isSameLocalDay(d, s.startsAt));
      if (dayIndex >= 0) dayTotals[dayIndex] += minutes;
      grandTotal += minutes;
    }

    return { rowTotals, dayTotals, grandTotal };
  }, [filteredShifts, range.start, groupBy]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over || !canMutate) return;
    const shiftId = String(event.active.id);
    const overId = String(event.over.id);
    const [toDateISO, suffix] = overId.split("|");
    if (!toDateISO || !suffix) return;

    const original = shifts.find((s) => s.id === shiftId);
    if (!original) return;

    // Phase 9: open shifts (employeeId === null) are not draggable in this
    // phase. The drop cell of the dedicated "Quarts à combler" row is also
    // disabled, but bail out defensively in case the source is open.
    if (original.employeeId === null) return;

    const [yyyy, mm, dd] = toDateISO.split("-").map(Number);
    const newStartsAt = new Date(original.startsAt);
    newStartsAt.setFullYear(yyyy, mm - 1, dd);
    const duration =
      original.endsAt.getTime() - original.startsAt.getTime();
    const newEndsAt = new Date(newStartsAt.getTime() + duration);

    let newEmployeeId: string | null = original.employeeId;
    let newEmployeeName: string | null = original.employee?.name ?? null;
    let newPositionId = original.positionId;
    let newPosition = original.position;

    if (suffix.startsWith("emp:")) {
      const toEmployeeId = suffix.slice(4);
      const originalDateISO = toISODate(original.startsAt);
      if (
        originalDateISO === toDateISO &&
        original.employeeId === toEmployeeId
      ) {
        return;
      }
      newEmployeeId = toEmployeeId;
      const target = employees.find((e) => e.id === toEmployeeId);
      newEmployeeName = target?.name ?? original.employee?.name ?? null;
    } else if (suffix.startsWith("pos:")) {
      const rawPositionId = suffix.slice(4);
      const toPositionId = rawPositionId === "none" ? null : rawPositionId;
      const originalDateISO = toISODate(original.startsAt);
      if (
        originalDateISO === toDateISO &&
        original.positionId === toPositionId
      ) {
        return;
      }
      newPositionId = toPositionId;
      newPosition = toPositionId
        ? positions.find((p) => p.id === toPositionId) ?? original.position
        : null;
    } else {
      return;
    }

    startTransition(async () => {
      dispatchOptimistic({
        type: "move",
        shiftId,
        newStartsAt,
        newEndsAt,
        newEmployeeId,
        newEmployeeName,
        newPositionId,
        newPosition,
      });

      const fd = new FormData();
      fd.append("shiftId", shiftId);
      fd.append("employeeId", newEmployeeId);
      fd.append("date", toDateISO);
      fd.append("start", formatHHMM(newStartsAt));
      fd.append("end", formatHHMM(newEndsAt));
      if (original.note) fd.append("note", original.note);
      if (newPositionId) fd.append("positionId", newPositionId);

      const result = await updateShiftAction({}, fd);
      if (result.success) {
        toast.success("Shift déplacé.");
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  };

  const buildDeleteSummary = (s: WeekShift) =>
    `${s.employee?.name ?? (s.employeeId ? "(sans nom)" : "Quart à combler")} — ${formatLongDate(s.startsAt)} ${formatHHMM(s.startsAt)}–${formatHHMM(s.endsAt)}`;

  return (
    <div className="space-y-4">
      <ScheduleToolbar
        range={range}
        today={today}
        canMutate={canMutate}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCreateClick={() => setCreateOpen(true)}
        draftCount={draftCount}
        templates={templates}
      />

      {filteredShifts.length === 0 ? (
        <EmptyWeekCard
          canMutate={canMutate}
          onAddShift={canMutate ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <WeekGridDesktop
                shifts={filteredShifts}
                range={range}
                employees={employees}
                positions={positions}
                canMutate={canMutate}
                onShiftClick={setEditShift}
                searchTerm={searchTerm}
                rowTotalsMinutes={rowTotals}
                dayTotalsMinutes={dayTotals}
                grandTotalMinutes={grandTotal}
                groupBy={groupBy}
                availabilitiesByEmployee={availabilitiesByEmployee}
                timeOffByEmployee={timeOffByEmployee}
                pendingSwapShiftIds={pendingSwapShiftIds}
              />
            </DndContext>
          </div>

          <div className="md:hidden">
            <WeekStackedMobile
              shifts={filteredShifts}
              range={range}
              canMutate={canMutate}
              onShiftClick={setEditShift}
              availabilitiesByEmployee={availabilitiesByEmployee}
              timeOffByEmployee={timeOffByEmployee}
              pendingSwapShiftIds={pendingSwapShiftIds}
            />
          </div>
        </>
      )}

      <ShiftDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employees={employees}
        positions={positions}
        defaultDate={toISODate(range.start)}
        currentUserId={currentUserId}
      />

      {editShift && (
        <ShiftDialog
          key={editShift.id}
          open={true}
          onOpenChange={(o) => {
            if (!o) setEditShift(null);
          }}
          employees={employees}
          positions={positions}
          defaultDate={toISODate(editShift.startsAt)}
          shift={editShift}
          onDeleteRequest={canMutate ? (s) => setDeleteShift(s) : undefined}
          claims={claimsByShift.get(editShift.id) ?? []}
          currentUserId={currentUserId}
          allShifts={shifts}
        />
      )}

      {deleteShift && (
        <DeleteShiftDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setDeleteShift(null);
          }}
          shiftId={deleteShift.id}
          summary={buildDeleteSummary(deleteShift)}
        />
      )}
    </div>
  );
}

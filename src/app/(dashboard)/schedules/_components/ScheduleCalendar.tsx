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
import { DeleteShiftDialog } from "./DeleteShiftDialog";
import { EmptyWeekCard } from "./EmptyWeekCard";
import { ScheduleToolbar } from "./ScheduleToolbar";
import { ShiftDialog } from "./ShiftDialog";
import { WeekGridDesktop } from "./WeekGridDesktop";
import { WeekStackedMobile } from "./WeekStackedMobile";
import type { Employee, WeekShift } from "./types";

type Props = {
  shifts: WeekShift[];
  range: WeekRange;
  employees: Employee[];
  canMutate: boolean;
  today: Date;
};

type OptimisticAction = {
  type: "move";
  shiftId: string;
  newStartsAt: Date;
  newEndsAt: Date;
  newEmployeeId: string;
  newEmployeeName: string | null;
};

export function ScheduleCalendar({
  shifts,
  range,
  employees,
  canMutate,
  today,
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
                ...s.employee,
                id: action.newEmployeeId,
                name: action.newEmployeeName,
              },
            }
          : s,
      );
    }
    return state;
  });

  const [, startTransition] = React.useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  // Compute totals (in minutes) per employee, per day, and the grand total,
  // all derived from the optimistic shift list so DnD updates them live.
  const { employeeTotals, dayTotals, grandTotal } = React.useMemo(() => {
    const days = daysOfWeek(range.start);
    const employeeTotals = new Map<string, number>();
    const dayTotals = new Array<number>(7).fill(0);
    let grandTotal = 0;

    for (const s of optimisticShifts) {
      const minutes = Math.round(
        (s.endsAt.getTime() - s.startsAt.getTime()) / 60_000,
      );
      employeeTotals.set(
        s.employeeId,
        (employeeTotals.get(s.employeeId) ?? 0) + minutes,
      );
      const dayIndex = days.findIndex((d) => isSameLocalDay(d, s.startsAt));
      if (dayIndex >= 0) dayTotals[dayIndex] += minutes;
      grandTotal += minutes;
    }

    return { employeeTotals, dayTotals, grandTotal };
  }, [optimisticShifts, range.start]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over || !canMutate) return;
    const shiftId = String(event.active.id);
    const overId = String(event.over.id);
    const [toDateISO, toEmployeeId] = overId.split("|");
    if (!toDateISO || !toEmployeeId) return;

    const original = shifts.find((s) => s.id === shiftId);
    if (!original) return;

    const originalDateISO = toISODate(original.startsAt);
    if (
      originalDateISO === toDateISO &&
      original.employeeId === toEmployeeId
    ) {
      return;
    }

    const [yyyy, mm, dd] = toDateISO.split("-").map(Number);
    const newStartsAt = new Date(original.startsAt);
    newStartsAt.setFullYear(yyyy, mm - 1, dd);
    const duration =
      original.endsAt.getTime() - original.startsAt.getTime();
    const newEndsAt = new Date(newStartsAt.getTime() + duration);

    const target = employees.find((e) => e.id === toEmployeeId);
    const newEmployeeName = target?.name ?? original.employee.name;

    startTransition(async () => {
      dispatchOptimistic({
        type: "move",
        shiftId,
        newStartsAt,
        newEndsAt,
        newEmployeeId: toEmployeeId,
        newEmployeeName,
      });

      const fd = new FormData();
      fd.append("shiftId", shiftId);
      fd.append("employeeId", toEmployeeId);
      fd.append("date", toDateISO);
      fd.append("start", formatHHMM(newStartsAt));
      fd.append("end", formatHHMM(newEndsAt));
      if (original.note) fd.append("note", original.note);

      const result = await updateShiftAction({}, fd);
      if (result.success) {
        toast.success("Shift déplacé.");
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  };

  const buildDeleteSummary = (s: WeekShift) =>
    `${s.employee.name ?? "(sans nom)"} — ${formatLongDate(s.startsAt)} ${formatHHMM(s.startsAt)}–${formatHHMM(s.endsAt)}`;

  return (
    <div className="space-y-4">
      <ScheduleToolbar
        range={range}
        today={today}
        canMutate={canMutate}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCreateClick={() => setCreateOpen(true)}
      />

      {optimisticShifts.length === 0 ? (
        <EmptyWeekCard
          canMutate={canMutate}
          onAddShift={canMutate ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <WeekGridDesktop
                shifts={optimisticShifts}
                range={range}
                employees={employees}
                canMutate={canMutate}
                onShiftClick={canMutate ? setEditShift : undefined}
                searchTerm={searchTerm}
                employeeTotalsMinutes={employeeTotals}
                dayTotalsMinutes={dayTotals}
                grandTotalMinutes={grandTotal}
              />
            </DndContext>
          </div>

          <div className="md:hidden">
            <WeekStackedMobile
              shifts={optimisticShifts}
              range={range}
              canMutate={canMutate}
              onShiftClick={canMutate ? setEditShift : undefined}
            />
          </div>
        </>
      )}

      <ShiftDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employees={employees}
        defaultDate={toISODate(range.start)}
      />

      {editShift && (
        <ShiftDialog
          key={editShift.id}
          open={true}
          onOpenChange={(o) => {
            if (!o) setEditShift(null);
          }}
          employees={employees}
          defaultDate={toISODate(editShift.startsAt)}
          shift={editShift}
          onDeleteRequest={(s) => setDeleteShift(s)}
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

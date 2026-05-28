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
import { Button } from "@/components/ui/button";
import {
  formatHHMM,
  formatLongDate,
  toISODate,
  type WeekRange,
} from "@/lib/week";
import { DeleteShiftDialog } from "./DeleteShiftDialog";
import { EmptyWeekCard } from "./EmptyWeekCard";
import { ShiftDialog } from "./ShiftDialog";
import { WeekGridDesktop } from "./WeekGridDesktop";
import { WeekStackedMobile } from "./WeekStackedMobile";
import type { Employee, WeekShift } from "./types";

type Props = {
  shifts: WeekShift[];
  range: WeekRange;
  employees: Employee[];
  canMutate: boolean;
};

type OptimisticAction =
  | {
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
}: Props) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editShift, setEditShift] = React.useState<WeekShift | null>(null);
  const [deleteShift, setDeleteShift] = React.useState<WeekShift | null>(
    null,
  );

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

    // Preserve time-of-day; only date and assignee change.
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
    <>
      {canMutate && optimisticShifts.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>Ajouter un shift</Button>
        </div>
      )}

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

      {/* Create dialog */}
      <ShiftDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employees={employees}
        defaultDate={toISODate(range.start)}
      />

      {/* Edit dialog (keyed by shift id so state resets between shifts) */}
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

      {/* Delete confirm */}
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
    </>
  );
}

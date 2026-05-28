"use client";

import { Badge } from "@/components/ui/badge";
import {
  daysOfWeek,
  formatHHMM,
  formatLongDate,
  isSameLocalDay,
  toISODate,
  dayDiff,
  type WeekRange,
} from "@/lib/week";
import { ShiftDialog } from "./ShiftDialog";
import { DeleteShiftDialog } from "./DeleteShiftDialog";

export type WeekShift = {
  id: string;
  employeeId: string;
  startsAt: Date;
  endsAt: Date;
  note: string | null;
  employee: { id: string; name: string | null; isActive: boolean };
};

type Employee = { id: string; name: string | null };

type Props = {
  shifts: WeekShift[];
  range: WeekRange;
  canMutate: boolean;
  employees: Employee[];
};

export function WeekGrid({ shifts, range, canMutate, employees }: Props) {
  const days = daysOfWeek(range.start);

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const dayShifts = shifts.filter((s) => isSameLocalDay(s.startsAt, day));
        return (
          <section
            key={day.toISOString()}
            className="rounded-md border p-4"
          >
            <h3 className="text-sm font-medium">{formatLongDate(day)}</h3>
            {dayShifts.length === 0 ? (
              <p className="text-muted-foreground mt-2 text-sm">
                Aucun shift
              </p>
            ) : (
              <ul className="mt-3 divide-y">
                {dayShifts.map((s) => (
                  <ShiftRow
                    key={s.id}
                    shift={s}
                    canMutate={canMutate}
                    employees={resolveEmployees(employees, s)}
                    defaultDate={toISODate(day)}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

/**
 * The edit dialog needs a list of employees that includes the currently
 * assigned one even if they're deactivated (so the form select can show
 * the existing assignment). The picker for *new* shifts only sees active
 * employees, but for editing we patch in the current assignee if needed.
 */
function resolveEmployees(
  pickerList: Employee[],
  shift: WeekShift,
): Employee[] {
  if (pickerList.some((e) => e.id === shift.employeeId)) return pickerList;
  return [
    ...pickerList,
    { id: shift.employeeId, name: shift.employee.name },
  ];
}

function ShiftRow({
  shift,
  canMutate,
  employees,
  defaultDate,
}: {
  shift: WeekShift;
  canMutate: boolean;
  employees: Employee[];
  defaultDate: string;
}) {
  const startStr = formatHHMM(shift.startsAt);
  const endStr = formatHHMM(shift.endsAt);
  const dayOffset = dayDiff(shift.startsAt, shift.endsAt);
  const endSuffix = dayOffset > 0 ? ` (+${dayOffset}j)` : "";
  const summary = `${shift.employee.name ?? "(sans nom)"} — ${startStr}–${endStr}${endSuffix}`;

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="font-medium">
          {shift.employee.name ?? "(sans nom)"}
        </span>
        {!shift.employee.isActive && (
          <Badge variant="destructive">désactivé</Badge>
        )}
        <span className="text-muted-foreground text-sm">
          {startStr}–{endStr}
          {endSuffix}
        </span>
        {shift.note && (
          <span className="text-muted-foreground truncate text-sm">
            — {shift.note}
          </span>
        )}
      </div>
      {canMutate && (
        <div className="flex shrink-0 gap-2">
          <ShiftDialog
            employees={employees}
            defaultDate={defaultDate}
            shift={{
              id: shift.id,
              employeeId: shift.employeeId,
              startsAt: shift.startsAt,
              endsAt: shift.endsAt,
              note: shift.note,
            }}
          />
          <DeleteShiftDialog shiftId={shift.id} summary={summary} />
        </div>
      )}
    </li>
  );
}

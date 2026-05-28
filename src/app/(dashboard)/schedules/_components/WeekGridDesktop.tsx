"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  daysOfWeek,
  formatLongDate,
  isSameLocalDay,
  type WeekRange,
} from "@/lib/week";
import { DropCell } from "./DropCell";
import { ShiftBlock } from "./ShiftBlock";
import type { WeekShift, Employee } from "./types";

const HOUR_HEIGHT = 56; // px / hour
const TOTAL_HEIGHT = HOUR_HEIGHT * 24;
const HOUR_LABELS = Array.from({ length: 25 }, (_, h) => h); // 0..24

type Props = {
  shifts: WeekShift[];
  range: WeekRange;
  employees: Employee[];
  canMutate: boolean;
  onShiftClick?: (shift: WeekShift) => void;
};

export function WeekGridDesktop({
  shifts,
  range,
  employees,
  canMutate,
  onShiftClick,
}: Props) {
  const days = daysOfWeek(range.start);

  // Ensure every employee with shifts in the week is represented as a row,
  // even if they're not in the active picker list (e.g., deactivated).
  const allEmployees: Employee[] = React.useMemo(() => {
    const out = [...employees];
    const known = new Set(out.map((e) => e.id));
    for (const s of shifts) {
      if (!known.has(s.employeeId)) {
        out.push({ id: s.employeeId, name: s.employee.name });
        known.add(s.employeeId);
      }
    }
    return out;
  }, [employees, shifts]);

  return (
    <div className="bg-card overflow-x-auto rounded-md border">
      <div className="min-w-[800px]">
        {/* Header */}
        <div
          className="bg-muted/40 grid border-b text-xs font-medium"
          style={{ gridTemplateColumns: "160px repeat(7, 1fr)" }}
        >
          <div className="border-r p-2 text-muted-foreground uppercase">
            Employé
          </div>
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className="border-r p-2 text-center last:border-r-0"
            >
              {formatLongDate(d)}
            </div>
          ))}
        </div>

        {/* Body */}
        {allEmployees.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-sm">
            Aucun employé.
          </div>
        ) : (
          allEmployees.map((emp) => {
            const empShifts = shifts.filter((s) => s.employeeId === emp.id);
            const isDeactivated = empShifts.some(
              (s) => !s.employee.isActive,
            );
            return (
              <div
                key={emp.id}
                className="grid border-b last:border-b-0"
                style={{ gridTemplateColumns: "160px repeat(7, 1fr)" }}
              >
                {/* Employee label column */}
                <div className="border-r p-2 text-sm">
                  <div className="font-medium">
                    {emp.name ?? "(sans nom)"}
                  </div>
                  {isDeactivated && (
                    <Badge variant="destructive" className="mt-1">
                      désactivé
                    </Badge>
                  )}
                  {/* Hour labels on first column to give a sense of scale */}
                  <div
                    className="text-muted-foreground mt-3 hidden flex-col gap-0 text-[10px] sm:flex"
                    style={{ height: `${TOTAL_HEIGHT}px` }}
                  >
                    {HOUR_LABELS.map((h, i) => (
                      <div
                        key={h}
                        className={cn(
                          "border-border/40 -mt-px border-t pl-1",
                          i === 0 && "border-t-0",
                        )}
                        style={{ height: `${HOUR_HEIGHT}px` }}
                      >
                        {String(h).padStart(2, "0")}:00
                      </div>
                    ))}
                  </div>
                </div>

                {/* 7 day cells */}
                {days.map((day) => {
                  const cellShifts = empShifts.filter((s) =>
                    isSameLocalDay(s.startsAt, day),
                  );
                  return (
                    <DropCell
                      key={`${day.toISOString()}-${emp.id}`}
                      day={day}
                      employeeId={emp.id}
                      enabled={canMutate}
                      height={TOTAL_HEIGHT}
                    >
                      {cellShifts.map((s) => (
                        <ShiftBlock
                          key={s.id}
                          shift={s}
                          canDrag={canMutate}
                          onClick={
                            canMutate && onShiftClick
                              ? () => onShiftClick(s)
                              : undefined
                          }
                          hourHeight={HOUR_HEIGHT}
                        />
                      ))}
                    </DropCell>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

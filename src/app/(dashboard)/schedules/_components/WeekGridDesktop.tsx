"use client";

import * as React from "react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  daysOfWeek,
  isSameLocalDay,
  type WeekRange,
} from "@/lib/week";
import { DropCell } from "./DropCell";
import { ShiftBlock } from "./ShiftBlock";
import type { WeekShift, Employee } from "./types";

const FRENCH_WEEKDAYS_SHORT = [
  "Lun.",
  "Mar.",
  "Mer.",
  "Jeu.",
  "Ven.",
  "Sam.",
  "Dim.",
];

const GRID_COLS = "220px repeat(7, minmax(0, 1fr)) 96px";

type Props = {
  shifts: WeekShift[];
  range: WeekRange;
  employees: Employee[];
  canMutate: boolean;
  onShiftClick?: (s: WeekShift) => void;
  searchTerm: string;
  employeeTotalsMinutes: Map<string, number>;
  dayTotalsMinutes: number[];
  grandTotalMinutes: number;
};

function formatHoursMinutes(minutes: number): string {
  if (minutes <= 0) return "0h";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function WeekGridDesktop({
  shifts,
  range,
  employees,
  canMutate,
  onShiftClick,
  searchTerm,
  employeeTotalsMinutes,
  dayTotalsMinutes,
  grandTotalMinutes,
}: Props) {
  const days = daysOfWeek(range.start);

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

  const search = searchTerm.trim().toLowerCase();
  const visibleEmployees = search
    ? allEmployees.filter((e) =>
        (e.name ?? "").toLowerCase().includes(search),
      )
    : allEmployees;

  return (
    <div className="bg-card overflow-x-auto rounded-md border">
      <div className="min-w-[960px]">
        {/* Header row */}
        <div
          className="bg-muted/30 grid border-b text-xs font-medium"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <div className="text-muted-foreground border-r p-3 uppercase tracking-wide">
            Employé
          </div>
          {days.map((d, i) => (
            <div key={d.toISOString()} className="border-r p-2 text-center">
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                {FRENCH_WEEKDAYS_SHORT[i]}
              </div>
              <div className="text-foreground mt-0.5 text-sm font-semibold">
                {d.getDate()}
              </div>
            </div>
          ))}
          <div className="text-muted-foreground p-3 text-right uppercase tracking-wide">
            Total
          </div>
        </div>

        {/* Body rows */}
        {visibleEmployees.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-sm">
            Aucun employé ne correspond à votre recherche.
          </div>
        ) : (
          visibleEmployees.map((emp) => {
            const empShifts = shifts.filter((s) => s.employeeId === emp.id);
            const isDeactivated =
              empShifts.length > 0 &&
              empShifts.every((s) => !s.employee.isActive);
            const totalMin = employeeTotalsMinutes.get(emp.id) ?? 0;
            return (
              <div
                key={emp.id}
                className="grid border-b last:border-b-0"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <div className="flex items-center gap-3 border-r p-3">
                  <Avatar name={emp.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {emp.name ?? "(sans nom)"}
                      </p>
                      {isDeactivated && (
                        <Badge variant="destructive" className="shrink-0">
                          désactivé
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatHoursMinutes(totalMin)}
                    </p>
                  </div>
                </div>

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
                        />
                      ))}
                    </DropCell>
                  );
                })}

                <div className="p-3 text-right text-sm font-semibold tabular-nums">
                  {formatHoursMinutes(totalMin)}
                </div>
              </div>
            );
          })
        )}

        {/* Footer totals row */}
        <div
          className="bg-muted/30 grid border-t text-xs font-medium"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <div className="text-muted-foreground border-r p-3 uppercase tracking-wide">
            Total pour la succursale
          </div>
          {dayTotalsMinutes.map((min, i) => (
            <div
              key={i}
              className={cn(
                "border-r p-3 text-center text-sm font-semibold tabular-nums",
                min === 0 && "text-muted-foreground/60 font-normal",
              )}
            >
              {formatHoursMinutes(min)}
            </div>
          ))}
          <div className="p-3 text-right text-sm font-bold tabular-nums">
            {formatHoursMinutes(grandTotalMinutes)}
          </div>
        </div>
      </div>
    </div>
  );
}

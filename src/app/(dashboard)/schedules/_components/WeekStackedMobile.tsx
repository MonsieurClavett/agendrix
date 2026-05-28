"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  daysOfWeek,
  formatHHMM,
  formatLongDate,
  isSameLocalDay,
  dayDiff,
  type WeekRange,
} from "@/lib/week";
import type { WeekShift } from "./types";

type Props = {
  shifts: WeekShift[];
  range: WeekRange;
  canMutate: boolean;
  onShiftClick?: (shift: WeekShift) => void;
};

export function WeekStackedMobile({
  shifts,
  range,
  canMutate,
  onShiftClick,
}: Props) {
  const days = daysOfWeek(range.start);

  return (
    <div className="space-y-3">
      {days.map((day) => {
        const dayShifts = shifts.filter((s) => isSameLocalDay(s.startsAt, day));
        return (
          <section
            key={day.toISOString()}
            className="bg-card rounded-md border p-3"
          >
            <h3 className="text-sm font-semibold">{formatLongDate(day)}</h3>
            {dayShifts.length === 0 ? (
              <p className="text-muted-foreground mt-2 text-sm">
                Aucun shift
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {dayShifts.map((s) => {
                  const startStr = formatHHMM(s.startsAt);
                  const endStr = formatHHMM(s.endsAt);
                  const offset = dayDiff(s.startsAt, s.endsAt);
                  const endSuffix = offset > 0 ? ` (+${offset}j)` : "";
                  const row = (
                    <div className="flex w-full items-center justify-between gap-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {s.employee.name ?? "(sans nom)"}
                          </span>
                          {!s.employee.isActive && (
                            <Badge variant="destructive">désactivé</Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          {startStr}–{endStr}
                          {endSuffix}
                          {s.note && ` — ${s.note}`}
                        </div>
                      </div>
                    </div>
                  );
                  return (
                    <li
                      key={s.id}
                      className="border-border/60 rounded-sm border px-2 py-1.5"
                    >
                      {canMutate && onShiftClick ? (
                        <Button
                          variant="ghost"
                          className="h-auto w-full justify-start p-0 text-left font-normal hover:bg-transparent"
                          onClick={() => onShiftClick(s)}
                        >
                          {row}
                        </Button>
                      ) : (
                        row
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

"use client";

import * as React from "react";

import { Avatar } from "@/components/ui/avatar";
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
            className="bg-card rounded-md border p-4"
          >
            <h3 className="text-sm font-semibold">{formatLongDate(day)}</h3>
            {dayShifts.length === 0 ? (
              <p className="text-muted-foreground mt-2 text-sm">
                Aucun shift
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {dayShifts.map((s) => {
                  const startStr = formatHHMM(s.startsAt);
                  const endStr = formatHHMM(s.endsAt);
                  const offset = dayDiff(s.startsAt, s.endsAt);
                  const endSuffix = offset > 0 ? ` (+${offset}j)` : "";
                  const secondary = s.note?.trim() || "Quart";
                  const row = (
                    <div className="flex w-full items-center gap-3">
                      <Avatar name={s.employee.name} size="sm" />
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {s.employee.name ?? "(sans nom)"}
                          </span>
                          {!s.employee.isActive && (
                            <Badge variant="destructive">désactivé</Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          <span className="font-semibold tabular-nums">
                            {startStr}–{endStr}
                            {endSuffix}
                          </span>
                          {" · "}
                          {secondary}
                        </div>
                      </div>
                    </div>
                  );
                  return (
                    <li key={s.id}>
                      {canMutate && onShiftClick ? (
                        <Button
                          variant="outline"
                          className="h-auto w-full justify-start p-2 font-normal"
                          onClick={() => onShiftClick(s)}
                        >
                          {row}
                        </Button>
                      ) : (
                        <div className="rounded-md border p-2">{row}</div>
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

"use client";

import * as React from "react";

import { AlertTriangle, CalendarOff } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  daysOfRange,
  formatHHMM,
  formatLongDate,
  isSameLocalDay,
  dayDiff,
  toISODate,
  type WeekRange,
} from "@/lib/week";
import { isShiftOffAvailability } from "@/lib/availability";
import type { AvailabilityRow } from "@/lib/repositories/availability";
import type { TimeOffOverlayMap } from "@/lib/timeOff";
import type { WeekShift } from "./types";

type Props = {
  shifts: WeekShift[];
  range: WeekRange;
  canMutate: boolean;
  onShiftClick?: (shift: WeekShift) => void;
  availabilitiesByEmployee: Map<string, AvailabilityRow[]>;
  timeOffByEmployee: TimeOffOverlayMap;
  pendingSwapShiftIds: Set<string>;
};

export function WeekStackedMobile({
  shifts,
  range,
  canMutate,
  onShiftClick,
  availabilitiesByEmployee,
  timeOffByEmployee,
  pendingSwapShiftIds,
}: Props) {
  const days = daysOfRange(range);

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
                  const isOpenShift = s.employeeId === null;
                  const displayName = isOpenShift
                    ? "Quart à combler"
                    : s.employee?.name ?? "(sans nom)";
                  const isOff =
                    !isOpenShift &&
                    isShiftOffAvailability(
                      { startsAt: s.startsAt, endsAt: s.endsAt },
                      (s.employeeId &&
                        availabilitiesByEmployee.get(s.employeeId)) ||
                        [],
                    );
                  const isOnApprovedTimeOff =
                    !isOpenShift && s.employeeId
                      ? timeOffByEmployee
                          .get(s.employeeId)
                          ?.approved.has(toISODate(s.startsAt)) ?? false
                      : false;
                  const isInPendingSwap = pendingSwapShiftIds.has(s.id);
                  const row = (
                    <div className="flex w-full items-center gap-3">
                      <Avatar name={displayName} size="sm" />
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {displayName}
                          </span>
                          {!isOpenShift && s.employee && !s.employee.isActive && (
                            <Badge variant="destructive">désactivé</Badge>
                          )}
                          {isOff && (
                            <AlertTriangle
                              className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                              aria-label="Hors disponibilités de l'employé"
                            />
                          )}
                          {isOnApprovedTimeOff && (
                            <CalendarOff
                              className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                              aria-label="Shift planifié pendant un congé approuvé"
                            />
                          )}
                          {isInPendingSwap && (
                            <Badge
                              variant="outline"
                              className="border-blue-500/40 text-blue-600 dark:text-blue-400"
                            >
                              Échange
                            </Badge>
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

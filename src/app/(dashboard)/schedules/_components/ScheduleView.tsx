"use client";

import * as React from "react";

import type { WeekRange } from "@/lib/week";
import type { AvailabilityRow } from "@/lib/repositories/availability";
import type { ClaimRow } from "@/lib/repositories/shiftClaim";
import type { TimeOffOverlayMap } from "@/lib/timeOff";
import { FilterPanel } from "./FilterPanel";
import { ScheduleCalendar } from "./ScheduleCalendar";
import type { TemplateOption } from "./ApplyTemplateDialog";
import type { Employee, PositionOption, WeekShift } from "./types";

type Props = {
  shifts: WeekShift[];
  range: WeekRange;
  employees: Employee[];
  positions: PositionOption[];
  canMutate: boolean;
  today: Date;
  availabilitiesByEmployee: Map<string, AvailabilityRow[]>;
  timeOffByEmployee: TimeOffOverlayMap;
  draftCount: number;
  claimsByShift: Map<string, ClaimRow[]>;
  pendingClaimsCount: number;
  pendingSwapShiftIds: Set<string>;
  currentUserId: string;
  templates: TemplateOption[];
};

export function ScheduleView({
  shifts,
  range,
  employees,
  positions,
  canMutate,
  today,
  availabilitiesByEmployee,
  timeOffByEmployee,
  draftCount,
  claimsByShift,
  pendingClaimsCount,
  pendingSwapShiftIds,
  currentUserId,
  templates,
}: Props) {
  const [selectedPositionIds, setSelectedPositionIds] = React.useState<
    Set<string>
  >(() => new Set());
  const [includeNoneFilter, setIncludeNoneFilter] = React.useState(false);
  const [groupBy, setGroupBy] = React.useState<"employee" | "position">(
    "employee",
  );

  const togglePosition = (id: string) => {
    setSelectedPositionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedPositionIds(new Set());
    setIncludeNoneFilter(false);
  };

  return (
    <div className="flex gap-4">
      <FilterPanel
        positions={positions}
        selectedPositionIds={selectedPositionIds}
        includeNoneFilter={includeNoneFilter}
        groupBy={groupBy}
        onTogglePosition={togglePosition}
        onToggleNone={() => setIncludeNoneFilter((v) => !v)}
        onChangeGroupBy={setGroupBy}
        onClearFilters={clearFilters}
        pendingClaimsCount={pendingClaimsCount}
      />
      <div className="min-w-0 flex-1">
        <ScheduleCalendar
          shifts={shifts}
          range={range}
          employees={employees}
          positions={positions}
          canMutate={canMutate}
          today={today}
          selectedPositionIds={selectedPositionIds}
          includeNoneFilter={includeNoneFilter}
          groupBy={groupBy}
          availabilitiesByEmployee={availabilitiesByEmployee}
          timeOffByEmployee={timeOffByEmployee}
          draftCount={draftCount}
          claimsByShift={claimsByShift}
          pendingSwapShiftIds={pendingSwapShiftIds}
          currentUserId={currentUserId}
          templates={templates}
        />
      </div>
    </div>
  );
}

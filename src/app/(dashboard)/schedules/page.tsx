import { requireTenantContext } from "@/lib/session";
import { listUsersInCompany } from "@/lib/repositories/user";
import {
  countDraftsForCompanyWeek,
  listShiftsForCompanyWeek,
  listShiftsForUserWeek,
} from "@/lib/repositories/shift";
import { listPositionsForCompany } from "@/lib/repositories/position";
import {
  listAvailabilitiesForCompany,
  listAvailabilitiesForEmployee,
  type AvailabilityRow,
} from "@/lib/repositories/availability";
import { listTimeOffOverlappingWeek } from "@/lib/repositories/timeOff";
import {
  countPendingClaimsForCompany,
  listClaimsForCompanyOpenShifts,
  type ClaimRow,
} from "@/lib/repositories/shiftClaim";
import { listPendingSwapShiftIds } from "@/lib/repositories/shiftSwap";
import { listTemplates } from "@/lib/repositories/scheduleTemplate";
import { buildTimeOffMaps } from "@/lib/timeOff";
import { parseISODate, parseViewParam, rangeFor } from "@/lib/week";
import { PageHeader } from "@/components/ui/page-header";
import { ScheduleView } from "./_components/ScheduleView";

type Props = {
  searchParams: Promise<{ view?: string; week?: string; day?: string }>;
};

export default async function SchedulesPage({ searchParams }: Props) {
  const ctx = await requireTenantContext();
  const params = await searchParams;
  const today = new Date();
  const view = parseViewParam(params.view);
  const anchor =
    view === "day"
      ? parseISODate(params.day, today)
      : parseISODate(params.week, today);
  const range = rangeFor(view, anchor);
  const isManager = ctx.role === "MANAGER";

  const [
    shifts,
    employees,
    positions,
    allRanges,
    timeOffRows,
    draftCount,
    openShiftClaims,
    pendingClaimsCount,
    pendingSwapShiftIds,
    templates,
  ] = await Promise.all([
    isManager
      ? listShiftsForCompanyWeek(ctx, range)
      : listShiftsForUserWeek(ctx, ctx.userId, range),
    isManager ? listUsersInCompany(ctx) : Promise.resolve([]),
    isManager ? listPositionsForCompany(ctx) : Promise.resolve([]),
    isManager
      ? listAvailabilitiesForCompany(ctx)
      : listAvailabilitiesForEmployee(ctx, ctx.userId),
    listTimeOffOverlappingWeek(ctx, range),
    isManager ? countDraftsForCompanyWeek(ctx, range) : Promise.resolve(0),
    isManager ? listClaimsForCompanyOpenShifts(ctx) : Promise.resolve([]),
    isManager ? countPendingClaimsForCompany(ctx) : Promise.resolve(0),
    listPendingSwapShiftIds(ctx),
    isManager ? listTemplates(ctx) : Promise.resolve([]),
  ]);

  const claimsByShift = new Map<string, ClaimRow[]>();
  for (const c of openShiftClaims) {
    const list = claimsByShift.get(c.shiftId) ?? [];
    list.push(c);
    claimsByShift.set(c.shiftId, list);
  }

  const availabilitiesByEmployee = new Map<string, AvailabilityRow[]>();
  for (const r of allRanges) {
    const list = availabilitiesByEmployee.get(r.employeeId) ?? [];
    list.push(r);
    availabilitiesByEmployee.set(r.employeeId, list);
  }

  const timeOffByEmployee = buildTimeOffMaps(timeOffRows, range);

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        eyebrow="Planification"
        title={isManager ? "Horaires de l'équipe" : "Mes horaires"}
        description={
          isManager
            ? "Vue calendrier de tous les employés de votre entreprise."
            : "Vos shifts publiés et les actions qui vous concernent."
        }
      />

      <ScheduleView
        shifts={shifts}
        range={range}
        view={view}
        anchor={anchor}
        employees={employees}
        positions={positions.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
        }))}
        canMutate={isManager}
        today={today}
        availabilitiesByEmployee={availabilitiesByEmployee}
        timeOffByEmployee={timeOffByEmployee}
        draftCount={draftCount}
        claimsByShift={claimsByShift}
        pendingClaimsCount={pendingClaimsCount}
        pendingSwapShiftIds={pendingSwapShiftIds}
        currentUserId={ctx.userId}
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          shiftCount: t._count.shifts,
        }))}
      />
    </div>
  );
}

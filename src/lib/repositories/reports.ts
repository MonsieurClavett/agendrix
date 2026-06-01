import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";
import { pairPunches, type PunchRow } from "@/lib/repositories/punch";

export type ReportEmployeeRow = {
  employeeId: string;
  name: string | null;
  email: string;
  scheduledMinutes: number;
  workedMinutes: number;
  varianceMinutes: number; // worked - scheduled
  openSessionsCount: number;
};

export type ReportPositionRow = {
  positionId: string | null;
  positionName: string;
  scheduledMinutes: number;
  workedMinutes: number;
};

export type ReportData = {
  range: { startDate: Date; endDate: Date };
  perEmployee: ReportEmployeeRow[];
  perPosition: ReportPositionRow[];
  totals: {
    scheduledMinutes: number;
    workedMinutes: number;
    varianceMinutes: number;
    activeEmployees: number;
  };
};

function startOfLocalDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfLocalDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

/**
 * Builds a full report for a date range. All numbers are in minutes.
 * Scheduled = sum of (endsAt - startsAt) of every Shift in the range,
 * with the shift's startsAt inside the range (left-edge filter).
 * Worked = sum of session durations from punches paired IN→OUT.
 *
 * Tenant filter: every query scopes on ctx.companyId.
 */
export async function getReportForRange(
  ctx: TenantContext,
  input: { startDate: Date; endDate: Date },
): Promise<ReportData> {
  // Normalize range so end is inclusive at 23:59:59.999.
  let startDate = startOfLocalDay(input.startDate);
  let endDate = endOfLocalDay(input.endDate);
  if (endDate < startDate) {
    // Swap if caller provided reversed bounds.
    [startDate, endDate] = [endDate, startDate];
  }

  // 1) Shifts in range (we filter on startsAt for stability).
  const shifts = await db.shift.findMany({
    where: {
      companyId: ctx.companyId,
      startsAt: { gte: startDate, lte: endDate },
    },
    select: {
      id: true,
      employeeId: true,
      positionId: true,
      startsAt: true,
      endsAt: true,
      employee: { select: { id: true, name: true, email: true } },
      position: { select: { id: true, name: true } },
    },
  });

  // 2) Punches in range (loaded raw, paired afterwards per employee).
  const punches = await db.punch.findMany({
    where: {
      companyId: ctx.companyId,
      punchedAt: { gte: startDate, lte: endDate },
    },
    select: {
      id: true,
      employeeId: true,
      locationId: true,
      type: true,
      punchedAt: true,
      notes: true,
      employee: { select: { id: true, name: true, email: true } },
      location: { select: { id: true, name: true } },
    },
    orderBy: { punchedAt: "asc" },
  });

  // 3) Active employees of the company (for fallback rows when an
  // employee has shifts/punches but no row yet — actually built below).
  const employees = await db.user.findMany({
    where: { companyId: ctx.companyId, isActive: true },
    select: { id: true, name: true, email: true },
  });

  // Build per-employee aggregations.
  type EmpAgg = {
    employeeId: string;
    name: string | null;
    email: string;
    scheduledMinutes: number;
    workedMinutes: number;
    openSessionsCount: number;
  };
  const empMap = new Map<string, EmpAgg>();
  const ensureEmp = (id: string, name: string | null, email: string) => {
    let e = empMap.get(id);
    if (!e) {
      e = {
        employeeId: id,
        name,
        email,
        scheduledMinutes: 0,
        workedMinutes: 0,
        openSessionsCount: 0,
      };
      empMap.set(id, e);
    }
    return e;
  };

  // Seed with active employees so they always appear (even at 0/0).
  for (const u of employees) {
    ensureEmp(u.id, u.name, u.email);
  }

  // Add scheduled hours.
  for (const s of shifts) {
    if (!s.employeeId || !s.employee) continue;
    const minutes = Math.round(
      (s.endsAt.getTime() - s.startsAt.getTime()) / 60_000,
    );
    const e = ensureEmp(s.employeeId, s.employee.name, s.employee.email);
    e.scheduledMinutes += minutes;
  }

  // Group punches per employee for pairing.
  const punchesByEmployee = new Map<string, PunchRow[]>();
  for (const p of punches) {
    const list = punchesByEmployee.get(p.employeeId) ?? [];
    list.push(p);
    punchesByEmployee.set(p.employeeId, list);
  }
  for (const [empId, rows] of punchesByEmployee.entries()) {
    const employee = rows[0].employee;
    const e = ensureEmp(empId, employee.name, employee.email);
    const sessions = pairPunches(rows);
    for (const sess of sessions) {
      if (sess.durationMinutes !== null) {
        e.workedMinutes += sess.durationMinutes;
      } else {
        e.openSessionsCount += 1;
      }
    }
  }

  const perEmployee: ReportEmployeeRow[] = Array.from(empMap.values())
    .map((e) => ({
      ...e,
      varianceMinutes: e.workedMinutes - e.scheduledMinutes,
    }))
    // Sort by worked desc then scheduled desc — most active first.
    .sort((a, b) => {
      if (b.workedMinutes !== a.workedMinutes) {
        return b.workedMinutes - a.workedMinutes;
      }
      return b.scheduledMinutes - a.scheduledMinutes;
    });

  // Per-position aggregations: scheduled comes from shifts; worked is
  // attributed to a shift's position only when a punch session overlaps
  // a shift of that position — too noisy. So worked-per-position is
  // approximated: for each session, find the closest shift in range to
  // attribute the worked minutes to its position. Simpler MVP: report
  // worked minutes only at the company-total level, and per-position
  // ONLY for scheduled. Worked-per-position = sum on shifts that have a
  // matching session count > 0 (rough). We pick the simpler interpretation:
  // worked-per-position = 0 (not yet computed in this MVP) — but spec
  // expects it. We compute it cheaply: for each shift, if the employee
  // has ANY punch in the shift window, count the shift duration as
  // "worked-for-this-position". This is approximate but explainable.
  type PosAgg = {
    positionId: string | null;
    positionName: string;
    scheduledMinutes: number;
    workedMinutes: number;
  };
  const posMap = new Map<string, PosAgg>();
  const keyFor = (posId: string | null) => posId ?? "__none__";
  const ensurePos = (posId: string | null, name: string) => {
    const k = keyFor(posId);
    let p = posMap.get(k);
    if (!p) {
      p = { positionId: posId, positionName: name, scheduledMinutes: 0, workedMinutes: 0 };
      posMap.set(k, p);
    }
    return p;
  };

  for (const s of shifts) {
    const minutes = Math.round(
      (s.endsAt.getTime() - s.startsAt.getTime()) / 60_000,
    );
    const pos = ensurePos(s.positionId, s.position?.name ?? "Sans position");
    pos.scheduledMinutes += minutes;

    // Has any punch from this employee landed inside this shift window?
    if (s.employeeId) {
      const empPunches = punchesByEmployee.get(s.employeeId) ?? [];
      const overlap = empPunches.some(
        (p) => p.punchedAt >= s.startsAt && p.punchedAt <= s.endsAt,
      );
      if (overlap) pos.workedMinutes += minutes;
    }
  }

  const perPosition: ReportPositionRow[] = Array.from(posMap.values()).sort(
    (a, b) => b.scheduledMinutes - a.scheduledMinutes,
  );

  const totals = perEmployee.reduce(
    (acc, e) => ({
      scheduledMinutes: acc.scheduledMinutes + e.scheduledMinutes,
      workedMinutes: acc.workedMinutes + e.workedMinutes,
      varianceMinutes: acc.varianceMinutes + e.varianceMinutes,
      activeEmployees: acc.activeEmployees,
    }),
    { scheduledMinutes: 0, workedMinutes: 0, varianceMinutes: 0, activeEmployees: 0 },
  );
  totals.activeEmployees = perEmployee.filter(
    (e) => e.scheduledMinutes > 0 || e.workedMinutes > 0,
  ).length;

  return {
    range: { startDate, endDate },
    perEmployee,
    perPosition,
    totals,
  };
}

import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";
import { createNotificationsInTx } from "@/lib/repositories/notification";
import { pairPunches, type PunchRow } from "@/lib/repositories/punch";
import { mondayOfWeek, weekRangeFrom } from "@/lib/week";

export type TimesheetEntry = {
  employeeId: string;
  employeeName: string | null;
  employeeEmail: string;
  scheduledMinutes: number;
  workedMinutes: number;
  varianceMinutes: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "UNREVIEWED";
  approvalId: string | null;
  managerNote: string | null;
  decidedAt: Date | null;
};

function normalizeMonday(d: Date): Date {
  const m = mondayOfWeek(d);
  return m;
}

/**
 * Build a per-employee timesheet view for a given week. Combines:
 *   - active employees of the company
 *   - their scheduled minutes (from Shift)
 *   - their worked minutes (from paired Punch sessions)
 *   - existing TimesheetApproval row if any (status, snapshot, decidedAt)
 * Returns one row per active employee (status=UNREVIEWED when no approval exists).
 */
export async function listForWeek(
  ctx: TenantContext,
  weekStart: Date,
): Promise<TimesheetEntry[]> {
  const monday = normalizeMonday(weekStart);
  const range = weekRangeFrom(monday);

  const [employees, shifts, punches, approvals] = await Promise.all([
    db.user.findMany({
      where: { companyId: ctx.companyId, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
    db.shift.findMany({
      where: {
        companyId: ctx.companyId,
        startsAt: { gte: range.start, lte: range.end },
      },
      select: {
        employeeId: true,
        startsAt: true,
        endsAt: true,
      },
    }),
    db.punch.findMany({
      where: {
        companyId: ctx.companyId,
        punchedAt: { gte: range.start, lte: range.end },
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
    }),
    db.timesheetApproval.findMany({
      where: { companyId: ctx.companyId, weekStart: monday },
      select: {
        id: true,
        employeeId: true,
        status: true,
        managerNote: true,
        decidedAt: true,
      },
    }),
  ]);

  const scheduledByEmp = new Map<string, number>();
  for (const s of shifts) {
    if (!s.employeeId) continue;
    const min = Math.round(
      (s.endsAt.getTime() - s.startsAt.getTime()) / 60_000,
    );
    scheduledByEmp.set(
      s.employeeId,
      (scheduledByEmp.get(s.employeeId) ?? 0) + min,
    );
  }

  const punchesByEmp = new Map<string, PunchRow[]>();
  for (const p of punches as PunchRow[]) {
    const list = punchesByEmp.get(p.employeeId) ?? [];
    list.push(p);
    punchesByEmp.set(p.employeeId, list);
  }
  const workedByEmp = new Map<string, number>();
  for (const [empId, rows] of punchesByEmp.entries()) {
    const sessions = pairPunches(rows);
    workedByEmp.set(
      empId,
      sessions.reduce((acc, s) => acc + (s.durationMinutes ?? 0), 0),
    );
  }

  const approvalByEmp = new Map<string, (typeof approvals)[number]>();
  for (const a of approvals) approvalByEmp.set(a.employeeId, a);

  return employees.map((e) => {
    const scheduled = scheduledByEmp.get(e.id) ?? 0;
    const worked = workedByEmp.get(e.id) ?? 0;
    const approval = approvalByEmp.get(e.id);
    return {
      employeeId: e.id,
      employeeName: e.name,
      employeeEmail: e.email,
      scheduledMinutes: scheduled,
      workedMinutes: worked,
      varianceMinutes: worked - scheduled,
      status: (approval?.status ?? "UNREVIEWED") as TimesheetEntry["status"],
      approvalId: approval?.id ?? null,
      managerNote: approval?.managerNote ?? null,
      decidedAt: approval?.decidedAt ?? null,
    };
  });
}

type DecideInput = {
  weekStart: Date;
  employeeId: string;
  status: "APPROVED" | "REJECTED";
  managerNote?: string | null;
};

export async function decideForEmployee(
  ctx: TenantContext,
  input: DecideInput,
): Promise<{ employee: { id: string; email: string; name: string | null } }> {
  const monday = normalizeMonday(input.weekStart);
  const range = weekRangeFrom(monday);

  return db.$transaction(async (tx) => {
    const employee = await tx.user.findFirst({
      where: { id: input.employeeId, companyId: ctx.companyId },
      select: { id: true, email: true, name: true },
    });
    if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");

    // Compute snapshot in transaction so it's the value at decision time.
    const [shifts, punches] = await Promise.all([
      tx.shift.findMany({
        where: {
          companyId: ctx.companyId,
          employeeId: input.employeeId,
          startsAt: { gte: range.start, lte: range.end },
        },
        select: { startsAt: true, endsAt: true },
      }),
      tx.punch.findMany({
        where: {
          companyId: ctx.companyId,
          employeeId: input.employeeId,
          punchedAt: { gte: range.start, lte: range.end },
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
      }),
    ]);

    const scheduledMinutes = shifts.reduce(
      (acc, s) =>
        acc +
        Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 60_000),
      0,
    );
    const sessions = pairPunches(punches as PunchRow[]);
    const workedMinutes = sessions.reduce(
      (acc, s) => acc + (s.durationMinutes ?? 0),
      0,
    );

    await tx.timesheetApproval.upsert({
      where: {
        companyId_weekStart_employeeId: {
          companyId: ctx.companyId,
          weekStart: monday,
          employeeId: input.employeeId,
        },
      },
      create: {
        companyId: ctx.companyId,
        weekStart: monday,
        employeeId: input.employeeId,
        status: input.status,
        scheduledMinutesSnapshot: scheduledMinutes,
        workedMinutesSnapshot: workedMinutes,
        varianceMinutesSnapshot: workedMinutes - scheduledMinutes,
        managerNote: input.managerNote ?? null,
        decidedByUserId: ctx.userId,
        decidedAt: new Date(),
      },
      update: {
        status: input.status,
        scheduledMinutesSnapshot: scheduledMinutes,
        workedMinutesSnapshot: workedMinutes,
        varianceMinutesSnapshot: workedMinutes - scheduledMinutes,
        managerNote: input.managerNote ?? null,
        decidedByUserId: ctx.userId,
        decidedAt: new Date(),
      },
    });

    await createNotificationsInTx(tx, [
      {
        companyId: ctx.companyId,
        recipientUserId: input.employeeId,
        type: "TIMESHEET_DECIDED" as const,
        payload: {
          type: "TIMESHEET_DECIDED" as const,
          status: input.status,
          weekStartISO: monday.toISOString().slice(0, 10),
          workedMinutes,
          managerNote: input.managerNote ?? null,
        },
      },
    ]);

    return { employee };
  });
}

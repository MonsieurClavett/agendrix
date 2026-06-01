import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";
import type { WeekRange } from "@/lib/week";
import type { TimeOffStatus, TimeOffType } from "@/generated/prisma";
import { createNotificationsInTx } from "@/lib/repositories/notification";

/**
 * Tenant pattern (Constitution Principle I): every read AND write
 * filters on `companyId = ctx.companyId`. Server Actions never call
 * db.timeOffRequest.* directly.
 *
 * Dual-actor authorization (research.md Decision 3): mutations check
 * both tenant ownership AND that the actor is either the target
 * employee (when allowed) OR a MANAGER of the same company.
 */

const timeOffSelect = {
  id: true,
  companyId: true,
  employeeId: true,
  startDate: true,
  endDate: true,
  type: true,
  reason: true,
  status: true,
  decidedAt: true,
  decidedByUserId: true,
  employee: { select: { id: true, name: true } },
  decidedBy: { select: { id: true, name: true } },
} as const;

export type TimeOffRequestRow = {
  id: string;
  companyId: string;
  employeeId: string;
  startDate: Date;
  endDate: Date;
  type: TimeOffType;
  reason: string | null;
  status: TimeOffStatus;
  decidedAt: Date | null;
  decidedByUserId: string | null;
  employee: { id: string; name: string | null };
  decidedBy: { id: string; name: string | null } | null;
};

export type CreateTimeOffInput = {
  startDate: Date;
  endDate: Date;
  type: TimeOffType;
  reason: string | null;
};

export async function listTimeOffForEmployee(
  ctx: TenantContext,
  targetEmployeeId: string,
): Promise<TimeOffRequestRow[]> {
  if (targetEmployeeId !== ctx.userId && ctx.role !== "MANAGER") {
    throw new Error("FORBIDDEN");
  }
  const target = await db.user.findFirst({
    where: { id: targetEmployeeId, companyId: ctx.companyId },
    select: { id: true },
  });
  if (!target) throw new Error("EMPLOYEE_NOT_FOUND");

  return db.timeOffRequest.findMany({
    where: { companyId: ctx.companyId, employeeId: targetEmployeeId },
    select: timeOffSelect,
    orderBy: [{ startDate: "desc" }],
  });
}

export async function listTimeOffForCompany(
  ctx: TenantContext,
  opts: { statusIn: TimeOffStatus[] },
): Promise<TimeOffRequestRow[]> {
  if (ctx.role !== "MANAGER") throw new Error("FORBIDDEN");
  return db.timeOffRequest.findMany({
    where: { companyId: ctx.companyId, status: { in: opts.statusIn } },
    select: timeOffSelect,
    orderBy: [{ startDate: "desc" }],
  });
}

/**
 * Returns rows whose range intersects the given week AND whose status
 * is PENDING or APPROVED (REJECTED is inert). Used to build the
 * calendar overlay.
 *
 * Non-MANAGER actors only see their own subset.
 */
export async function listTimeOffOverlappingWeek(
  ctx: TenantContext,
  range: WeekRange,
): Promise<TimeOffRequestRow[]> {
  const where = {
    companyId: ctx.companyId,
    status: { in: ["PENDING", "APPROVED"] as TimeOffStatus[] },
    startDate: { lte: range.end },
    endDate: { gte: range.start },
    ...(ctx.role !== "MANAGER" ? { employeeId: ctx.userId } : {}),
  };
  return db.timeOffRequest.findMany({
    where,
    select: timeOffSelect,
  });
}

export async function createTimeOff(
  ctx: TenantContext,
  targetEmployeeId: string,
  data: CreateTimeOffInput,
): Promise<TimeOffRequestRow> {
  if (data.endDate.getTime() < data.startDate.getTime()) {
    throw new Error("INVALID_INPUT");
  }
  return db.$transaction(async (tx) => {
    const employee = await tx.user.findFirst({
      where: { id: targetEmployeeId, companyId: ctx.companyId },
      select: { id: true },
    });
    if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");

    if (targetEmployeeId !== ctx.userId && ctx.role !== "MANAGER") {
      throw new Error("FORBIDDEN");
    }

    const overlap = await tx.timeOffRequest.findFirst({
      where: {
        companyId: ctx.companyId,
        employeeId: targetEmployeeId,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: data.endDate },
        endDate: { gte: data.startDate },
      },
      select: { id: true },
    });
    if (overlap) throw new Error("OVERLAP");

    return tx.timeOffRequest.create({
      data: {
        companyId: ctx.companyId,
        employeeId: targetEmployeeId,
        startDate: data.startDate,
        endDate: data.endDate,
        type: data.type,
        reason: data.reason,
        status: "PENDING",
      },
      select: timeOffSelect,
    });
  });
}

export type TimeOffDecisionResult = {
  row: TimeOffRequestRow;
  recipient: {
    employeeId: string;
    email: string;
    name: string | null;
  };
};

function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function decideTimeOff(
  ctx: TenantContext,
  requestId: string,
  decision: "APPROVED" | "REJECTED",
): Promise<TimeOffDecisionResult> {
  return db.$transaction(async (tx) => {
    const existing = await tx.timeOffRequest.findFirst({
      where: { id: requestId, companyId: ctx.companyId },
      select: {
        id: true,
        employeeId: true,
        status: true,
        startDate: true,
        endDate: true,
        type: true,
        employee: { select: { id: true, email: true, name: true } },
      },
    });
    if (!existing) throw new Error("NOT_FOUND");
    if (ctx.role !== "MANAGER") throw new Error("FORBIDDEN");
    if (existing.status !== "PENDING") throw new Error("ALREADY_DECIDED");

    if (decision === "APPROVED") {
      const conflict = await tx.timeOffRequest.findFirst({
        where: {
          id: { not: requestId },
          companyId: ctx.companyId,
          employeeId: existing.employeeId,
          status: { in: ["PENDING", "APPROVED"] },
          startDate: { lte: existing.endDate },
          endDate: { gte: existing.startDate },
        },
        select: { id: true },
      });
      if (conflict) throw new Error("OVERLAP");
    }

    const updated = await tx.timeOffRequest.update({
      where: { id: requestId },
      data: {
        status: decision,
        decidedAt: new Date(),
        decidedByUserId: ctx.userId,
      },
      select: timeOffSelect,
    });

    await createNotificationsInTx(tx, [
      {
        companyId: ctx.companyId,
        recipientUserId: existing.employeeId,
        type: "TIME_OFF_DECIDED",
        payload: {
          type: "TIME_OFF_DECIDED",
          status: decision,
          startDate: toISODateLocal(existing.startDate),
          endDate: toISODateLocal(existing.endDate),
          timeOffType: existing.type,
        },
      },
    ]);

    return {
      row: updated,
      recipient: {
        employeeId: existing.employee.id,
        email: existing.employee.email,
        name: existing.employee.name,
      },
    };
  });
}

export async function deleteTimeOff(
  ctx: TenantContext,
  requestId: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const existing = await tx.timeOffRequest.findFirst({
      where: { id: requestId, companyId: ctx.companyId },
      select: { id: true, employeeId: true, status: true },
    });
    if (!existing) throw new Error("NOT_FOUND");

    const isManager = ctx.role === "MANAGER";
    const isOwnPending =
      existing.employeeId === ctx.userId && existing.status === "PENDING";
    if (!isManager && !isOwnPending) throw new Error("FORBIDDEN");

    await tx.timeOffRequest.delete({ where: { id: requestId } });
  });
}

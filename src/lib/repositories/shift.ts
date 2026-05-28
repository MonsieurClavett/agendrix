import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";
import type { WeekRange } from "@/lib/week";

/**
 * Tenant pattern (Constitution Principle I): every read AND every write
 * filters on `companyId = ctx.companyId`. Server Actions must never call
 * db.shift.* directly — they go through these functions.
 */

const shiftSelect = {
  id: true,
  employeeId: true,
  startsAt: true,
  endsAt: true,
  note: true,
  employee: {
    select: { id: true, name: true, isActive: true },
  },
} as const;

export type ShiftRow = {
  id: string;
  employeeId: string;
  startsAt: Date;
  endsAt: Date;
  note: string | null;
  employee: { id: string; name: string | null; isActive: boolean };
};

/** MANAGER week view: every shift of the tenant overlapping the range. */
export async function listShiftsForCompanyWeek(
  ctx: TenantContext,
  range: WeekRange,
): Promise<ShiftRow[]> {
  return db.shift.findMany({
    where: {
      companyId: ctx.companyId,
      startsAt: { lt: range.end },
      endsAt: { gt: range.start },
    },
    select: shiftSelect,
    orderBy: [{ startsAt: "asc" }],
  });
}

/** EMPLOYEE week view: their own shifts only. */
export async function listShiftsForUserWeek(
  ctx: TenantContext,
  userId: string,
  range: WeekRange,
): Promise<ShiftRow[]> {
  return db.shift.findMany({
    where: {
      companyId: ctx.companyId,
      employeeId: userId,
      startsAt: { lt: range.end },
      endsAt: { gt: range.start },
    },
    select: shiftSelect,
    orderBy: [{ startsAt: "asc" }],
  });
}

/**
 * Insert a shift after verifying:
 *  - the assignee is a User of `ctx.companyId` (throws EMPLOYEE_NOT_FOUND)
 *  - no existing shift of that employee overlaps the [startsAt, endsAt)
 *    interval (throws OVERLAP)
 *
 * Both checks happen inside the same transaction as the insert so
 * concurrent writers cannot both pass the pre-check.
 */
export async function createShift(
  ctx: TenantContext,
  data: { employeeId: string; startsAt: Date; endsAt: Date; note: string | null },
) {
  return db.$transaction(async (tx) => {
    const employee = await tx.user.findFirst({
      where: { id: data.employeeId, companyId: ctx.companyId },
      select: { id: true },
    });
    if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");

    const overlap = await tx.shift.findFirst({
      where: {
        employeeId: data.employeeId,
        startsAt: { lt: data.endsAt },
        endsAt: { gt: data.startsAt },
      },
      select: { id: true },
    });
    if (overlap) throw new Error("OVERLAP");

    return tx.shift.create({
      data: {
        companyId: ctx.companyId,
        employeeId: data.employeeId,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        note: data.note,
      },
      select: shiftSelect,
    });
  });
}

/**
 * Update an existing shift. Verifies:
 *  - the shift belongs to `ctx.companyId` (throws NOT_FOUND)
 *  - the new assignee belongs to `ctx.companyId` (throws EMPLOYEE_NOT_FOUND)
 *  - the new interval does not overlap any OTHER shift of that employee
 *    (throws OVERLAP) — excludes the shift being updated itself.
 */
export async function updateShift(
  ctx: TenantContext,
  shiftId: string,
  data: { employeeId: string; startsAt: Date; endsAt: Date; note: string | null },
) {
  return db.$transaction(async (tx) => {
    const existing = await tx.shift.findFirst({
      where: { id: shiftId, companyId: ctx.companyId },
      select: { id: true },
    });
    if (!existing) throw new Error("NOT_FOUND");

    const employee = await tx.user.findFirst({
      where: { id: data.employeeId, companyId: ctx.companyId },
      select: { id: true },
    });
    if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");

    const overlap = await tx.shift.findFirst({
      where: {
        id: { not: shiftId },
        employeeId: data.employeeId,
        startsAt: { lt: data.endsAt },
        endsAt: { gt: data.startsAt },
      },
      select: { id: true },
    });
    if (overlap) throw new Error("OVERLAP");

    return tx.shift.update({
      where: { id: shiftId },
      data: {
        employeeId: data.employeeId,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        note: data.note,
      },
      select: shiftSelect,
    });
  });
}

/** Hard delete, scoped by tenant. Throws NOT_FOUND if nothing was deleted. */
export async function deleteShift(ctx: TenantContext, shiftId: string) {
  const result = await db.shift.deleteMany({
    where: { id: shiftId, companyId: ctx.companyId },
  });
  if (result.count === 0) throw new Error("NOT_FOUND");
}

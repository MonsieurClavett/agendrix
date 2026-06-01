import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";
import { toISODate, type WeekRange } from "@/lib/week";
import type { ShiftStatus } from "@/generated/prisma";
import { createNotificationsInTx } from "@/lib/repositories/notification";

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
  positionId: true,
  status: true,
  employee: {
    select: { id: true, name: true, isActive: true },
  },
  position: {
    select: { id: true, name: true, color: true },
  },
} as const;

/**
 * MANAGER-only select — includes `internalNote` (Phase 20). EMPLOYEE
 * reads MUST use `shiftSelect` so the column never leaks client-side.
 */
const managerShiftSelect = {
  ...shiftSelect,
  internalNote: true,
} as const;

export type ShiftRow = {
  id: string;
  employeeId: string | null;
  startsAt: Date;
  endsAt: Date;
  note: string | null;
  internalNote?: string | null;
  positionId: string | null;
  status: ShiftStatus;
  employee: { id: string; name: string | null; isActive: boolean } | null;
  position: { id: string; name: string; color: string } | null;
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
    select: managerShiftSelect,
    orderBy: [{ startsAt: "asc" }],
  });
}

/** EMPLOYEE week view: their own PUBLISHED shifts only. */
export async function listShiftsForUserWeek(
  ctx: TenantContext,
  userId: string,
  range: WeekRange,
): Promise<ShiftRow[]> {
  return db.shift.findMany({
    where: {
      companyId: ctx.companyId,
      employeeId: userId,
      status: "PUBLISHED",
      startsAt: { lt: range.end },
      endsAt: { gt: range.start },
    },
    select: shiftSelect,
    orderBy: [{ startsAt: "asc" }],
  });
}

/** Count DRAFT shifts inside a given week — drives the "Publier la semaine" button state. */
export async function countDraftsForCompanyWeek(
  ctx: TenantContext,
  range: WeekRange,
): Promise<number> {
  return db.shift.count({
    where: {
      companyId: ctx.companyId,
      status: "DRAFT",
      startsAt: { lt: range.end },
      endsAt: { gt: range.start },
    },
  });
}

/**
 * Open shifts (employeeId IS NULL) overlapping the week.
 *
 * MANAGER callers see every status. Non-MANAGER callers see PUBLISHED
 * only — the same Phase-8 rule as for regular shifts.
 */
export async function listOpenShiftsForCompanyWeek(
  ctx: TenantContext,
  range: WeekRange,
): Promise<ShiftRow[]> {
  return db.shift.findMany({
    where: {
      companyId: ctx.companyId,
      employeeId: null,
      startsAt: { lt: range.end },
      endsAt: { gt: range.start },
      ...(ctx.role !== "MANAGER" ? { status: "PUBLISHED" as const } : {}),
    },
    select: shiftSelect,
    orderBy: [{ startsAt: "asc" }],
  });
}

export type PublishRecipient = {
  employeeId: string;
  email: string;
  name: string | null;
  count: number;
};

/**
 * Bulk transition every DRAFT in the visible week to PUBLISHED.
 * Inside a single transaction, also emit one SHIFT_PUBLISHED
 * notification per affected employee (the trigger-site for Phase 11
 * US1). The caller is responsible for firing emails post-commit.
 *
 * Returns:
 *  - `count`: total shifts moved DRAFT → PUBLISHED.
 *  - `recipients`: one entry per affected employee (`employeeId`,
 *    `email`, `name`, `count`) — `[]` when no shifts moved.
 */
export async function publishDraftsForWeek(
  ctx: TenantContext,
  range: WeekRange,
): Promise<{ count: number; recipients: PublishRecipient[] }> {
  return db.$transaction(async (tx) => {
    const filter = {
      companyId: ctx.companyId,
      status: "DRAFT" as const,
      startsAt: { lt: range.end },
      endsAt: { gt: range.start },
      employeeId: { not: null },
    };

    const drafts = await tx.shift.findMany({
      where: filter,
      select: { employeeId: true },
    });

    const countsByEmployee = new Map<string, number>();
    for (const d of drafts) {
      if (!d.employeeId) continue;
      countsByEmployee.set(
        d.employeeId,
        (countsByEmployee.get(d.employeeId) ?? 0) + 1,
      );
    }

    const result = await tx.shift.updateMany({
      where: filter,
      data: { status: "PUBLISHED" },
    });

    if (countsByEmployee.size === 0) {
      return { count: result.count, recipients: [] };
    }

    const employees = await tx.user.findMany({
      where: {
        id: { in: [...countsByEmployee.keys()] },
        companyId: ctx.companyId,
      },
      select: { id: true, email: true, name: true },
    });

    const weekStartISO = toISODate(range.start);

    await createNotificationsInTx(
      tx,
      employees.map((e) => ({
        companyId: ctx.companyId,
        recipientUserId: e.id,
        type: "SHIFT_PUBLISHED" as const,
        payload: {
          type: "SHIFT_PUBLISHED" as const,
          shiftCount: countsByEmployee.get(e.id) ?? 0,
          weekStartISO,
        },
      })),
    );

    const recipients: PublishRecipient[] = employees.map((e) => ({
      employeeId: e.id,
      email: e.email,
      name: e.name,
      count: countsByEmployee.get(e.id) ?? 0,
    }));

    return { count: result.count, recipients };
  });
}

/** Reverse a single PUBLISHED shift back to DRAFT. Throws NOT_FOUND otherwise. */
export async function unpublishShift(
  ctx: TenantContext,
  shiftId: string,
): Promise<void> {
  const result = await db.shift.updateMany({
    where: {
      id: shiftId,
      companyId: ctx.companyId,
      status: "PUBLISHED",
    },
    data: { status: "DRAFT" },
  });
  if (result.count === 0) throw new Error("NOT_FOUND");
}

/**
 * Insert a shift after verifying:
 *  - the assignee is a User of `ctx.companyId` (throws EMPLOYEE_NOT_FOUND)
 *  - if `positionId !== null`, the position belongs to `ctx.companyId`
 *    (throws POSITION_NOT_FOUND)
 *  - no existing shift of that employee overlaps [startsAt, endsAt)
 *    (throws OVERLAP)
 *
 * All checks run inside the same transaction as the insert.
 */
export async function createShift(
  ctx: TenantContext,
  data: {
    employeeId: string | null;
    startsAt: Date;
    endsAt: Date;
    note: string | null;
    internalNote: string | null;
    positionId: string | null;
  },
) {
  return db.$transaction(async (tx) => {
    if (data.employeeId) {
      const employee = await tx.user.findFirst({
        where: { id: data.employeeId, companyId: ctx.companyId },
        select: { id: true },
      });
      if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");
    }

    if (data.positionId) {
      const position = await tx.position.findFirst({
        where: { id: data.positionId, companyId: ctx.companyId },
        select: { id: true },
      });
      if (!position) throw new Error("POSITION_NOT_FOUND");
    }

    if (data.employeeId) {
      const overlap = await tx.shift.findFirst({
        where: {
          employeeId: data.employeeId,
          startsAt: { lt: data.endsAt },
          endsAt: { gt: data.startsAt },
        },
        select: { id: true },
      });
      if (overlap) throw new Error("OVERLAP");
    }

    return tx.shift.create({
      data: {
        companyId: ctx.companyId,
        employeeId: data.employeeId,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        note: data.note,
        internalNote: data.internalNote,
        positionId: data.positionId,
      },
      select: managerShiftSelect,
    });
  });
}

/**
 * Update an existing shift. Verifies:
 *  - the shift belongs to `ctx.companyId` (throws NOT_FOUND)
 *  - the new assignee belongs to `ctx.companyId` (throws EMPLOYEE_NOT_FOUND)
 *  - if `positionId !== null`, the position belongs to `ctx.companyId`
 *    (throws POSITION_NOT_FOUND)
 *  - the new interval does not overlap any OTHER shift of that employee
 *    (throws OVERLAP) — excludes the shift being updated itself.
 */
export async function updateShift(
  ctx: TenantContext,
  shiftId: string,
  data: {
    employeeId: string | null;
    startsAt: Date;
    endsAt: Date;
    note: string | null;
    internalNote: string | null;
    positionId: string | null;
  },
) {
  return db.$transaction(async (tx) => {
    const existing = await tx.shift.findFirst({
      where: { id: shiftId, companyId: ctx.companyId },
      select: { id: true },
    });
    if (!existing) throw new Error("NOT_FOUND");

    if (data.employeeId) {
      const employee = await tx.user.findFirst({
        where: { id: data.employeeId, companyId: ctx.companyId },
        select: { id: true },
      });
      if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");
    }

    if (data.positionId) {
      const position = await tx.position.findFirst({
        where: { id: data.positionId, companyId: ctx.companyId },
        select: { id: true },
      });
      if (!position) throw new Error("POSITION_NOT_FOUND");
    }

    if (data.employeeId) {
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
    }

    return tx.shift.update({
      where: { id: shiftId },
      data: {
        employeeId: data.employeeId,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        note: data.note,
        internalNote: data.internalNote,
        positionId: data.positionId,
      },
      select: managerShiftSelect,
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

import { Prisma } from "@/generated/prisma";

import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";
import { createNotificationsInTx } from "@/lib/repositories/notification";
import { intervalsOverlap } from "@/lib/week";

const requestSelect = {
  id: true,
  shiftId: true,
  employeeId: true,
  requestedStartsAt: true,
  requestedEndsAt: true,
  reason: true,
  status: true,
  decidedAt: true,
  managerNote: true,
  createdAt: true,
  employee: { select: { id: true, name: true, email: true } },
  decidedBy: { select: { id: true, name: true, email: true } },
  shift: {
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      employeeId: true,
      status: true,
    },
  },
} as const;

export type ShiftChangeRequestRow = {
  id: string;
  shiftId: string;
  employeeId: string;
  requestedStartsAt: Date;
  requestedEndsAt: Date;
  reason: string | null;
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELED_BY_EMPLOYEE";
  decidedAt: Date | null;
  managerNote: string | null;
  createdAt: Date;
  employee: { id: string; name: string | null; email: string };
  decidedBy: { id: string; name: string | null; email: string } | null;
  shift: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    employeeId: string | null;
    status: "DRAFT" | "PUBLISHED";
  };
};

export async function listPendingForCompany(
  ctx: TenantContext,
): Promise<ShiftChangeRequestRow[]> {
  return db.shiftChangeRequest.findMany({
    where: { companyId: ctx.companyId, status: "PENDING" },
    select: requestSelect,
    orderBy: { createdAt: "asc" },
  });
}

export async function listRecentDecidedForCompany(
  ctx: TenantContext,
  limit: number = 20,
): Promise<ShiftChangeRequestRow[]> {
  return db.shiftChangeRequest.findMany({
    where: {
      companyId: ctx.companyId,
      status: { in: ["APPROVED", "REJECTED", "CANCELED_BY_EMPLOYEE"] },
    },
    select: requestSelect,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function listMyRequests(
  ctx: TenantContext,
): Promise<ShiftChangeRequestRow[]> {
  return db.shiftChangeRequest.findMany({
    where: { companyId: ctx.companyId, employeeId: ctx.userId },
    select: requestSelect,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listPendingShiftIds(
  ctx: TenantContext,
): Promise<Set<string>> {
  const rows = await db.shiftChangeRequest.findMany({
    where: { companyId: ctx.companyId, status: "PENDING" },
    select: { shiftId: true },
  });
  return new Set(rows.map((r) => r.shiftId));
}

type CreateInput = {
  shiftId: string;
  requestedStartsAt: Date;
  requestedEndsAt: Date;
  reason: string | null;
};

export async function createRequest(
  ctx: TenantContext,
  input: CreateInput,
): Promise<{
  request: ShiftChangeRequestRow;
  managers: { id: string; email: string; name: string | null }[];
  requesterName: string | null;
}> {
  // Duration must be between 15 min and 24 h.
  const durationMin =
    (input.requestedEndsAt.getTime() - input.requestedStartsAt.getTime()) /
    60_000;
  if (durationMin < 15) throw new Error("DURATION_TOO_SHORT");
  if (durationMin > 24 * 60) throw new Error("DURATION_TOO_LONG");
  if (input.requestedEndsAt <= input.requestedStartsAt)
    throw new Error("END_BEFORE_START");

  return db.$transaction(async (tx) => {
    const shift = await tx.shift.findFirst({
      where: { id: input.shiftId, companyId: ctx.companyId },
      select: {
        id: true,
        employeeId: true,
        status: true,
        startsAt: true,
        endsAt: true,
      },
    });
    if (!shift) throw new Error("SHIFT_NOT_FOUND");
    if (shift.employeeId !== ctx.userId) throw new Error("NOT_SHIFT_OWNER");
    if (shift.status !== "PUBLISHED") throw new Error("NOT_PUBLISHED");

    let created;
    try {
      created = await tx.shiftChangeRequest.create({
        data: {
          companyId: ctx.companyId,
          shiftId: input.shiftId,
          employeeId: ctx.userId,
          requestedStartsAt: input.requestedStartsAt,
          requestedEndsAt: input.requestedEndsAt,
          reason: input.reason,
        },
        select: requestSelect,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new Error("REQUEST_ALREADY_PENDING");
      }
      throw e;
    }

    const requester = await tx.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true },
    });
    const requesterName = requester?.name ?? null;

    const managers = await tx.user.findMany({
      where: {
        companyId: ctx.companyId,
        role: "MANAGER",
        isActive: true,
      },
      select: { id: true, email: true, name: true },
    });

    await createNotificationsInTx(
      tx,
      managers.map((m) => ({
        companyId: ctx.companyId,
        recipientUserId: m.id,
        type: "SHIFT_CHANGE_REQUESTED" as const,
        payload: {
          type: "SHIFT_CHANGE_REQUESTED" as const,
          requestId: created.id,
          employeeName: requesterName,
          shiftStartISO: shift.startsAt.toISOString(),
          requestedStartISO: input.requestedStartsAt.toISOString(),
          requestedEndISO: input.requestedEndsAt.toISOString(),
        },
      })),
    );

    return { request: created, managers, requesterName };
  });
}

export async function approveRequest(
  ctx: TenantContext,
  requestId: string,
): Promise<{
  request: ShiftChangeRequestRow;
  employee: { id: string; email: string; name: string | null };
}> {
  return db.$transaction(async (tx) => {
    const req = await tx.shiftChangeRequest.findFirst({
      where: { id: requestId, companyId: ctx.companyId },
      select: requestSelect,
    });
    if (!req) throw new Error("NOT_FOUND");
    if (req.status !== "PENDING") throw new Error("NOT_PENDING");

    // Re-verify shift hasn't moved hands or become DRAFT.
    if (
      req.shift.employeeId !== req.employeeId ||
      req.shift.status !== "PUBLISHED"
    ) {
      throw new Error("STATE_DRIFT");
    }

    // Overlap check with OTHER shifts of this employee.
    const others = await tx.shift.findMany({
      where: {
        id: { not: req.shiftId },
        employeeId: req.employeeId,
        startsAt: { lt: req.requestedEndsAt },
        endsAt: { gt: req.requestedStartsAt },
      },
      select: { id: true, startsAt: true, endsAt: true },
    });
    if (
      others.some((o) =>
        intervalsOverlap(
          o.startsAt,
          o.endsAt,
          req.requestedStartsAt,
          req.requestedEndsAt,
        ),
      )
    ) {
      throw new Error("OVERLAP");
    }

    await tx.shift.update({
      where: { id: req.shiftId },
      data: {
        startsAt: req.requestedStartsAt,
        endsAt: req.requestedEndsAt,
      },
    });

    const updated = await tx.shiftChangeRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        decidedAt: new Date(),
        decidedByUserId: ctx.userId,
      },
      select: requestSelect,
    });

    const employee = await tx.user.findUnique({
      where: { id: req.employeeId },
      select: { id: true, email: true, name: true },
    });

    await createNotificationsInTx(tx, [
      {
        companyId: ctx.companyId,
        recipientUserId: req.employeeId,
        type: "SHIFT_CHANGE_DECIDED" as const,
        payload: {
          type: "SHIFT_CHANGE_DECIDED" as const,
          requestId: req.id,
          status: "APPROVED" as const,
          shiftStartISO: req.requestedStartsAt.toISOString(),
          managerNote: null,
        },
      },
    ]);

    return { request: updated, employee: employee! };
  });
}

export async function rejectRequest(
  ctx: TenantContext,
  requestId: string,
  managerNote: string | null,
): Promise<{
  request: ShiftChangeRequestRow;
  employee: { id: string; email: string; name: string | null };
}> {
  return db.$transaction(async (tx) => {
    const req = await tx.shiftChangeRequest.findFirst({
      where: { id: requestId, companyId: ctx.companyId },
      select: requestSelect,
    });
    if (!req) throw new Error("NOT_FOUND");
    if (req.status !== "PENDING") throw new Error("NOT_PENDING");

    const updated = await tx.shiftChangeRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        decidedAt: new Date(),
        decidedByUserId: ctx.userId,
        managerNote: managerNote?.trim() ? managerNote.trim() : null,
      },
      select: requestSelect,
    });

    const employee = await tx.user.findUnique({
      where: { id: req.employeeId },
      select: { id: true, email: true, name: true },
    });

    await createNotificationsInTx(tx, [
      {
        companyId: ctx.companyId,
        recipientUserId: req.employeeId,
        type: "SHIFT_CHANGE_DECIDED" as const,
        payload: {
          type: "SHIFT_CHANGE_DECIDED" as const,
          requestId: req.id,
          status: "REJECTED" as const,
          shiftStartISO: req.requestedStartsAt.toISOString(),
          managerNote: updated.managerNote,
        },
      },
    ]);

    return { request: updated, employee: employee! };
  });
}

export async function cancelRequest(
  ctx: TenantContext,
  requestId: string,
): Promise<void> {
  const req = await db.shiftChangeRequest.findFirst({
    where: { id: requestId, companyId: ctx.companyId },
    select: { id: true, employeeId: true, status: true },
  });
  if (!req) throw new Error("NOT_FOUND");
  if (req.employeeId !== ctx.userId) throw new Error("NOT_OWNER");
  if (req.status !== "PENDING") throw new Error("NOT_PENDING");

  await db.shiftChangeRequest.update({
    where: { id: requestId },
    data: { status: "CANCELED_BY_EMPLOYEE" },
  });
}

import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";
import type { ClaimStatus } from "@/generated/prisma";
import { createNotificationsInTx } from "@/lib/repositories/notification";

function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mondayISO(d: Date): string {
  const day = d.getDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - daysSinceMonday);
  return toISODateLocal(monday);
}

const claimSelect = {
  id: true,
  companyId: true,
  shiftId: true,
  employeeId: true,
  status: true,
  decidedAt: true,
  decidedByUserId: true,
  createdAt: true,
  employee: { select: { id: true, name: true } },
  decidedBy: { select: { id: true, name: true } },
} as const;

export type ClaimRow = {
  id: string;
  companyId: string;
  shiftId: string;
  employeeId: string;
  status: ClaimStatus;
  decidedAt: Date | null;
  decidedByUserId: string | null;
  createdAt: Date;
  employee: { id: string; name: string | null };
  decidedBy: { id: string; name: string | null } | null;
};

export async function listClaimsForEmployee(
  ctx: TenantContext,
  targetEmployeeId: string,
  opts?: { statusIn?: ClaimStatus[] },
): Promise<ClaimRow[]> {
  if (targetEmployeeId !== ctx.userId && ctx.role !== "MANAGER") {
    throw new Error("FORBIDDEN");
  }
  return db.shiftClaim.findMany({
    where: {
      companyId: ctx.companyId,
      employeeId: targetEmployeeId,
      ...(opts?.statusIn ? { status: { in: opts.statusIn } } : {}),
    },
    select: claimSelect,
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function listClaimsForShift(
  ctx: TenantContext,
  shiftId: string,
): Promise<ClaimRow[]> {
  if (ctx.role !== "MANAGER") throw new Error("FORBIDDEN");
  return db.shiftClaim.findMany({
    where: { companyId: ctx.companyId, shiftId },
    select: claimSelect,
    orderBy: [{ createdAt: "asc" }],
  });
}

/** All claims attached to open shifts of the company. MANAGER-only. */
export async function listClaimsForCompanyOpenShifts(
  ctx: TenantContext,
): Promise<ClaimRow[]> {
  if (ctx.role !== "MANAGER") throw new Error("FORBIDDEN");
  return db.shiftClaim.findMany({
    where: {
      companyId: ctx.companyId,
      shift: { employeeId: null },
    },
    select: claimSelect,
    orderBy: [{ createdAt: "asc" }],
  });
}

export async function countPendingClaimsForCompany(
  ctx: TenantContext,
): Promise<number> {
  if (ctx.role !== "MANAGER") return 0;
  return db.shiftClaim.count({
    where: { companyId: ctx.companyId, status: "PENDING" },
  });
}

export async function createClaim(
  ctx: TenantContext,
  shiftId: string,
): Promise<ClaimRow> {
  return db.$transaction(async (tx) => {
    const shift = await tx.shift.findFirst({
      where: { id: shiftId, companyId: ctx.companyId },
      select: { id: true, employeeId: true, status: true },
    });
    if (!shift) throw new Error("SHIFT_NOT_AVAILABLE");
    if (shift.employeeId !== null || shift.status !== "PUBLISHED") {
      throw new Error("SHIFT_NOT_AVAILABLE");
    }

    const existing = await tx.shiftClaim.findFirst({
      where: { shiftId, employeeId: ctx.userId },
      select: { id: true },
    });
    if (existing) throw new Error("DUPLICATE_CLAIM");

    return tx.shiftClaim.create({
      data: {
        companyId: ctx.companyId,
        shiftId,
        employeeId: ctx.userId,
        status: "PENDING",
      },
      select: claimSelect,
    });
  });
}

export async function cancelClaim(
  ctx: TenantContext,
  claimId: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const existing = await tx.shiftClaim.findFirst({
      where: { id: claimId, companyId: ctx.companyId },
      select: { id: true, employeeId: true, status: true },
    });
    if (!existing) throw new Error("NOT_FOUND");

    const isManager = ctx.role === "MANAGER";
    const isOwnPending =
      existing.employeeId === ctx.userId && existing.status === "PENDING";
    if (!isManager && !isOwnPending) throw new Error("FORBIDDEN");

    await tx.shiftClaim.delete({ where: { id: claimId } });
  });
}

/**
 * Attribute an open shift to a single PENDING claim atomically:
 *  - set `shift.employeeId` to the claim's employee
 *  - flip the chosen claim to APPROVED
 *  - flip all peer PENDING claims of the same shift to REJECTED
 *  - reject if the chosen employee already has an overlapping shift
 *
 * Throws:
 *  - NOT_FOUND       — shift missing
 *  - NOT_OPEN        — shift is no longer open (already assigned)
 *  - CLAIM_NOT_FOUND — claim missing / non-PENDING / wrong shift
 *  - ASSIGNEE_OVERLAP — assignee already booked over that window
 */
export type AssignOpenShiftRecipient = {
  employeeId: string;
  email: string;
  name: string | null;
  status: "APPROVED" | "REJECTED";
};

export async function assignOpenShift(
  ctx: TenantContext,
  shiftId: string,
  chosenClaimId: string,
): Promise<{ recipients: AssignOpenShiftRecipient[] }> {
  if (ctx.role !== "MANAGER") throw new Error("FORBIDDEN");
  return db.$transaction(async (tx) => {
    const shift = await tx.shift.findFirst({
      where: { id: shiftId, companyId: ctx.companyId },
      select: {
        id: true,
        employeeId: true,
        startsAt: true,
        endsAt: true,
      },
    });
    if (!shift) throw new Error("NOT_FOUND");
    if (shift.employeeId !== null) throw new Error("NOT_OPEN");

    const claim = await tx.shiftClaim.findFirst({
      where: {
        id: chosenClaimId,
        shiftId,
        companyId: ctx.companyId,
        status: "PENDING",
      },
      select: { id: true, employeeId: true },
    });
    if (!claim) throw new Error("CLAIM_NOT_FOUND");

    const overlap = await tx.shift.findFirst({
      where: {
        id: { not: shiftId },
        employeeId: claim.employeeId,
        startsAt: { lt: shift.endsAt },
        endsAt: { gt: shift.startsAt },
      },
      select: { id: true },
    });
    if (overlap) throw new Error("ASSIGNEE_OVERLAP");

    const peers = await tx.shiftClaim.findMany({
      where: {
        shiftId,
        id: { not: chosenClaimId },
        status: "PENDING",
      },
      select: { employeeId: true },
    });

    const decidedAt = new Date();

    await tx.shift.update({
      where: { id: shiftId },
      data: { employeeId: claim.employeeId },
    });

    await tx.shiftClaim.updateMany({
      where: {
        shiftId,
        id: { not: chosenClaimId },
        status: "PENDING",
      },
      data: {
        status: "REJECTED",
        decidedAt,
        decidedByUserId: ctx.userId,
      },
    });

    await tx.shiftClaim.update({
      where: { id: chosenClaimId },
      data: {
        status: "APPROVED",
        decidedAt,
        decidedByUserId: ctx.userId,
      },
    });

    const affectedUserIds = [
      claim.employeeId,
      ...peers.map((p) => p.employeeId),
    ];
    const users = await tx.user.findMany({
      where: { id: { in: affectedUserIds } },
      select: { id: true, email: true, name: true },
    });
    const userById = new Map(users.map((u) => [u.id, u] as const));

    const shiftStartISO = toISODateLocal(shift.startsAt);
    const shiftEndISO = toISODateLocal(shift.endsAt);
    const weekStartISO = mondayISO(shift.startsAt);

    await createNotificationsInTx(tx, [
      {
        companyId: ctx.companyId,
        recipientUserId: claim.employeeId,
        type: "CLAIM_DECIDED",
        payload: {
          type: "CLAIM_DECIDED",
          status: "APPROVED",
          shiftStartISO,
          shiftEndISO,
          weekStartISO,
        },
      },
      ...peers.map((p) => ({
        companyId: ctx.companyId,
        recipientUserId: p.employeeId,
        type: "CLAIM_DECIDED" as const,
        payload: {
          type: "CLAIM_DECIDED" as const,
          status: "REJECTED" as const,
          shiftStartISO,
          shiftEndISO,
          weekStartISO,
        },
      })),
    ]);

    const recipients: AssignOpenShiftRecipient[] = [
      {
        employeeId: claim.employeeId,
        email: userById.get(claim.employeeId)?.email ?? "",
        name: userById.get(claim.employeeId)?.name ?? null,
        status: "APPROVED",
      },
      ...peers.map((p) => ({
        employeeId: p.employeeId,
        email: userById.get(p.employeeId)?.email ?? "",
        name: userById.get(p.employeeId)?.name ?? null,
        status: "REJECTED" as const,
      })),
    ];

    return { recipients };
  });
}

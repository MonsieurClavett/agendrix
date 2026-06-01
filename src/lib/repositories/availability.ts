import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";

/**
 * Tenant pattern (Constitution Principle I): every read AND write
 * filters on `companyId = ctx.companyId`. Server Actions never call
 * db.availability.* directly — they go through these functions.
 *
 * Dual-actor authorization (research.md Decision 2): mutations check
 * both tenant ownership AND that the actor is either the target
 * employee themselves OR a MANAGER of the same company.
 */

const availabilitySelect = {
  id: true,
  companyId: true,
  employeeId: true,
  dayOfWeek: true,
  startMinute: true,
  endMinute: true,
} as const;

export type AvailabilityRow = {
  id: string;
  companyId: string;
  employeeId: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

export type AvailabilityInput = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

/**
 * Returns the ranges of `targetEmployeeId`, ordered by dayOfWeek then
 * startMinute. Throws:
 *  - "EMPLOYEE_NOT_FOUND" if the target id is not in the actor's company
 *    (indistinguishable from a non-existent id — no cross-tenant leak).
 *  - "FORBIDDEN" if an EMPLOYEE actor asks for someone else's ranges.
 */
export async function listAvailabilitiesForEmployee(
  ctx: TenantContext,
  targetEmployeeId: string,
): Promise<AvailabilityRow[]> {
  if (targetEmployeeId !== ctx.userId && ctx.role !== "MANAGER") {
    throw new Error("FORBIDDEN");
  }
  const target = await db.user.findFirst({
    where: { id: targetEmployeeId, companyId: ctx.companyId },
    select: { id: true },
  });
  if (!target) throw new Error("EMPLOYEE_NOT_FOUND");

  return db.availability.findMany({
    where: { companyId: ctx.companyId, employeeId: targetEmployeeId },
    select: availabilitySelect,
    orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
  });
}

/**
 * MANAGER-only: returns every range of the company, ordered for stable
 * client-side grouping. Throws "FORBIDDEN" for non-MANAGER actors.
 */
export async function listAvailabilitiesForCompany(
  ctx: TenantContext,
): Promise<AvailabilityRow[]> {
  if (ctx.role !== "MANAGER") throw new Error("FORBIDDEN");
  return db.availability.findMany({
    where: { companyId: ctx.companyId },
    select: availabilitySelect,
    orderBy: [
      { employeeId: "asc" },
      { dayOfWeek: "asc" },
      { startMinute: "asc" },
    ],
  });
}

/**
 * Insert a range after verifying:
 *  - target employee belongs to ctx.companyId      → EMPLOYEE_NOT_FOUND
 *  - actor is the target OR a MANAGER              → FORBIDDEN
 *  - no overlapping range exists for the same
 *    employee on the same dayOfWeek                → OVERLAP
 *
 * All checks run inside the same transaction as the insert.
 */
export async function createAvailability(
  ctx: TenantContext,
  targetEmployeeId: string,
  data: AvailabilityInput,
): Promise<AvailabilityRow> {
  return db.$transaction(async (tx) => {
    const employee = await tx.user.findFirst({
      where: { id: targetEmployeeId, companyId: ctx.companyId },
      select: { id: true },
    });
    if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");

    if (targetEmployeeId !== ctx.userId && ctx.role !== "MANAGER") {
      throw new Error("FORBIDDEN");
    }

    const overlap = await tx.availability.findFirst({
      where: {
        companyId: ctx.companyId,
        employeeId: targetEmployeeId,
        dayOfWeek: data.dayOfWeek,
        startMinute: { lt: data.endMinute },
        endMinute: { gt: data.startMinute },
      },
      select: { id: true },
    });
    if (overlap) throw new Error("OVERLAP");

    return tx.availability.create({
      data: {
        companyId: ctx.companyId,
        employeeId: targetEmployeeId,
        dayOfWeek: data.dayOfWeek,
        startMinute: data.startMinute,
        endMinute: data.endMinute,
      },
      select: availabilitySelect,
    });
  });
}

/**
 * Update an existing range. Verifies:
 *  - the range belongs to ctx.companyId            → NOT_FOUND
 *  - actor is the range's employee OR a MANAGER    → FORBIDDEN
 *  - the new interval does not overlap any OTHER
 *    range of that employee on the new dayOfWeek   → OVERLAP
 */
export async function updateAvailability(
  ctx: TenantContext,
  availabilityId: string,
  data: AvailabilityInput,
): Promise<AvailabilityRow> {
  return db.$transaction(async (tx) => {
    const existing = await tx.availability.findFirst({
      where: { id: availabilityId, companyId: ctx.companyId },
      select: { id: true, employeeId: true },
    });
    if (!existing) throw new Error("NOT_FOUND");

    if (existing.employeeId !== ctx.userId && ctx.role !== "MANAGER") {
      throw new Error("FORBIDDEN");
    }

    const overlap = await tx.availability.findFirst({
      where: {
        id: { not: availabilityId },
        companyId: ctx.companyId,
        employeeId: existing.employeeId,
        dayOfWeek: data.dayOfWeek,
        startMinute: { lt: data.endMinute },
        endMinute: { gt: data.startMinute },
      },
      select: { id: true },
    });
    if (overlap) throw new Error("OVERLAP");

    return tx.availability.update({
      where: { id: availabilityId },
      data: {
        dayOfWeek: data.dayOfWeek,
        startMinute: data.startMinute,
        endMinute: data.endMinute,
      },
      select: availabilitySelect,
    });
  });
}

/** Hard delete, scoped by tenant + actor check. */
export async function deleteAvailability(
  ctx: TenantContext,
  availabilityId: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const existing = await tx.availability.findFirst({
      where: { id: availabilityId, companyId: ctx.companyId },
      select: { id: true, employeeId: true },
    });
    if (!existing) throw new Error("NOT_FOUND");

    if (existing.employeeId !== ctx.userId && ctx.role !== "MANAGER") {
      throw new Error("FORBIDDEN");
    }

    await tx.availability.delete({ where: { id: availabilityId } });
  });
}

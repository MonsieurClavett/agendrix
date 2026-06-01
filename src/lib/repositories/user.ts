import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma";
import type { TenantContext } from "@/lib/session";

/**
 * Tenant pattern (Constitution Principle I): every query is scoped by
 * ctx.companyId. Callers cannot fetch users belonging to another company
 * through this layer.
 */

export async function listUsersInCompany(ctx: TenantContext) {
  return db.user.findMany({
    where: { companyId: ctx.companyId, isActive: true },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Phase 24: lightweight list for command palette (cap 200). */
export async function listEmployeesForPalette(
  ctx: TenantContext,
): Promise<{ id: string; name: string | null; email: string }[]> {
  return db.user.findMany({
    where: { companyId: ctx.companyId, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    take: 200,
  });
}

/** Phase 1: team-management page — active AND deactivated, both included. */
export async function listAllUsersInCompany(ctx: TenantContext) {
  return db.user.findMany({
    where: { companyId: ctx.companyId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });
}

export async function getCurrentUser(ctx: TenantContext) {
  return db.user.findUniqueOrThrow({
    where: { id: ctx.userId },
    select: { id: true, email: true, name: true, role: true },
  });
}

/**
 * Update a user's name and role. Enforces:
 *  - tenant scope (id AND companyId match)
 *  - "≥ 1 active MANAGER per company" invariant when demoting a MANAGER
 *
 * Throws "NOT_FOUND" if the user is not in the manager's company.
 * Throws "LAST_MANAGER" if the update would leave the company without
 *   an active manager.
 */
export async function updateUserById(
  ctx: TenantContext,
  userId: string,
  data: { name: string; role: Role },
) {
  return db.$transaction(async (tx) => {
    const target = await tx.user.findFirst({
      where: { id: userId, companyId: ctx.companyId },
      select: { id: true, role: true, isActive: true },
    });
    if (!target) throw new Error("NOT_FOUND");

    const isDemotingActiveManager =
      target.isActive &&
      target.role === "MANAGER" &&
      data.role === "EMPLOYEE";

    if (isDemotingActiveManager) {
      const otherActiveManagers = await tx.user.count({
        where: {
          companyId: ctx.companyId,
          id: { not: userId },
          role: "MANAGER",
          isActive: true,
        },
      });
      if (otherActiveManagers === 0) throw new Error("LAST_MANAGER");
    }

    return tx.user.update({
      where: { id: userId },
      data: { name: data.name, role: data.role },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
  });
}

/**
 * Activate or deactivate a user. Enforces:
 *  - tenant scope
 *  - "≥ 1 active MANAGER per company" invariant when deactivating a MANAGER
 *
 * Throws "NOT_FOUND" / "LAST_MANAGER" with the same semantics as
 * `updateUserById`.
 */
export async function setUserActiveStatus(
  ctx: TenantContext,
  userId: string,
  isActive: boolean,
) {
  return db.$transaction(async (tx) => {
    const target = await tx.user.findFirst({
      where: { id: userId, companyId: ctx.companyId },
      select: { id: true, role: true, isActive: true },
    });
    if (!target) throw new Error("NOT_FOUND");

    if (!isActive && target.role === "MANAGER" && target.isActive) {
      const otherActiveManagers = await tx.user.count({
        where: {
          companyId: ctx.companyId,
          id: { not: userId },
          role: "MANAGER",
          isActive: true,
        },
      });
      if (otherActiveManagers === 0) throw new Error("LAST_MANAGER");
    }

    return tx.user.update({
      where: { id: userId },
      data: { isActive },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
  });
}

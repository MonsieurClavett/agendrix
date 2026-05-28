import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";

/**
 * Tenant pattern: every query is scoped by ctx.companyId. Callers cannot
 * fetch users belonging to another company through this layer.
 */
export async function listUsersInCompany(ctx: TenantContext) {
  return db.user.findMany({
    where: { companyId: ctx.companyId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getCurrentUser(ctx: TenantContext) {
  return db.user.findUniqueOrThrow({
    where: { id: ctx.userId },
    select: { id: true, email: true, name: true, role: true },
  });
}

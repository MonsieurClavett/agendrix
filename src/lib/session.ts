import { auth } from "@/auth";
import type { Role } from "@/generated/prisma";

export type TenantContext = {
  userId: string;
  companyId: string;
  role: Role;
};

/**
 * Returns the verified tenant context derived from the active session.
 * Every tenant-scoped read or write MUST flow through this helper and a
 * repository function — pages and Server Actions must never call Prisma
 * directly for tenant-scoped tables (Constitution Principle I).
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    role: session.user.role,
  };
}

export async function requireManagerContext(): Promise<TenantContext> {
  const ctx = await requireTenantContext();
  if (ctx.role !== "MANAGER") throw new Error("FORBIDDEN");
  return ctx;
}

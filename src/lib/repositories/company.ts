import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";

export async function getCurrentCompany(ctx: TenantContext) {
  return db.company.findUniqueOrThrow({
    where: { id: ctx.companyId },
    select: { id: true, name: true, createdAt: true },
  });
}

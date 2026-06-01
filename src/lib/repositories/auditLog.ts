import { Prisma } from "@/generated/prisma";

import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";

/**
 * Append-only audit log. The public surface intentionally exposes
 * only READ and APPEND — no update, no delete. Sensitive mutations
 * across the app call writeAuditEventInTx() inside their own
 * transaction so audit + business write succeed together.
 */

export type AuditLogRow = {
  id: string;
  actorUserId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: unknown;
  createdAt: Date;
};

type WriteInput = {
  companyId: string;
  actorUserId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: Record<string, unknown> | null;
};

export async function writeAuditEventInTx(
  tx: Prisma.TransactionClient,
  input: WriteInput,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      payload:
        input.payload === null || input.payload === undefined
          ? Prisma.JsonNull
          : (input.payload as Prisma.InputJsonValue),
    },
  });
}

/** Fire-and-best-effort write outside of any transaction. (helper marker) */
export async function writeAuditEvent(
  ctx: TenantContext,
  input: Omit<WriteInput, "companyId">,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        companyId: ctx.companyId,
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        payload:
          input.payload === null || input.payload === undefined
            ? Prisma.JsonNull
            : (input.payload as Prisma.InputJsonValue),
      },
    });
  } catch (e) {
    console.warn("[audit] write failed:", e);
  }
}

type ListInput = {
  limit?: number;
  action?: string;
  entityType?: string;
  beforeDate?: Date;
};

export async function listAuditLogsForCompany(
  ctx: TenantContext,
  input: ListInput = {},
): Promise<AuditLogRow[]> {
  const where: Prisma.AuditLogWhereInput = {
    companyId: ctx.companyId,
  };
  if (input.action) where.action = input.action;
  if (input.entityType) where.entityType = input.entityType;
  if (input.beforeDate) where.createdAt = { lt: input.beforeDate };
  return db.auditLog.findMany({
    where,
    select: {
      id: true,
      actorUserId: true,
      actorName: true,
      action: true,
      entityType: true,
      entityId: true,
      payload: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: input.limit ?? 100,
  });
}

export async function listDistinctActionsForCompany(
  ctx: TenantContext,
): Promise<string[]> {
  const rows = await db.auditLog.findMany({
    where: { companyId: ctx.companyId },
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  });
  return rows.map((r) => r.action);
}

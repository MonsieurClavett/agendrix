import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";
import { Prisma } from "@/generated/prisma";

/**
 * Tenant pattern (Constitution Principle I): every read AND write
 * filters on `companyId = ctx.companyId`. Server Actions never call
 * db.position.* directly — they go through these functions.
 */

const positionSelect = {
  id: true,
  name: true,
  color: true,
  createdAt: true,
} as const;

export type PositionRow = {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
};

export async function listPositionsForCompany(
  ctx: TenantContext,
): Promise<PositionRow[]> {
  return db.position.findMany({
    where: { companyId: ctx.companyId },
    select: positionSelect,
    orderBy: { name: "asc" },
  });
}

/**
 * Insert a new position. Case-insensitive uniqueness per company is
 * enforced application-side; the DB UNIQUE(companyId, name) is a
 * concurrent-insert guard.
 *
 * Throws "DUPLICATE" when a position with the same lowercase name
 * already exists in the company.
 */
export async function createPosition(
  ctx: TenantContext,
  data: { name: string; color: string },
) {
  return db.$transaction(async (tx) => {
    const trimmed = data.name.trim();
    const lower = trimmed.toLowerCase();

    const existing = await tx.position.findMany({
      where: { companyId: ctx.companyId },
      select: { name: true },
    });
    if (existing.some((p) => p.name.toLowerCase() === lower)) {
      throw new Error("DUPLICATE");
    }

    try {
      return await tx.position.create({
        data: {
          name: trimmed,
          color: data.color,
          companyId: ctx.companyId,
        },
        select: positionSelect,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new Error("DUPLICATE");
      }
      throw err;
    }
  });
}

/**
 * Update name + color. Same case-insensitive uniqueness rule applies
 * (excluding the position itself).
 *
 * Throws "NOT_FOUND" if the position is not in the manager's company,
 * "DUPLICATE" on name collision.
 */
export async function updatePosition(
  ctx: TenantContext,
  positionId: string,
  data: { name: string; color: string },
) {
  return db.$transaction(async (tx) => {
    const existing = await tx.position.findFirst({
      where: { id: positionId, companyId: ctx.companyId },
      select: { id: true },
    });
    if (!existing) throw new Error("NOT_FOUND");

    const trimmed = data.name.trim();
    const lower = trimmed.toLowerCase();

    const others = await tx.position.findMany({
      where: {
        companyId: ctx.companyId,
        id: { not: positionId },
      },
      select: { name: true },
    });
    if (others.some((p) => p.name.toLowerCase() === lower)) {
      throw new Error("DUPLICATE");
    }

    try {
      return await tx.position.update({
        where: { id: positionId },
        data: { name: trimmed, color: data.color },
        select: positionSelect,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new Error("DUPLICATE");
      }
      throw err;
    }
  });
}

/** Hard delete, scoped by tenant. FK SetNull frees the shifts. */
export async function deletePosition(ctx: TenantContext, positionId: string) {
  const result = await db.position.deleteMany({
    where: { id: positionId, companyId: ctx.companyId },
  });
  if (result.count === 0) throw new Error("NOT_FOUND");
}

/** Used by the positions page to show "N shifts" per row. */
export async function countShiftsByPosition(
  ctx: TenantContext,
): Promise<Map<string, number>> {
  const rows = await db.shift.groupBy({
    by: ["positionId"],
    where: { companyId: ctx.companyId, positionId: { not: null } },
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.positionId) map.set(row.positionId, row._count._all);
  }
  return map;
}

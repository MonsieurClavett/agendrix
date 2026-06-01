import { randomBytes } from "crypto";

import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";

export type PunchLocationRow = {
  id: string;
  name: string;
  token: string;
  isActive: boolean;
  createdAt: Date;
};

const select = {
  id: true,
  name: true,
  token: true,
  isActive: true,
  createdAt: true,
} as const;

function generateToken(): string {
  // 12 random bytes → base64url → strip non-alphanumeric → 16-char prefix.
  return randomBytes(16)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 16);
}

export async function listLocations(
  ctx: TenantContext,
): Promise<PunchLocationRow[]> {
  return db.punchLocation.findMany({
    where: { companyId: ctx.companyId },
    select,
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Global lookup by token — used by the public /punch/[token] page.
 * The returned row includes `companyId` so the caller can verify
 * the scanning user belongs to the same tenant.
 */
export async function getLocationByToken(
  token: string,
): Promise<
  | (PunchLocationRow & { companyId: string; companyName: string })
  | null
> {
  const row = await db.punchLocation.findUnique({
    where: { token },
    select: {
      ...select,
      companyId: true,
      company: { select: { name: true } },
    },
  });
  if (!row) return null;
  return { ...row, companyName: row.company.name };
}

export async function createLocation(
  ctx: TenantContext,
  input: { name: string },
): Promise<PunchLocationRow> {
  const trimmed = input.name.trim();
  if (!trimmed) throw new Error("NAME_REQUIRED");
  if (trimmed.length > 80) throw new Error("NAME_TOO_LONG");

  // Retry once on token collision (vanishingly small probability).
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await db.punchLocation.create({
        data: {
          companyId: ctx.companyId,
          name: trimmed,
          token: generateToken(),
        },
        select,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        const target = (e.meta?.target ?? []) as string[];
        if (target.includes("companyId") && target.includes("name")) {
          throw new Error("NAME_TAKEN");
        }
        // token collision → retry
        if (attempt === 0) continue;
        throw new Error("TOKEN_COLLISION");
      }
      throw e;
    }
  }
  throw new Error("TOKEN_COLLISION");
}

export async function updateLocation(
  ctx: TenantContext,
  id: string,
  input: { name?: string; isActive?: boolean },
): Promise<void> {
  const owned = await db.punchLocation.findFirst({
    where: { id, companyId: ctx.companyId },
    select: { id: true },
  });
  if (!owned) throw new Error("NOT_FOUND");

  const data: { name?: string; isActive?: boolean } = {};
  if (input.name !== undefined) {
    const t = input.name.trim();
    if (!t) throw new Error("NAME_REQUIRED");
    if (t.length > 80) throw new Error("NAME_TOO_LONG");
    data.name = t;
  }
  if (input.isActive !== undefined) data.isActive = input.isActive;

  try {
    await db.punchLocation.update({ where: { id }, data });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new Error("NAME_TAKEN");
    }
    throw e;
  }
}

export async function deleteLocation(
  ctx: TenantContext,
  id: string,
): Promise<void> {
  const owned = await db.punchLocation.findFirst({
    where: { id, companyId: ctx.companyId },
    select: { id: true },
  });
  if (!owned) throw new Error("NOT_FOUND");
  await db.punchLocation.delete({ where: { id } });
}

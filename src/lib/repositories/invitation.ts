import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import type { TenantContext } from "@/lib/session";
import type { Role, InvitationStatus } from "@/generated/prisma";

/**
 * Tenant pattern (Constitution Principle I): listing, resending, and
 * revoking all filter on `companyId = ctx.companyId`.
 *
 * Documented exception (research.md Decision 4 + plan.md): the
 * accept path (`findInvitationByTokenHash` + `acceptInvitation`) has
 * NO `TenantContext` — it derives the tenant from the invitation row
 * once the token is verified.
 */

const invitationSelect = {
  id: true,
  companyId: true,
  email: true,
  name: true,
  role: true,
  expiresAt: true,
  status: true,
  acceptedAt: true,
  invitedByUserId: true,
  invitedBy: { select: { id: true, name: true } },
  createdAt: true,
  // tokenHash is intentionally omitted — never leaks.
} as const;

export type InvitationRow = {
  id: string;
  companyId: string;
  email: string;
  name: string;
  role: Role;
  expiresAt: Date;
  status: InvitationStatus;
  acceptedAt: Date | null;
  invitedByUserId: string | null;
  invitedBy: { id: string; name: string | null } | null;
  createdAt: Date;
};

export type CreateInvitationInput = {
  email: string;
  name: string;
  role: Role;
};

export async function listInvitationsForCompany(
  ctx: TenantContext,
): Promise<InvitationRow[]> {
  if (ctx.role !== "MANAGER") throw new Error("FORBIDDEN");
  return db.invitation.findMany({
    where: { companyId: ctx.companyId },
    select: invitationSelect,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function createInvitation(
  ctx: TenantContext,
  data: CreateInvitationInput,
  tokenHash: string,
  expiresAt: Date,
): Promise<InvitationRow> {
  if (ctx.role !== "MANAGER") throw new Error("FORBIDDEN");
  const email = data.email.trim().toLowerCase();

  return db.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) throw new Error("EMAIL_TAKEN");

    const existingPending = await tx.invitation.findFirst({
      where: { companyId: ctx.companyId, email, status: "PENDING" },
      select: { id: true },
    });
    if (existingPending) throw new Error("ALREADY_PENDING");

    try {
      return await tx.invitation.create({
        data: {
          companyId: ctx.companyId,
          email,
          name: data.name.trim(),
          role: data.role,
          tokenHash,
          expiresAt,
          invitedByUserId: ctx.userId,
        },
        select: invitationSelect,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new Error("ALREADY_PENDING");
      }
      throw err;
    }
  });
}

/** Public — no tenant context. Returns null if not found. */
export async function findInvitationByTokenHash(
  tokenHash: string,
): Promise<InvitationRow | null> {
  return db.invitation.findUnique({
    where: { tokenHash },
    select: invitationSelect,
  });
}

/**
 * Public — no tenant context. Transactional. Returns the created user
 * id. Throws ALREADY_USED / EXPIRED / EMAIL_TAKEN otherwise.
 */
export async function acceptInvitation(
  tokenHash: string,
  data: { name: string; password: string },
): Promise<{ userId: string; email: string }> {
  return db.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        companyId: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
      },
    });
    if (!invitation) throw new Error("NOT_FOUND");
    if (invitation.status !== "PENDING") throw new Error("ALREADY_USED");
    if (invitation.expiresAt.getTime() < Date.now()) {
      throw new Error("EXPIRED");
    }

    const existingUser = await tx.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });
    if (existingUser) throw new Error("EMAIL_TAKEN");

    const passwordHash = await bcrypt.hash(data.password, 10);

    const created = await tx.user.create({
      data: {
        email: invitation.email,
        name: data.name.trim() || null,
        role: invitation.role,
        passwordHash,
        isActive: true,
        companyId: invitation.companyId,
      },
      select: { id: true, email: true },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    return { userId: created.id, email: created.email };
  });
}

/**
 * Rotate the token (security: the original link in the old email
 * becomes invalid) and refresh `expiresAt`. The caller is responsible
 * for re-sending the email with the new cleartext token.
 */
export async function resendInvitation(
  ctx: TenantContext,
  invitationId: string,
  data: { newTokenHash: string; newExpiresAt: Date },
): Promise<InvitationRow> {
  if (ctx.role !== "MANAGER") throw new Error("FORBIDDEN");

  return db.$transaction(async (tx) => {
    const existing = await tx.invitation.findFirst({
      where: { id: invitationId, companyId: ctx.companyId },
      select: { id: true, status: true },
    });
    if (!existing) throw new Error("NOT_FOUND");
    if (existing.status !== "PENDING") throw new Error("NOT_PENDING");

    return tx.invitation.update({
      where: { id: invitationId },
      data: {
        tokenHash: data.newTokenHash,
        expiresAt: data.newExpiresAt,
      },
      select: invitationSelect,
    });
  });
}

export async function revokeInvitation(
  ctx: TenantContext,
  invitationId: string,
): Promise<void> {
  if (ctx.role !== "MANAGER") throw new Error("FORBIDDEN");

  const result = await db.invitation.deleteMany({
    where: { id: invitationId, companyId: ctx.companyId },
  });
  if (result.count === 0) throw new Error("NOT_FOUND");
}

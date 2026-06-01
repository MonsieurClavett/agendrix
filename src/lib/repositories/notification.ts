import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";
import type { NotificationType, Prisma } from "@/generated/prisma";
import {
  NotificationPayloadSchema,
  type NotificationPayload,
} from "@/lib/notifications";

/**
 * Notifications repository.
 *
 * Read paths filter on `recipientUserId = ctx.userId` — the tenant
 * boundary is implicit because a User belongs to exactly one
 * company.
 *
 * The trigger-site insert helper `createNotificationsInTx` accepts a
 * transaction handle so the notifications and the originating
 * mutation commit (or rollback) together.
 */

export type NotificationRowRaw = {
  id: string;
  companyId: string;
  recipientUserId: string;
  type: NotificationType;
  payload: unknown;
  readAt: Date | null;
  createdAt: Date;
};

export type NotificationRow = NotificationRowRaw & {
  payload: NotificationPayload;
};

const notificationSelect = {
  id: true,
  companyId: true,
  recipientUserId: true,
  type: true,
  payload: true,
  readAt: true,
  createdAt: true,
} as const;

/**
 * Re-parses raw rows through the Zod schema. Rows with invalid
 * payloads are dropped (logged once) instead of crashing the whole
 * dropdown.
 */
function parseRows(rows: NotificationRowRaw[]): NotificationRow[] {
  const out: NotificationRow[] = [];
  for (const r of rows) {
    const parsed = NotificationPayloadSchema.safeParse(r.payload);
    if (!parsed.success) {
      console.warn(
        `[notification] dropping row ${r.id} — invalid payload`,
      );
      continue;
    }
    out.push({ ...r, payload: parsed.data });
  }
  return out;
}

export async function listLatestForUser(
  ctx: TenantContext,
  limit = 10,
): Promise<NotificationRow[]> {
  const rows = await db.notification.findMany({
    where: { recipientUserId: ctx.userId },
    select: notificationSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return parseRows(rows as NotificationRowRaw[]);
}

export async function countUnreadForUser(
  ctx: TenantContext,
): Promise<number> {
  return db.notification.count({
    where: { recipientUserId: ctx.userId, readAt: null },
  });
}

export async function markNotificationRead(
  ctx: TenantContext,
  notificationId: string,
): Promise<void> {
  await db.notification.updateMany({
    where: {
      id: notificationId,
      recipientUserId: ctx.userId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(
  ctx: TenantContext,
): Promise<{ count: number }> {
  const result = await db.notification.updateMany({
    where: { recipientUserId: ctx.userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { count: result.count };
}

/**
 * Insert N notifications inside the caller's existing
 * `db.$transaction(...)`. Payloads are pre-validated through Zod;
 * the function trusts the caller. Returns the inserted count
 * (`tx.notification.createMany` returns `{ count }`).
 */
export type CreateNotificationInput = {
  companyId: string;
  recipientUserId: string;
  type: NotificationType;
  payload: NotificationPayload;
};

export async function createNotificationsInTx(
  tx: Prisma.TransactionClient,
  rows: CreateNotificationInput[],
): Promise<void> {
  if (rows.length === 0) return;
  await tx.notification.createMany({
    data: rows.map((r) => ({
      companyId: r.companyId,
      recipientUserId: r.recipientUserId,
      type: r.type,
      payload: r.payload as unknown as Prisma.InputJsonValue,
    })),
  });
}

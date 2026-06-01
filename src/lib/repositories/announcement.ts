import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";
import { createNotificationsInTx } from "@/lib/repositories/notification";

/**
 * Tenant pattern (Constitution Principle I): every read AND write filters on
 * `companyId = ctx.companyId`. MANAGER-only operations are enforced by the
 * Server Actions calling `requireManagerContext`.
 */

const announcementSelect = {
  id: true,
  title: true,
  body: true,
  isPinned: true,
  createdAt: true,
  updatedAt: true,
  authorUserId: true,
  author: { select: { id: true, name: true, email: true } },
} as const;

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  authorUserId: string | null;
  author: { id: string; name: string | null; email: string } | null;
};

export async function listAnnouncementsForCompany(
  ctx: TenantContext,
): Promise<AnnouncementRow[]> {
  return db.announcement.findMany({
    where: { companyId: ctx.companyId },
    select: announcementSelect,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
}

export async function listAnnouncementsForDashboard(
  ctx: TenantContext,
): Promise<AnnouncementRow[]> {
  return db.announcement.findMany({
    where: { companyId: ctx.companyId },
    select: announcementSelect,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 3,
  });
}

type CreateInput = {
  title: string;
  body: string;
};

export type AnnouncementRecipient = {
  id: string;
  email: string;
  name: string | null;
};

export async function createAnnouncement(
  ctx: TenantContext,
  input: CreateInput,
): Promise<{
  id: string;
  title: string;
  authorName: string | null;
  recipients: AnnouncementRecipient[];
}> {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) throw new Error("TITLE_REQUIRED");
  if (title.length > 120) throw new Error("TITLE_TOO_LONG");
  if (body.length > 2000) throw new Error("BODY_TOO_LONG");

  return db.$transaction(async (tx) => {
    const announcement = await tx.announcement.create({
      data: {
        companyId: ctx.companyId,
        authorUserId: ctx.userId,
        title,
        body,
      },
      select: { id: true },
    });

    const recipients = await tx.user.findMany({
      where: {
        companyId: ctx.companyId,
        isActive: true,
        id: { not: ctx.userId },
      },
      select: { id: true, email: true, name: true },
    });

    const author = await tx.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true, email: true },
    });
    const authorName = author?.name ?? author?.email ?? null;

    await createNotificationsInTx(
      tx,
      recipients.map((r) => ({
        companyId: ctx.companyId,
        recipientUserId: r.id,
        type: "ANNOUNCEMENT_POSTED" as const,
        payload: {
          type: "ANNOUNCEMENT_POSTED" as const,
          announcementId: announcement.id,
          title,
          authorName,
        },
      })),
    );

    return {
      id: announcement.id,
      title,
      authorName,
      recipients,
    };
  });
}

type UpdateInput = {
  title?: string;
  body?: string;
};

export async function updateAnnouncement(
  ctx: TenantContext,
  id: string,
  input: UpdateInput,
): Promise<void> {
  const owned = await db.announcement.findFirst({
    where: { id, companyId: ctx.companyId },
    select: { id: true },
  });
  if (!owned) throw new Error("NOT_FOUND");

  const data: { title?: string; body?: string } = {};
  if (input.title !== undefined) {
    const t = input.title.trim();
    if (!t) throw new Error("TITLE_REQUIRED");
    if (t.length > 120) throw new Error("TITLE_TOO_LONG");
    data.title = t;
  }
  if (input.body !== undefined) {
    const b = input.body.trim();
    if (b.length > 2000) throw new Error("BODY_TOO_LONG");
    data.body = b;
  }

  await db.announcement.update({ where: { id }, data });
}

export async function togglePinAnnouncement(
  ctx: TenantContext,
  id: string,
): Promise<void> {
  const a = await db.announcement.findFirst({
    where: { id, companyId: ctx.companyId },
    select: { isPinned: true },
  });
  if (!a) throw new Error("NOT_FOUND");
  await db.announcement.update({
    where: { id },
    data: { isPinned: !a.isPinned },
  });
}

export async function deleteAnnouncement(
  ctx: TenantContext,
  id: string,
): Promise<void> {
  const owned = await db.announcement.findFirst({
    where: { id, companyId: ctx.companyId },
    select: { id: true },
  });
  if (!owned) throw new Error("NOT_FOUND");
  await db.announcement.delete({ where: { id } });
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { createAnnouncement } from "@/lib/repositories/announcement";
import { sendNotificationEmail } from "@/lib/email";
import { writeAuditEvent } from "@/lib/repositories/auditLog";

const inputSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(2000),
});

export type CreateAnnouncementState = {
  error?: string;
  success?: true;
};

export async function createAnnouncementAction(
  _prev: CreateAnnouncementState,
  formData: FormData,
): Promise<CreateAnnouncementState> {
  const ctx = await requireManagerContext();

  const parsed = inputSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) return { error: "Données invalides." };

  let result: Awaited<ReturnType<typeof createAnnouncement>>;
  try {
    result = await createAnnouncement(ctx, parsed.data);
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "TITLE_REQUIRED") return { error: "Le titre est requis." };
    if (m === "TITLE_TOO_LONG") return { error: "Titre trop long (max 120)." };
    if (m === "BODY_TOO_LONG") return { error: "Corps trop long (max 2000)." };
    throw err;
  }

  // Post-commit email fan-out — failures are swallowed so they never
  // break the user-facing action (Constitution Principle: notifications
  // are best-effort, not blocking).
  await Promise.allSettled(
    result.recipients.map((r) =>
      sendNotificationEmail({
        to: r.email,
        recipientName: r.name,
        payload: {
          type: "ANNOUNCEMENT_POSTED",
          announcementId: result.id,
          title: result.title,
          authorName: result.authorName,
        },
      }).catch((err) => {
        console.warn(
          `[announcement-email] failed for ${r.email}:`,
          err instanceof Error ? err.message : err,
        );
      }),
    ),
  );

  await writeAuditEvent(ctx, {
    actorUserId: ctx.userId,
    actorName: result.authorName ?? "Inconnu",
    action: "announcement.created",
    entityType: "Announcement",
    entityId: result.id,
    payload: {
      title: result.title,
      recipientCount: result.recipients.length,
    },
  });

  revalidatePath("/annonces");
  revalidatePath("/dashboard");
  return { success: true };
}

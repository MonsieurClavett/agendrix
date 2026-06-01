"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import {
  publishDraftsForWeek,
  type PublishRecipient,
} from "@/lib/repositories/shift";
import { sendNotificationEmail } from "@/lib/email";
import { parseWeekParam, toISODate } from "@/lib/week";

const inputSchema = z.object({
  weekStart: z.string().min(1),
});

export type PublishWeekState = {
  error?: string;
  success?: true;
  count?: number;
};

export async function publishWeekAction(
  _prev: PublishWeekState,
  formData: FormData,
): Promise<PublishWeekState> {
  const ctx = await requireManagerContext();

  const parsed = inputSchema.safeParse({
    weekStart: formData.get("weekStart"),
  });
  if (!parsed.success) {
    return { error: "Semaine invalide." };
  }

  const range = parseWeekParam(parsed.data.weekStart, new Date());
  const { count, recipients } = await publishDraftsForWeek(ctx, range);

  // Fire emails post-commit. Failures are swallowed so the action's
  // user-facing result doesn't depend on Resend availability.
  await emailRecipients(recipients, toISODate(range.start));

  revalidatePath("/schedules");
  return { success: true, count };
}

async function emailRecipients(
  recipients: PublishRecipient[],
  weekStartISO: string,
): Promise<void> {
  await Promise.all(
    recipients.map(async (r) => {
      try {
        await sendNotificationEmail({
          to: r.email,
          recipientName: r.name,
          payload: {
            type: "SHIFT_PUBLISHED",
            shiftCount: r.count,
            weekStartISO,
          },
        });
      } catch (err) {
        console.warn(
          `[publishWeek] email failed for ${r.email}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }),
  );
}

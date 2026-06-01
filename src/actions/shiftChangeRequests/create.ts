"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { createRequest } from "@/lib/repositories/shiftChangeRequest";
import { sendNotificationEmail } from "@/lib/email";

const inputSchema = z.object({
  shiftId: z.string().min(1),
  requestedStartsAt: z.string().min(1),
  requestedEndsAt: z.string().min(1),
  reason: z.string().max(280).optional(),
});

export type CreateShiftChangeState = {
  error?: string;
  success?: true;
};

export async function createShiftChangeRequestAction(
  _prev: CreateShiftChangeState,
  formData: FormData,
): Promise<CreateShiftChangeState> {
  const ctx = await requireTenantContext();
  const parsed = inputSchema.safeParse({
    shiftId: formData.get("shiftId"),
    requestedStartsAt: formData.get("requestedStartsAt"),
    requestedEndsAt: formData.get("requestedEndsAt"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return { error: "Données invalides." };

  const start = new Date(parsed.data.requestedStartsAt);
  const end = new Date(parsed.data.requestedEndsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Dates invalides." };
  }

  let result: Awaited<ReturnType<typeof createRequest>>;
  try {
    result = await createRequest(ctx, {
      shiftId: parsed.data.shiftId,
      requestedStartsAt: start,
      requestedEndsAt: end,
      reason: parsed.data.reason?.trim() || null,
    });
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "SHIFT_NOT_FOUND") return { error: "Shift introuvable." };
    if (m === "NOT_SHIFT_OWNER")
      return { error: "Ce shift ne vous appartient pas." };
    if (m === "NOT_PUBLISHED")
      return { error: "Seuls les shifts publiés peuvent être modifiés." };
    if (m === "DURATION_TOO_SHORT")
      return { error: "Durée minimum de 15 minutes." };
    if (m === "DURATION_TOO_LONG")
      return { error: "Durée maximum de 24 heures." };
    if (m === "END_BEFORE_START")
      return { error: "La fin doit être après le début." };
    if (m === "REQUEST_ALREADY_PENDING")
      return {
        error: "Une demande en cours existe déjà pour ce shift.",
      };
    throw err;
  }

  await Promise.allSettled(
    result.managers.map((m) =>
      sendNotificationEmail({
        to: m.email,
        recipientName: m.name,
        payload: {
          type: "SHIFT_CHANGE_REQUESTED",
          requestId: result.request.id,
          employeeName: result.requesterName,
          shiftStartISO: result.request.shift.startsAt.toISOString(),
          requestedStartISO: result.request.requestedStartsAt.toISOString(),
          requestedEndISO: result.request.requestedEndsAt.toISOString(),
        },
      }).catch((e) => {
        console.warn("[shift-change email] failed:", e);
      }),
    ),
  );

  revalidatePath("/modifications");
  revalidatePath("/schedules");
  return { success: true };
}

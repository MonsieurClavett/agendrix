"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { rejectRequest } from "@/lib/repositories/shiftChangeRequest";
import { sendNotificationEmail } from "@/lib/email";

const inputSchema = z.object({
  requestId: z.string().min(1),
  managerNote: z.string().max(280).optional(),
});

export type RejectShiftChangeState = {
  error?: string;
  success?: true;
};

export async function rejectShiftChangeRequestAction(
  _prev: RejectShiftChangeState,
  formData: FormData,
): Promise<RejectShiftChangeState> {
  const ctx = await requireManagerContext();
  const parsed = inputSchema.safeParse({
    requestId: formData.get("requestId"),
    managerNote: formData.get("managerNote") || undefined,
  });
  if (!parsed.success) return { error: "Données invalides." };

  let result: Awaited<ReturnType<typeof rejectRequest>>;
  try {
    result = await rejectRequest(
      ctx,
      parsed.data.requestId,
      parsed.data.managerNote ?? null,
    );
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "NOT_FOUND") return { error: "Demande introuvable." };
    if (m === "NOT_PENDING")
      return { error: "Cette demande n'est plus en attente." };
    throw err;
  }

  try {
    await sendNotificationEmail({
      to: result.employee.email,
      recipientName: result.employee.name,
      payload: {
        type: "SHIFT_CHANGE_DECIDED",
        requestId: result.request.id,
        status: "REJECTED",
        shiftStartISO: result.request.requestedStartsAt.toISOString(),
        managerNote: result.request.managerNote,
      },
    });
  } catch (e) {
    console.warn("[shift-change-reject email] failed:", e);
  }

  revalidatePath("/modifications");
  return { success: true };
}

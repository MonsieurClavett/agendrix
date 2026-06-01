"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { approveRequest } from "@/lib/repositories/shiftChangeRequest";
import { sendNotificationEmail } from "@/lib/email";

const inputSchema = z.object({ requestId: z.string().min(1) });

export type ApproveShiftChangeState = {
  error?: string;
  success?: true;
};

export async function approveShiftChangeRequestAction(
  _prev: ApproveShiftChangeState,
  formData: FormData,
): Promise<ApproveShiftChangeState> {
  const ctx = await requireManagerContext();
  const parsed = inputSchema.safeParse({
    requestId: formData.get("requestId"),
  });
  if (!parsed.success) return { error: "Données invalides." };

  let result: Awaited<ReturnType<typeof approveRequest>>;
  try {
    result = await approveRequest(ctx, parsed.data.requestId);
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "NOT_FOUND") return { error: "Demande introuvable." };
    if (m === "NOT_PENDING")
      return { error: "Cette demande n'est plus en attente." };
    if (m === "STATE_DRIFT")
      return {
        error:
          "Le shift a changé depuis la demande. Refusez et demandez à l'employé de soumettre à nouveau.",
      };
    if (m === "OVERLAP")
      return {
        error:
          "Les nouvelles heures chevauchent un autre shift de cet employé.",
      };
    throw err;
  }

  try {
    await sendNotificationEmail({
      to: result.employee.email,
      recipientName: result.employee.name,
      payload: {
        type: "SHIFT_CHANGE_DECIDED",
        requestId: result.request.id,
        status: "APPROVED",
        shiftStartISO: result.request.requestedStartsAt.toISOString(),
        managerNote: null,
      },
    });
  } catch (e) {
    console.warn("[shift-change-approve email] failed:", e);
  }

  revalidatePath("/modifications");
  revalidatePath("/schedules");
  return { success: true };
}

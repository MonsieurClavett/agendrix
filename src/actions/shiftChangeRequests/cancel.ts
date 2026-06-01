"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { cancelRequest } from "@/lib/repositories/shiftChangeRequest";

const inputSchema = z.object({ requestId: z.string().min(1) });

export type CancelShiftChangeState = {
  error?: string;
  success?: true;
};

export async function cancelShiftChangeRequestAction(
  _prev: CancelShiftChangeState,
  formData: FormData,
): Promise<CancelShiftChangeState> {
  const ctx = await requireTenantContext();
  const parsed = inputSchema.safeParse({
    requestId: formData.get("requestId"),
  });
  if (!parsed.success) return { error: "Données invalides." };

  try {
    await cancelRequest(ctx, parsed.data.requestId);
    revalidatePath("/modifications");
    revalidatePath("/schedules");
    return { success: true };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "NOT_FOUND") return { error: "Demande introuvable." };
    if (m === "NOT_OWNER") return { error: "Vous n'êtes pas le propriétaire." };
    if (m === "NOT_PENDING") return { error: "Demande non annulable." };
    throw err;
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { assignOpenShift } from "@/lib/repositories/shiftClaim";

const inputSchema = z.object({
  shiftId: z.string().min(1),
  claimId: z.string().min(1),
});

export type AssignOpenShiftState = {
  error?: string;
  success?: true;
};

export async function assignOpenShiftAction(
  _prev: AssignOpenShiftState,
  formData: FormData,
): Promise<AssignOpenShiftState> {
  const ctx = await requireManagerContext();
  const parsed = inputSchema.safeParse({
    shiftId: formData.get("shiftId"),
    claimId: formData.get("claimId"),
  });
  if (!parsed.success) return { error: "Identifiants invalides." };

  try {
    await assignOpenShift(ctx, parsed.data.shiftId, parsed.data.claimId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "NOT_FOUND") return { error: "Quart introuvable." };
    if (message === "NOT_OPEN") {
      return { error: "Ce quart n'est plus à combler." };
    }
    if (message === "CLAIM_NOT_FOUND") {
      return { error: "Cette demande n'est plus disponible." };
    }
    if (message === "ASSIGNEE_OVERLAP") {
      return {
        error: "Cet employé a déjà un shift qui chevauche cette plage.",
      };
    }
    throw err;
  }

  revalidatePath("/quarts-a-combler");
  revalidatePath("/schedules");
  return { success: true };
}

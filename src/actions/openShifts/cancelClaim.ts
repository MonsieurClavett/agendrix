"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { cancelClaim } from "@/lib/repositories/shiftClaim";

const inputSchema = z.object({ claimId: z.string().min(1) });

export type CancelClaimState = {
  error?: string;
  success?: true;
};

export async function cancelClaimAction(
  _prev: CancelClaimState,
  formData: FormData,
): Promise<CancelClaimState> {
  const ctx = await requireTenantContext();
  const parsed = inputSchema.safeParse({
    claimId: formData.get("claimId"),
  });
  if (!parsed.success) return { error: "Identifiant invalide." };

  try {
    await cancelClaim(ctx, parsed.data.claimId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "NOT_FOUND") return { error: "Demande introuvable." };
    if (message === "FORBIDDEN") {
      return {
        error: "Vous n'avez pas le droit de supprimer cette demande.",
      };
    }
    throw err;
  }

  revalidatePath("/quarts-a-combler");
  revalidatePath("/schedules");
  return { success: true };
}

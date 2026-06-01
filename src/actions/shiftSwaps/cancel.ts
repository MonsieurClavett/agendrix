"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { cancelSwap } from "@/lib/repositories/shiftSwap";

const inputSchema = z.object({ swapId: z.string().min(1) });

export type CancelSwapState = {
  error?: string;
  success?: true;
};

export async function cancelSwapAction(
  _prev: CancelSwapState,
  formData: FormData,
): Promise<CancelSwapState> {
  const ctx = await requireTenantContext();
  const parsed = inputSchema.safeParse({ swapId: formData.get("swapId") });
  if (!parsed.success) return { error: "Identifiant invalide." };

  try {
    await cancelSwap(ctx, parsed.data.swapId);
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "NOT_FOUND") return { error: "Échange introuvable." };
    if (m === "FORBIDDEN") {
      return { error: "Seul le proposeur peut annuler cet échange." };
    }
    if (m === "NOT_CANCELABLE") {
      return { error: "Cet échange ne peut plus être annulé." };
    }
    throw err;
  }

  revalidatePath("/echanges");
  revalidatePath("/schedules");
  return { success: true };
}

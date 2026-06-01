"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { createClaim } from "@/lib/repositories/shiftClaim";

const inputSchema = z.object({ shiftId: z.string().min(1) });

export type CreateClaimState = {
  error?: string;
  success?: true;
};

export async function createClaimAction(
  _prev: CreateClaimState,
  formData: FormData,
): Promise<CreateClaimState> {
  const ctx = await requireTenantContext();
  const parsed = inputSchema.safeParse({
    shiftId: formData.get("shiftId"),
  });
  if (!parsed.success) return { error: "Identifiant invalide." };

  try {
    await createClaim(ctx, parsed.data.shiftId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "SHIFT_NOT_AVAILABLE") {
      return { error: "Ce quart n'est plus disponible." };
    }
    if (message === "DUPLICATE_CLAIM") {
      return { error: "Vous avez déjà demandé ce quart." };
    }
    throw err;
  }

  revalidatePath("/quarts-a-combler");
  revalidatePath("/schedules");
  return { success: true };
}

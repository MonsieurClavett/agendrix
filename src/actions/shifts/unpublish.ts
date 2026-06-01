"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { unpublishShift } from "@/lib/repositories/shift";

const inputSchema = z.object({
  shiftId: z.string().min(1),
});

export type UnpublishShiftState = {
  error?: string;
  success?: true;
};

export async function unpublishShiftAction(
  _prev: UnpublishShiftState,
  formData: FormData,
): Promise<UnpublishShiftState> {
  const ctx = await requireManagerContext();

  const parsed = inputSchema.safeParse({
    shiftId: formData.get("shiftId"),
  });
  if (!parsed.success) {
    return { error: "Identifiant invalide." };
  }

  try {
    await unpublishShift(ctx, parsed.data.shiftId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "NOT_FOUND") {
      return { error: "Shift introuvable ou déjà en brouillon." };
    }
    throw err;
  }

  revalidatePath("/schedules");
  return { success: true };
}

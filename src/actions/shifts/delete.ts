"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { deleteShift } from "@/lib/repositories/shift";

const deleteSchema = z.object({
  shiftId: z.string().min(1),
});

export type DeleteState = {
  error?: string;
  success?: true;
};

export async function deleteShiftAction(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const ctx = await requireManagerContext();

  const parsed = deleteSchema.safeParse({
    shiftId: formData.get("shiftId"),
  });

  if (!parsed.success) return { error: "Requête invalide." };

  try {
    await deleteShift(ctx, parsed.data.shiftId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "NOT_FOUND") return { error: "Shift introuvable." };
    throw err;
  }

  revalidatePath("/schedules");
  return { success: true };
}

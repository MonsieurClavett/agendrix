"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { deletePosition } from "@/lib/repositories/position";

const deleteSchema = z.object({
  positionId: z.string().min(1),
});

export type DeletePositionState = {
  error?: string;
  success?: true;
};

export async function deletePositionAction(
  _prev: DeletePositionState,
  formData: FormData,
): Promise<DeletePositionState> {
  const ctx = await requireManagerContext();

  const parsed = deleteSchema.safeParse({
    positionId: formData.get("positionId"),
  });

  if (!parsed.success) return { error: "Requête invalide." };

  try {
    await deletePosition(ctx, parsed.data.positionId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "NOT_FOUND") return { error: "Position introuvable." };
    throw err;
  }

  revalidatePath("/positions");
  revalidatePath("/schedules");
  return { success: true };
}

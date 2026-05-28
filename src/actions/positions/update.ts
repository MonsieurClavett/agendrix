"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { updatePosition } from "@/lib/repositories/position";
import { POSITION_COLOR_KEYS } from "@/lib/positions";

const updateSchema = z.object({
  positionId: z.string().min(1),
  name: z.string().trim().min(1, "Nom requis").max(40, "Nom trop long (40 max)"),
  color: z.enum(POSITION_COLOR_KEYS),
});

export type UpdatePositionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: true;
};

export async function updatePositionAction(
  _prev: UpdatePositionState,
  formData: FormData,
): Promise<UpdatePositionState> {
  const ctx = await requireManagerContext();

  const parsed = updateSchema.safeParse({
    positionId: formData.get("positionId"),
    name: formData.get("name"),
    color: formData.get("color"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { positionId, name, color } = parsed.data;

  try {
    await updatePosition(ctx, positionId, { name, color });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "NOT_FOUND") return { error: "Position introuvable." };
    if (message === "DUPLICATE") {
      return { error: "Une position avec ce nom existe déjà." };
    }
    throw err;
  }

  revalidatePath("/positions");
  revalidatePath("/schedules");
  return { success: true };
}

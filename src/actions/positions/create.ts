"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { createPosition } from "@/lib/repositories/position";
import { POSITION_COLOR_KEYS } from "@/lib/positions";

const createSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(40, "Nom trop long (40 max)"),
  color: z.enum(POSITION_COLOR_KEYS),
});

export type CreatePositionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: true;
};

export async function createPositionAction(
  _prev: CreatePositionState,
  formData: FormData,
): Promise<CreatePositionState> {
  const ctx = await requireManagerContext();

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await createPosition(ctx, parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "DUPLICATE") {
      return { error: "Une position avec ce nom existe déjà." };
    }
    throw err;
  }

  revalidatePath("/positions");
  revalidatePath("/schedules");
  return { success: true };
}

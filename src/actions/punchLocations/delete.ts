"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { deleteLocation } from "@/lib/repositories/punchLocation";

const inputSchema = z.object({ id: z.string().min(1) });

export type DeletePunchLocationState = {
  error?: string;
  success?: true;
};

export async function deletePunchLocationAction(
  _prev: DeletePunchLocationState,
  formData: FormData,
): Promise<DeletePunchLocationState> {
  const ctx = await requireManagerContext();
  const parsed = inputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { error: "Données invalides." };
  try {
    await deleteLocation(ctx, parsed.data.id);
    revalidatePath("/punch-locations");
    return { success: true };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "NOT_FOUND") return { error: "Poste introuvable." };
    throw err;
  }
}

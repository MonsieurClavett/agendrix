"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { updateLocation } from "@/lib/repositories/punchLocation";

const inputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80).optional(),
  isActive: z.enum(["true", "false"]).optional(),
});

export type UpdatePunchLocationState = {
  error?: string;
  success?: true;
};

export async function updatePunchLocationAction(
  _prev: UpdatePunchLocationState,
  formData: FormData,
): Promise<UpdatePunchLocationState> {
  const ctx = await requireManagerContext();
  const parsed = inputSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name") || undefined,
    isActive: formData.get("isActive") || undefined,
  });
  if (!parsed.success) return { error: "Données invalides." };
  try {
    await updateLocation(ctx, parsed.data.id, {
      name: parsed.data.name,
      isActive:
        parsed.data.isActive === undefined
          ? undefined
          : parsed.data.isActive === "true",
    });
    revalidatePath("/punch-locations");
    return { success: true };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "NOT_FOUND") return { error: "Poste introuvable." };
    if (m === "NAME_REQUIRED") return { error: "Le nom est requis." };
    if (m === "NAME_TOO_LONG") return { error: "Nom trop long (max 80)." };
    if (m === "NAME_TAKEN") {
      return { error: "Un poste avec ce nom existe déjà." };
    }
    throw err;
  }
}

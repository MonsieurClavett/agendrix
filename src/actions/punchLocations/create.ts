"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { createLocation } from "@/lib/repositories/punchLocation";

const inputSchema = z.object({ name: z.string().min(1).max(80) });

export type CreatePunchLocationState = {
  error?: string;
  success?: true;
};

export async function createPunchLocationAction(
  _prev: CreatePunchLocationState,
  formData: FormData,
): Promise<CreatePunchLocationState> {
  const ctx = await requireManagerContext();
  const parsed = inputSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: "Données invalides." };
  try {
    await createLocation(ctx, parsed.data);
    revalidatePath("/punch-locations");
    return { success: true };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "NAME_REQUIRED") return { error: "Le nom est requis." };
    if (m === "NAME_TOO_LONG") return { error: "Nom trop long (max 80)." };
    if (m === "NAME_TAKEN") {
      return { error: "Un poste avec ce nom existe déjà." };
    }
    if (m === "TOKEN_COLLISION") {
      return { error: "Erreur de génération du token. Réessayez." };
    }
    throw err;
  }
}

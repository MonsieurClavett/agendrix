"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { setUserActiveStatus } from "@/lib/repositories/user";

const setActiveSchema = z.object({
  userId: z.string().min(1),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export type SetActiveState = {
  error?: string;
  success?: true;
};

export async function setUserActiveAction(
  _prev: SetActiveState,
  formData: FormData,
): Promise<SetActiveState> {
  const ctx = await requireManagerContext();

  const parsed = setActiveSchema.safeParse({
    userId: formData.get("userId"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    return { error: "Requête invalide." };
  }

  const { userId, isActive } = parsed.data;

  if (!isActive && userId === ctx.userId) {
    return { error: "Vous ne pouvez pas désactiver votre propre compte." };
  }

  try {
    await setUserActiveStatus(ctx, userId, isActive);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "LAST_MANAGER") {
      return {
        error:
          "Une entreprise doit toujours avoir au moins un gestionnaire actif.",
      };
    }
    if (message === "NOT_FOUND") return { error: "Utilisateur introuvable." };
    throw err;
  }

  revalidatePath("/team");
  return { success: true };
}

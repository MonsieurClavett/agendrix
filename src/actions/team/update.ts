"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { updateUserById } from "@/lib/repositories/user";

const updateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1, "Nom requis"),
  role: z.enum(["MANAGER", "EMPLOYEE"]),
});

export type UpdateState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: true;
};

export async function updateEmployeeAction(
  _prev: UpdateState,
  formData: FormData,
): Promise<UpdateState> {
  const ctx = await requireManagerContext();

  const parsed = updateSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { userId, name, role } = parsed.data;

  try {
    await updateUserById(ctx, userId, { name, role });
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

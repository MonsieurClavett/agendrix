"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { deleteTimeOff } from "@/lib/repositories/timeOff";

const inputSchema = z.object({
  requestId: z.string().min(1),
});

export type DeleteTimeOffState = {
  error?: string;
  success?: true;
};

export async function deleteTimeOffAction(
  _prev: DeleteTimeOffState,
  formData: FormData,
): Promise<DeleteTimeOffState> {
  const ctx = await requireTenantContext();

  const parsed = inputSchema.safeParse({
    requestId: formData.get("requestId"),
  });
  if (!parsed.success) {
    return { error: "Identifiant invalide." };
  }

  try {
    await deleteTimeOff(ctx, parsed.data.requestId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "NOT_FOUND") {
      return { error: "Demande introuvable." };
    }
    if (message === "FORBIDDEN") {
      return {
        error: "Vous n'avez pas le droit de supprimer cette demande.",
      };
    }
    throw err;
  }

  revalidatePath("/conges");
  revalidatePath("/schedules");
  return { success: true };
}

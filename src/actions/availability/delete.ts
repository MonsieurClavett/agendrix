"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { deleteAvailability } from "@/lib/repositories/availability";

const inputSchema = z.object({
  availabilityId: z.string().min(1),
});

export type DeleteAvailabilityState = {
  error?: string;
  success?: true;
};

export async function deleteAvailabilityAction(
  _prev: DeleteAvailabilityState,
  formData: FormData,
): Promise<DeleteAvailabilityState> {
  const ctx = await requireTenantContext();

  const parsed = inputSchema.safeParse({
    availabilityId: formData.get("availabilityId"),
  });

  if (!parsed.success) {
    return { error: "Identifiant invalide." };
  }

  try {
    await deleteAvailability(ctx, parsed.data.availabilityId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "NOT_FOUND") {
      return { error: "Plage introuvable." };
    }
    if (message === "FORBIDDEN") {
      return {
        error: "Vous n'avez pas le droit de supprimer cette plage.",
      };
    }
    throw err;
  }

  revalidatePath("/disponibilites");
  revalidatePath("/team");
  revalidatePath("/schedules");
  return { success: true };
}

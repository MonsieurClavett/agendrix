"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { updateAvailability } from "@/lib/repositories/availability";
import { parseHHMMToMinutes } from "@/lib/availability";

const inputSchema = z.object({
  availabilityId: z.string().min(1),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
});

export type UpdateAvailabilityState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: true;
};

export async function updateAvailabilityAction(
  _prev: UpdateAvailabilityState,
  formData: FormData,
): Promise<UpdateAvailabilityState> {
  const ctx = await requireTenantContext();

  const parsed = inputSchema.safeParse({
    availabilityId: formData.get("availabilityId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const startMinute = parseHHMMToMinutes(parsed.data.startTime);
  const endMinute = parseHHMMToMinutes(parsed.data.endTime);
  if (
    startMinute === null ||
    endMinute === null ||
    endMinute <= startMinute
  ) {
    return {
      error:
        "Veuillez vérifier les heures (format HH:MM, fin > début, jusqu'à 24:00).",
    };
  }

  try {
    await updateAvailability(ctx, parsed.data.availabilityId, {
      dayOfWeek: parsed.data.dayOfWeek,
      startMinute,
      endMinute,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "NOT_FOUND") {
      return { error: "Plage introuvable." };
    }
    if (message === "OVERLAP") {
      return {
        error: "Cette plage chevauche une plage existante de ce jour.",
      };
    }
    if (message === "FORBIDDEN") {
      return {
        error: "Vous n'avez pas le droit de modifier cette plage.",
      };
    }
    throw err;
  }

  revalidatePath("/disponibilites");
  revalidatePath("/team");
  revalidatePath("/schedules");
  return { success: true };
}

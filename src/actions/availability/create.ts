"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { createAvailability } from "@/lib/repositories/availability";
import { parseHHMMToMinutes } from "@/lib/availability";

const inputSchema = z.object({
  targetEmployeeId: z.string().min(1, "Employé requis"),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().min(1, "Heure de début requise"),
  endTime: z.string().min(1, "Heure de fin requise"),
});

export type CreateAvailabilityState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: true;
};

export async function createAvailabilityAction(
  _prev: CreateAvailabilityState,
  formData: FormData,
): Promise<CreateAvailabilityState> {
  const ctx = await requireTenantContext();

  const parsed = inputSchema.safeParse({
    targetEmployeeId: formData.get("targetEmployeeId"),
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
    await createAvailability(ctx, parsed.data.targetEmployeeId, {
      dayOfWeek: parsed.data.dayOfWeek,
      startMinute,
      endMinute,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "OVERLAP") {
      return {
        error: "Cette plage chevauche une plage existante de ce jour.",
      };
    }
    if (message === "EMPLOYEE_NOT_FOUND") {
      return { error: "Employé introuvable." };
    }
    if (message === "FORBIDDEN") {
      return {
        error: "Vous n'avez pas le droit de modifier ces disponibilités.",
      };
    }
    throw err;
  }

  revalidatePath("/disponibilites");
  revalidatePath("/team");
  revalidatePath("/schedules");
  return { success: true };
}

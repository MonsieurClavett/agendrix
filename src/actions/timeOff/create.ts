"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { createTimeOff } from "@/lib/repositories/timeOff";
import { parseISODate } from "@/lib/timeOff";

const inputSchema = z.object({
  targetEmployeeId: z.string().min(1, "Employé requis"),
  startDate: z.string().min(1, "Date de début requise"),
  endDate: z.string().min(1, "Date de fin requise"),
  type: z.enum(["PAID", "UNPAID", "SICK"]),
  reason: z.string().max(280, "280 caractères max").optional(),
});

export type CreateTimeOffState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: true;
};

export async function createTimeOffAction(
  _prev: CreateTimeOffState,
  formData: FormData,
): Promise<CreateTimeOffState> {
  const ctx = await requireTenantContext();

  const rawReason = formData.get("reason");
  const parsed = inputSchema.safeParse({
    targetEmployeeId: formData.get("targetEmployeeId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    type: formData.get("type"),
    reason: typeof rawReason === "string" && rawReason.length > 0
      ? rawReason
      : undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const startDate = parseISODate(parsed.data.startDate);
  const endDate = parseISODate(parsed.data.endDate);
  if (!startDate || !endDate || endDate.getTime() < startDate.getTime()) {
    return {
      error: "Veuillez vérifier les dates (format YYYY-MM-DD, fin ≥ début).",
    };
  }

  try {
    await createTimeOff(ctx, parsed.data.targetEmployeeId, {
      startDate,
      endDate,
      type: parsed.data.type,
      reason: parsed.data.reason?.trim() || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "OVERLAP") {
      return {
        error:
          "Cette demande chevauche une autre demande en attente ou approuvée.",
      };
    }
    if (message === "EMPLOYEE_NOT_FOUND") {
      return { error: "Employé introuvable." };
    }
    if (message === "FORBIDDEN") {
      return { error: "Vous n'avez pas le droit de créer cette demande." };
    }
    if (message === "INVALID_INPUT") {
      return { error: "Veuillez vérifier les dates et le type." };
    }
    throw err;
  }

  revalidatePath("/conges");
  revalidatePath("/schedules");
  return { success: true };
}

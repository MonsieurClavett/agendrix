"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { upsertOwnPreferences } from "@/lib/repositories/employeePreference";

const inputSchema = z.object({
  minHoursPerWeek: z.string().optional(),
  maxHoursPerWeek: z.string().optional(),
  preferredDays: z.array(z.string()).optional(),
  notes: z.string().max(500).optional(),
});

export type SavePreferencesState = {
  error?: string;
  success?: true;
};

function parseHours(raw: string | undefined): number | null {
  if (!raw || raw.trim() === "") return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  return Math.round(n);
}

export async function savePreferencesAction(
  _prev: SavePreferencesState,
  formData: FormData,
): Promise<SavePreferencesState> {
  const ctx = await requireTenantContext();

  const parsed = inputSchema.safeParse({
    minHoursPerWeek: formData.get("minHoursPerWeek") ?? undefined,
    maxHoursPerWeek: formData.get("maxHoursPerWeek") ?? undefined,
    preferredDays: formData.getAll("preferredDays").map(String),
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) return { error: "Données invalides." };

  const days = (parsed.data.preferredDays ?? [])
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);

  try {
    await upsertOwnPreferences(ctx, {
      minHoursPerWeek: parseHours(parsed.data.minHoursPerWeek),
      maxHoursPerWeek: parseHours(parsed.data.maxHoursPerWeek),
      preferredDays: days,
      notes: parsed.data.notes?.trim() || null,
    });
    revalidatePath("/preferences");
    revalidatePath("/team");
    return { success: true };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "MIN_GREATER_THAN_MAX") {
      return { error: "Le minimum doit être inférieur ou égal au maximum." };
    }
    if (m === "MIN_OUT_OF_RANGE" || m === "MAX_OUT_OF_RANGE") {
      return { error: "Les heures doivent être entre 0 et 168." };
    }
    if (m === "NOTES_TOO_LONG") {
      return { error: "Note trop longue (max 500 caractères)." };
    }
    throw err;
  }
}

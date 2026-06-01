"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { createTemplateFromWeek } from "@/lib/repositories/scheduleTemplate";

const inputSchema = z.object({
  name: z.string().min(1).max(80),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type SaveTemplateState = {
  error?: string;
  success?: true;
  templateId?: string;
};

export async function saveAsTemplateAction(
  _prev: SaveTemplateState,
  formData: FormData,
): Promise<SaveTemplateState> {
  const ctx = await requireManagerContext();

  const parsed = inputSchema.safeParse({
    name: formData.get("name"),
    weekStart: formData.get("weekStart"),
  });
  if (!parsed.success) return { error: "Données invalides." };

  const weekStart = new Date(`${parsed.data.weekStart}T00:00:00`);
  if (Number.isNaN(weekStart.getTime())) {
    return { error: "Semaine invalide." };
  }

  try {
    const r = await createTemplateFromWeek(ctx, {
      name: parsed.data.name,
      weekStart,
    });
    revalidatePath("/templates");
    return { success: true, templateId: r.id };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "EMPTY_WEEK") {
      return { error: "Cette semaine ne contient aucun shift à sauvegarder." };
    }
    if (m === "NAME_TAKEN") {
      return { error: "Un modèle avec ce nom existe déjà." };
    }
    if (m === "NAME_REQUIRED") return { error: "Le nom est requis." };
    if (m === "NAME_TOO_LONG") {
      return { error: "Le nom est trop long (max 80 caractères)." };
    }
    throw err;
  }
}

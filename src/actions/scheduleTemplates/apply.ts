"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { applyTemplate } from "@/lib/repositories/scheduleTemplate";

const inputSchema = z.object({
  templateId: z.string().min(1),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type ApplyTemplateState = {
  error?: string;
  success?: true;
  createdCount?: number;
};

export async function applyTemplateAction(
  _prev: ApplyTemplateState,
  formData: FormData,
): Promise<ApplyTemplateState> {
  const ctx = await requireManagerContext();

  const parsed = inputSchema.safeParse({
    templateId: formData.get("templateId"),
    weekStart: formData.get("weekStart"),
  });
  if (!parsed.success) return { error: "Données invalides." };

  const weekStart = new Date(`${parsed.data.weekStart}T00:00:00`);
  if (Number.isNaN(weekStart.getTime())) {
    return { error: "Semaine invalide." };
  }

  try {
    const r = await applyTemplate(ctx, {
      templateId: parsed.data.templateId,
      weekStart,
    });
    revalidatePath("/schedules");
    return { success: true, createdCount: r.createdCount };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "TEMPLATE_NOT_FOUND") return { error: "Modèle introuvable." };
    throw err;
  }
}

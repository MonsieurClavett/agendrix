"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { deleteTemplate } from "@/lib/repositories/scheduleTemplate";

const inputSchema = z.object({
  templateId: z.string().min(1),
});

export type DeleteTemplateState = {
  error?: string;
  success?: true;
};

export async function deleteTemplateAction(
  _prev: DeleteTemplateState,
  formData: FormData,
): Promise<DeleteTemplateState> {
  const ctx = await requireManagerContext();

  const parsed = inputSchema.safeParse({
    templateId: formData.get("templateId"),
  });
  if (!parsed.success) return { error: "Données invalides." };

  try {
    await deleteTemplate(ctx, parsed.data.templateId);
    revalidatePath("/templates");
    return { success: true };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "TEMPLATE_NOT_FOUND") return { error: "Modèle introuvable." };
    throw err;
  }
}

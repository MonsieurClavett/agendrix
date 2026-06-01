"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { renameTemplate } from "@/lib/repositories/scheduleTemplate";

const inputSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().min(1).max(80),
});

export type RenameTemplateState = {
  error?: string;
  success?: true;
};

export async function renameTemplateAction(
  _prev: RenameTemplateState,
  formData: FormData,
): Promise<RenameTemplateState> {
  const ctx = await requireManagerContext();

  const parsed = inputSchema.safeParse({
    templateId: formData.get("templateId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: "Données invalides." };

  try {
    await renameTemplate(ctx, parsed.data.templateId, parsed.data.name);
    revalidatePath("/templates");
    return { success: true };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "TEMPLATE_NOT_FOUND") return { error: "Modèle introuvable." };
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

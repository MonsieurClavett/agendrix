"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { updateAnnouncement } from "@/lib/repositories/announcement";

const inputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  body: z.string().max(2000),
});

export type UpdateAnnouncementState = {
  error?: string;
  success?: true;
};

export async function updateAnnouncementAction(
  _prev: UpdateAnnouncementState,
  formData: FormData,
): Promise<UpdateAnnouncementState> {
  const ctx = await requireManagerContext();

  const parsed = inputSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) return { error: "Données invalides." };

  try {
    await updateAnnouncement(ctx, parsed.data.id, {
      title: parsed.data.title,
      body: parsed.data.body,
    });
    revalidatePath("/annonces");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "NOT_FOUND") return { error: "Annonce introuvable." };
    if (m === "TITLE_REQUIRED") return { error: "Le titre est requis." };
    if (m === "TITLE_TOO_LONG") return { error: "Titre trop long (max 120)." };
    if (m === "BODY_TOO_LONG") return { error: "Corps trop long (max 2000)." };
    throw err;
  }
}

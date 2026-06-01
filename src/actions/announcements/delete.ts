"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { deleteAnnouncement } from "@/lib/repositories/announcement";

const inputSchema = z.object({ id: z.string().min(1) });

export type DeleteAnnouncementState = {
  error?: string;
  success?: true;
};

export async function deleteAnnouncementAction(
  _prev: DeleteAnnouncementState,
  formData: FormData,
): Promise<DeleteAnnouncementState> {
  const ctx = await requireManagerContext();

  const parsed = inputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { error: "Données invalides." };

  try {
    await deleteAnnouncement(ctx, parsed.data.id);
    revalidatePath("/annonces");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "NOT_FOUND") return { error: "Annonce introuvable." };
    throw err;
  }
}

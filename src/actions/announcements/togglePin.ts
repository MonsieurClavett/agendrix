"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { togglePinAnnouncement } from "@/lib/repositories/announcement";

const inputSchema = z.object({ id: z.string().min(1) });

export type TogglePinState = {
  error?: string;
  success?: true;
};

export async function togglePinAnnouncementAction(
  _prev: TogglePinState,
  formData: FormData,
): Promise<TogglePinState> {
  const ctx = await requireManagerContext();

  const parsed = inputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { error: "Données invalides." };

  try {
    await togglePinAnnouncement(ctx, parsed.data.id);
    revalidatePath("/annonces");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "NOT_FOUND") return { error: "Annonce introuvable." };
    throw err;
  }
}

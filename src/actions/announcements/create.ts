"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { createAnnouncement } from "@/lib/repositories/announcement";

const inputSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(2000),
});

export type CreateAnnouncementState = {
  error?: string;
  success?: true;
};

export async function createAnnouncementAction(
  _prev: CreateAnnouncementState,
  formData: FormData,
): Promise<CreateAnnouncementState> {
  const ctx = await requireManagerContext();

  const parsed = inputSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) return { error: "Données invalides." };

  try {
    await createAnnouncement(ctx, parsed.data);
    revalidatePath("/annonces");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "TITLE_REQUIRED") return { error: "Le titre est requis." };
    if (m === "TITLE_TOO_LONG") return { error: "Titre trop long (max 120)." };
    if (m === "BODY_TOO_LONG") return { error: "Corps trop long (max 2000)." };
    throw err;
  }
}

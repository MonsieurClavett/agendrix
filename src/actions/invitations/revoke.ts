"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { revokeInvitation } from "@/lib/repositories/invitation";

const inputSchema = z.object({ invitationId: z.string().min(1) });

export type RevokeInvitationState = {
  error?: string;
  success?: true;
};

export async function revokeInvitationAction(
  _prev: RevokeInvitationState,
  formData: FormData,
): Promise<RevokeInvitationState> {
  const ctx = await requireManagerContext();
  const parsed = inputSchema.safeParse({
    invitationId: formData.get("invitationId"),
  });
  if (!parsed.success) return { error: "Identifiant invalide." };

  try {
    await revokeInvitation(ctx, parsed.data.invitationId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "NOT_FOUND") return { error: "Invitation introuvable." };
    throw err;
  }

  revalidatePath("/team");
  return { success: true };
}

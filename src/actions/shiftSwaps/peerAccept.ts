"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { peerDecide } from "@/lib/repositories/shiftSwap";
import { sendNotificationEmail } from "@/lib/email";

const inputSchema = z.object({ swapId: z.string().min(1) });

export type PeerAcceptState = {
  error?: string;
  success?: true;
};

export async function peerAcceptAction(
  _prev: PeerAcceptState,
  formData: FormData,
): Promise<PeerAcceptState> {
  const ctx = await requireTenantContext();
  const parsed = inputSchema.safeParse({ swapId: formData.get("swapId") });
  if (!parsed.success) return { error: "Identifiant invalide." };

  let result: Awaited<ReturnType<typeof peerDecide>>;
  try {
    result = await peerDecide(ctx, parsed.data.swapId, "ACCEPT", null);
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "NOT_FOUND") return { error: "Échange introuvable." };
    if (m === "FORBIDDEN") {
      return { error: "Cet échange ne vous est pas destiné." };
    }
    throw err;
  }

  try {
    await sendNotificationEmail({
      to: result.proposerRecipient.email,
      recipientName: result.proposerRecipient.name,
      payload: {
        type: "SWAP_ACCEPTED_BY_PEER",
        swapId: result.swap.id,
        peerName: result.swap.targetUser.name ?? null,
      },
    });
  } catch (err) {
    console.warn("[peerAccept] email failed:", err instanceof Error ? err.message : err);
  }

  revalidatePath("/echanges");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { peerDecide } from "@/lib/repositories/shiftSwap";
import { sendNotificationEmail } from "@/lib/email";

const inputSchema = z.object({
  swapId: z.string().min(1),
  reason: z.string().max(280).optional(),
});

export type PeerRejectState = {
  error?: string;
  success?: true;
};

export async function peerRejectAction(
  _prev: PeerRejectState,
  formData: FormData,
): Promise<PeerRejectState> {
  const ctx = await requireTenantContext();
  const raw = formData.get("reason");
  const parsed = inputSchema.safeParse({
    swapId: formData.get("swapId"),
    reason: typeof raw === "string" && raw.length > 0 ? raw : undefined,
  });
  if (!parsed.success) return { error: "Données invalides." };

  let result: Awaited<ReturnType<typeof peerDecide>>;
  try {
    result = await peerDecide(
      ctx,
      parsed.data.swapId,
      "REJECT",
      parsed.data.reason?.trim() || null,
    );
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
        type: "SWAP_REJECTED_BY_PEER",
        swapId: result.swap.id,
        peerName: result.swap.targetUser.name ?? null,
        reason: result.swap.peerRejectionReason,
      },
    });
  } catch (err) {
    console.warn("[peerReject] email failed:", err instanceof Error ? err.message : err);
  }

  revalidatePath("/echanges");
  return { success: true };
}

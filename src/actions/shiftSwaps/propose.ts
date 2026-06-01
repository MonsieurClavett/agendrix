"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { proposeSwap } from "@/lib/repositories/shiftSwap";
import { sendNotificationEmail } from "@/lib/email";

const inputSchema = z.object({
  proposerShiftId: z.string().min(1),
  targetUserId: z.string().min(1),
  targetShiftId: z.string().min(1),
  proposerMessage: z.string().max(280).optional(),
});

export type ProposeSwapState = {
  error?: string;
  success?: true;
};

export async function proposeSwapAction(
  _prev: ProposeSwapState,
  formData: FormData,
): Promise<ProposeSwapState> {
  const ctx = await requireTenantContext();

  const raw = formData.get("proposerMessage");
  const parsed = inputSchema.safeParse({
    proposerShiftId: formData.get("proposerShiftId"),
    targetUserId: formData.get("targetUserId"),
    targetShiftId: formData.get("targetShiftId"),
    proposerMessage:
      typeof raw === "string" && raw.length > 0 ? raw : undefined,
  });
  if (!parsed.success) return { error: "Données invalides." };

  let result: Awaited<ReturnType<typeof proposeSwap>>;
  try {
    result = await proposeSwap(ctx, {
      proposerShiftId: parsed.data.proposerShiftId,
      targetUserId: parsed.data.targetUserId,
      targetShiftId: parsed.data.targetShiftId,
      proposerMessage: parsed.data.proposerMessage?.trim() || null,
    });
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "SHIFT_NOT_FOUND") return { error: "Shift introuvable." };
    if (m === "NOT_PROPOSER_SHIFT") {
      return { error: "Ce shift ne vous appartient pas." };
    }
    if (m === "NOT_PUBLISHED") {
      return { error: "Les deux shifts doivent être publiés." };
    }
    if (m === "NOT_TARGET_SHIFT") {
      return { error: "Le shift cible ne correspond pas au collègue choisi." };
    }
    if (m === "SAME_USER") {
      return { error: "Impossible de s'échanger avec soi-même." };
    }
    if (m === "SHIFT_ALREADY_ENGAGED") {
      return { error: "Un de ces shifts est déjà engagé dans un échange." };
    }
    throw err;
  }

  try {
    const proposerShiftStartISO =
      result.swap.proposerShift.startsAt.toISOString().slice(0, 10);
    const targetShiftStartISO =
      result.swap.targetShift.startsAt.toISOString().slice(0, 10);
    await sendNotificationEmail({
      to: result.recipient.email,
      recipientName: result.recipient.name,
      payload: {
        type: "SWAP_PROPOSED",
        swapId: result.swap.id,
        proposerName: result.swap.proposerUser.name ?? null,
        proposerShiftStartISO,
        targetShiftStartISO,
      },
    });
  } catch (err) {
    console.warn(
      "[proposeSwap] email failed:",
      err instanceof Error ? err.message : err,
    );
  }

  revalidatePath("/echanges");
  revalidatePath("/schedules");
  return { success: true };
}

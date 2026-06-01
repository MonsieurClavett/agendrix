"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { managerDecide } from "@/lib/repositories/shiftSwap";
import { sendNotificationEmail } from "@/lib/email";

const inputSchema = z.object({
  swapId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().max(280).optional(),
});

export type ManagerDecideState = {
  error?: string;
  success?: true;
};

export async function managerDecideAction(
  _prev: ManagerDecideState,
  formData: FormData,
): Promise<ManagerDecideState> {
  const ctx = await requireManagerContext();
  const raw = formData.get("reason");
  const parsed = inputSchema.safeParse({
    swapId: formData.get("swapId"),
    decision: formData.get("decision"),
    reason: typeof raw === "string" && raw.length > 0 ? raw : undefined,
  });
  if (!parsed.success) return { error: "Données invalides." };

  let result: Awaited<ReturnType<typeof managerDecide>>;
  try {
    result = await managerDecide(
      ctx,
      parsed.data.swapId,
      parsed.data.decision,
      parsed.data.reason?.trim() || null,
    );
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "NOT_FOUND") return { error: "Échange introuvable." };
    if (m === "SHIFT_NOT_FOUND") {
      return { error: "Un des shifts n'existe plus." };
    }
    if (m === "STATE_DRIFT") {
      return { error: "Cet échange n'est plus valide (un des shifts a été modifié)." };
    }
    if (m === "PROPOSER_OVERLAP") {
      return { error: "Le proposeur a déjà un shift qui chevauche cette plage." };
    }
    if (m === "TARGET_OVERLAP") {
      return { error: "Le destinataire a déjà un shift qui chevauche cette plage." };
    }
    throw err;
  }

  const decisionPayload =
    parsed.data.decision === "APPROVE"
      ? ("APPROVED" as const)
      : ("REJECTED" as const);
  const reason = result.swap.managerRejectionReason ?? null;

  await Promise.all(
    [result.proposerRecipient, result.targetRecipient].map(async (r) => {
      try {
        await sendNotificationEmail({
          to: r.email,
          recipientName: r.name,
          payload: {
            type: "SWAP_DECIDED_BY_MANAGER",
            swapId: result.swap.id,
            decision: decisionPayload,
            reason,
          },
        });
      } catch (err) {
        console.warn(
          "[managerDecide] email failed:",
          err instanceof Error ? err.message : err,
        );
      }
    }),
  );

  revalidatePath("/echanges");
  revalidatePath("/schedules");
  return { success: true };
}

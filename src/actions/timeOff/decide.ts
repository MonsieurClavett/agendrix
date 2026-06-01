"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { decideTimeOff } from "@/lib/repositories/timeOff";
import { sendNotificationEmail } from "@/lib/email";

const inputSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

export type DecideTimeOffState = {
  error?: string;
  success?: true;
};

export async function decideTimeOffAction(
  _prev: DecideTimeOffState,
  formData: FormData,
): Promise<DecideTimeOffState> {
  const ctx = await requireTenantContext();

  const parsed = inputSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) {
    return { error: "Décision invalide." };
  }

  let result: Awaited<ReturnType<typeof decideTimeOff>>;
  try {
    result = await decideTimeOff(
      ctx,
      parsed.data.requestId,
      parsed.data.decision,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "NOT_FOUND") return { error: "Demande introuvable." };
    if (message === "FORBIDDEN") {
      return { error: "Vous n'avez pas le droit de décider." };
    }
    if (message === "ALREADY_DECIDED") {
      return { error: "Cette demande a déjà été décidée." };
    }
    if (message === "OVERLAP") {
      return {
        error: "Impossible d'approuver : un conflit a été créé entre-temps.",
      };
    }
    throw err;
  }

  try {
    await sendNotificationEmail({
      to: result.recipient.email,
      recipientName: result.recipient.name,
      payload: {
        type: "TIME_OFF_DECIDED",
        status: parsed.data.decision,
        startDate: result.row.startDate.toISOString().slice(0, 10),
        endDate: result.row.endDate.toISOString().slice(0, 10),
        timeOffType: result.row.type,
      },
    });
  } catch (err) {
    console.warn(
      `[decideTimeOff] email failed for ${result.recipient.email}:`,
      err instanceof Error ? err.message : err,
    );
  }

  revalidatePath("/conges");
  revalidatePath("/schedules");
  return { success: true };
}

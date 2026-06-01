"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import {
  assignOpenShift,
  type AssignOpenShiftRecipient,
} from "@/lib/repositories/shiftClaim";
import { sendNotificationEmail } from "@/lib/email";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function toISODateLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const inputSchema = z.object({
  shiftId: z.string().min(1),
  claimId: z.string().min(1),
});

export type AssignOpenShiftState = {
  error?: string;
  success?: true;
};

export async function assignOpenShiftAction(
  _prev: AssignOpenShiftState,
  formData: FormData,
): Promise<AssignOpenShiftState> {
  const ctx = await requireManagerContext();
  const parsed = inputSchema.safeParse({
    shiftId: formData.get("shiftId"),
    claimId: formData.get("claimId"),
  });
  if (!parsed.success) return { error: "Identifiants invalides." };

  let recipients: AssignOpenShiftRecipient[] = [];
  try {
    const r = await assignOpenShift(
      ctx,
      parsed.data.shiftId,
      parsed.data.claimId,
    );
    recipients = r.recipients;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "NOT_FOUND") return { error: "Quart introuvable." };
    if (message === "NOT_OPEN") {
      return { error: "Ce quart n'est plus à combler." };
    }
    if (message === "CLAIM_NOT_FOUND") {
      return { error: "Cette demande n'est plus disponible." };
    }
    if (message === "ASSIGNEE_OVERLAP") {
      return {
        error: "Cet employé a déjà un shift qui chevauche cette plage.",
      };
    }
    throw err;
  }

  // Pull the assigned shift's range for the email payload.
  // The repository already updated `shift.employeeId`; re-read it
  // here is cheap and decoupled from the transaction.
  const shiftRow = await (
    await import("@/lib/db")
  ).db.shift.findUnique({
    where: { id: parsed.data.shiftId },
    select: { startsAt: true, endsAt: true },
  });

  if (shiftRow) {
    const shiftStartISO = toISODateLocal(shiftRow.startsAt);
    const shiftEndISO = toISODateLocal(shiftRow.endsAt);
    const weekStartISO = (() => {
      const d = new Date(shiftRow.startsAt);
      const day = d.getDay();
      const back = (day + 6) % 7;
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - back);
      return toISODateLocal(d);
    })();
    await Promise.all(
      recipients.map(async (r) => {
        try {
          await sendNotificationEmail({
            to: r.email,
            recipientName: r.name,
            payload: {
              type: "CLAIM_DECIDED",
              status: r.status,
              shiftStartISO,
              shiftEndISO,
              weekStartISO,
            },
          });
        } catch (err) {
          console.warn(
            `[assignOpenShift] email failed for ${r.email}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }),
    );
  }

  revalidatePath("/quarts-a-combler");
  revalidatePath("/schedules");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireManagerContext } from "@/lib/session";
import { resendInvitation } from "@/lib/repositories/invitation";
import { generateInvitationToken } from "@/lib/tokens";
import { sendInvitationEmail } from "@/lib/email";

const inputSchema = z.object({ invitationId: z.string().min(1) });

export type ResendInvitationState = {
  error?: string;
  success?: {
    email: string;
    link: string;
    delivered: boolean;
  };
};

const TTL_DAYS = 7;

function appUrl(): string {
  const raw =
    process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export async function resendInvitationAction(
  _prev: ResendInvitationState,
  formData: FormData,
): Promise<ResendInvitationState> {
  const ctx = await requireManagerContext();
  const parsed = inputSchema.safeParse({
    invitationId: formData.get("invitationId"),
  });
  if (!parsed.success) return { error: "Identifiant invalide." };

  const { token, hash } = generateInvitationToken();
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);

  try {
    const updated = await resendInvitation(ctx, parsed.data.invitationId, {
      newTokenHash: hash,
      newExpiresAt: expiresAt,
    });

    const company = await db.company.findUnique({
      where: { id: ctx.companyId },
      select: { name: true },
    });
    const companyName = company?.name ?? "votre entreprise";
    const link = `${appUrl()}/accept-invitation/${token}`;

    const { delivered } = await sendInvitationEmail({
      to: updated.email,
      inviteeName: updated.name,
      companyName,
      link,
      expiresAt,
    });

    revalidatePath("/team");
    return { success: { email: updated.email, link, delivered } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "NOT_FOUND") return { error: "Invitation introuvable." };
    if (message === "NOT_PENDING") {
      return { error: "Cette invitation n'est plus en attente." };
    }
    throw err;
  }
}

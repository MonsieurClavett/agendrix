"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireManagerContext } from "@/lib/session";
import {
  createInvitation,
  type InvitationRow,
} from "@/lib/repositories/invitation";
import { generateInvitationToken } from "@/lib/tokens";
import { sendInvitationEmail } from "@/lib/email";

const inputSchema = z.object({
  email: z.string().email("Email invalide"),
  name: z.string().trim().min(1, "Nom requis").max(80, "Nom trop long"),
  role: z.enum(["MANAGER", "EMPLOYEE"]),
});

export type CreateInvitationState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: {
    email: string;
    link: string;
    delivered: boolean;
    invitation: Pick<InvitationRow, "id" | "email" | "name" | "role">;
  };
};

const TTL_DAYS = 7;

function appUrl(): string {
  const raw =
    process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export async function createInvitationAction(
  _prev: CreateInvitationState,
  formData: FormData,
): Promise<CreateInvitationState> {
  const ctx = await requireManagerContext();

  const parsed = inputSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { token, hash } = generateInvitationToken();
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);

  let invitation: InvitationRow;
  try {
    invitation = await createInvitation(
      ctx,
      {
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
      },
      hash,
      expiresAt,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "EMAIL_TAKEN") {
      return { error: "Cet email est déjà associé à un compte." };
    }
    if (message === "ALREADY_PENDING") {
      return {
        error: "Une invitation pour cet email est déjà en attente.",
      };
    }
    throw err;
  }

  const company = await db.company.findUnique({
    where: { id: ctx.companyId },
    select: { name: true },
  });
  const companyName = company?.name ?? "votre entreprise";
  const link = `${appUrl()}/accept-invitation/${token}`;

  const { delivered } = await sendInvitationEmail({
    to: invitation.email,
    inviteeName: invitation.name,
    companyName,
    link,
    expiresAt,
  });

  revalidatePath("/team");
  return {
    success: {
      email: invitation.email,
      link,
      delivered,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
      },
    },
  };
}

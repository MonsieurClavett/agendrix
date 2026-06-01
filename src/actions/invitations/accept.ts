"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { acceptInvitation } from "@/lib/repositories/invitation";
import { hashInvitationToken } from "@/lib/tokens";

const inputSchema = z
  .object({
    token: z.string().min(10),
    name: z.string().trim().min(1, "Nom requis").max(80, "Nom trop long"),
    password: z
      .string()
      .min(8, "Mot de passe : 8 caractères minimum")
      .max(120, "Mot de passe trop long"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type AcceptInvitationState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function acceptInvitationAction(
  _prev: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const parsed = inputSchema.safeParse({
    token: formData.get("token"),
    name: formData.get("name"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const tokenHash = hashInvitationToken(parsed.data.token);

  try {
    await acceptInvitation(tokenHash, {
      name: parsed.data.name,
      password: parsed.data.password,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "NOT_FOUND") {
      return { error: "Invitation introuvable." };
    }
    if (message === "ALREADY_USED") {
      return { error: "Cette invitation a déjà été utilisée." };
    }
    if (message === "EXPIRED") {
      return { error: "Cette invitation a expiré." };
    }
    if (message === "EMAIL_TAKEN") {
      return { error: "Cet email est déjà associé à un compte." };
    }
    throw err;
  }

  redirect("/login?welcome=1");
}

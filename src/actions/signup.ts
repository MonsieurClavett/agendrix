"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { signIn } from "@/auth";

const signupSchema = z.object({
  companyName: z.string().min(2, "Nom d'entreprise trop court"),
  name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum"),
});

export type SignupState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    companyName: formData.get("companyName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { companyName, name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Cet email est déjà utilisé." };

  const passwordHash = await bcrypt.hash(password, 10);

  await db.$transaction(async (tx) => {
    const company = await tx.company.create({ data: { name: companyName } });
    await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "MANAGER",
        companyId: company.id,
      },
    });
  });

  await signIn("credentials", { email, password, redirect: false });
  redirect("/dashboard");
}

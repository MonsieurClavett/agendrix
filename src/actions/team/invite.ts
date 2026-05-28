"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";

import { db } from "@/lib/db";
import { requireManagerContext } from "@/lib/session";
import {
  createInvitedUser,
} from "@/lib/repositories/user";
import { generateTempPassword } from "@/lib/temp-password";

const inviteSchema = z.object({
  email: z.string().email("Email invalide"),
  name: z.string().min(1, "Nom requis"),
  role: z.enum(["MANAGER", "EMPLOYEE"]),
});

export type InviteState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: { email: string; tempPassword: string };
};

export async function inviteEmployeeAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const ctx = await requireManagerContext();

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, name, role } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Cet email est déjà utilisé." };

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  try {
    await createInvitedUser(ctx, { email, name, role, passwordHash });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { error: "Cet email est déjà utilisé." };
    }
    throw err;
  }

  return { success: { email, tempPassword } };
}

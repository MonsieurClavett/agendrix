"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { markNotificationRead } from "@/lib/repositories/notification";

const inputSchema = z.object({ notificationId: z.string().min(1) });

export type MarkReadState = {
  success?: true;
  error?: string;
};

export async function markNotificationReadAction(
  _prev: MarkReadState,
  formData: FormData,
): Promise<MarkReadState> {
  const ctx = await requireTenantContext();
  const parsed = inputSchema.safeParse({
    notificationId: formData.get("notificationId"),
  });
  if (!parsed.success) return { error: "Identifiant invalide." };

  await markNotificationRead(ctx, parsed.data.notificationId);
  revalidatePath("/");
  return { success: true };
}

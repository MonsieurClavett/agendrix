"use server";

import { revalidatePath } from "next/cache";

import { requireTenantContext } from "@/lib/session";
import { markAllNotificationsRead } from "@/lib/repositories/notification";

export type MarkAllReadState = {
  success?: true;
  count?: number;
};

export async function markAllNotificationsReadAction(
  _prev: MarkAllReadState,
  _formData: FormData,
): Promise<MarkAllReadState> {
  const ctx = await requireTenantContext();
  const { count } = await markAllNotificationsRead(ctx);
  revalidatePath("/");
  return { success: true, count };
}

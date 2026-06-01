"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { publishDraftsForWeek } from "@/lib/repositories/shift";
import { parseWeekParam } from "@/lib/week";

const inputSchema = z.object({
  weekStart: z.string().min(1),
});

export type PublishWeekState = {
  error?: string;
  success?: true;
  count?: number;
};

export async function publishWeekAction(
  _prev: PublishWeekState,
  formData: FormData,
): Promise<PublishWeekState> {
  const ctx = await requireManagerContext();

  const parsed = inputSchema.safeParse({
    weekStart: formData.get("weekStart"),
  });
  if (!parsed.success) {
    return { error: "Semaine invalide." };
  }

  const range = parseWeekParam(parsed.data.weekStart, new Date());
  const { count } = await publishDraftsForWeek(ctx, range);

  revalidatePath("/schedules");
  return { success: true, count };
}

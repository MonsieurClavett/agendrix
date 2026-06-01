"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTenantContext } from "@/lib/session";
import { recordPunch } from "@/lib/repositories/punch";

const inputSchema = z.object({ locationToken: z.string().min(1) });

export type RecordPunchState = {
  error?: string;
  success?: {
    type: "IN" | "OUT";
    punchedAt: string; // ISO string
    variance: {
      kind: "EARLY" | "LATE" | "ON_TIME";
      minutes: number;
    } | null;
  };
};

export async function recordPunchAction(
  _prev: RecordPunchState,
  formData: FormData,
): Promise<RecordPunchState> {
  const ctx = await requireTenantContext();
  const parsed = inputSchema.safeParse({
    locationToken: formData.get("locationToken"),
  });
  if (!parsed.success) return { error: "Données invalides." };

  try {
    const result = await recordPunch(ctx, parsed.data);
    revalidatePath(`/punch/${parsed.data.locationToken}`);
    revalidatePath("/pointage");
    revalidatePath("/me/pointage");
    return {
      success: {
        type: result.punch.type,
        punchedAt: result.punch.punchedAt.toISOString(),
        variance: result.variance,
      },
    };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "LOCATION_NOT_FOUND") return { error: "Poste introuvable." };
    if (m === "LOCATION_CROSS_TENANT") {
      return { error: "Ce poste appartient à une autre entreprise." };
    }
    if (m === "LOCATION_INACTIVE") {
      return { error: "Ce poste est désactivé." };
    }
    throw err;
  }
}

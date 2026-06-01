"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { createShift } from "@/lib/repositories/shift";
import { dateTimeFromParts, addDays } from "@/lib/week";

const createSchema = z
  .object({
    employeeId: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
    start: z.string().regex(/^\d{2}:\d{2}$/, "Heure de début invalide"),
    end: z.string().regex(/^\d{2}:\d{2}$/, "Heure de fin invalide"),
    note: z.string().max(280, "Note trop longue (280 max)").optional(),
    internalNote: z
      .string()
      .max(500, "Note interne trop longue (500 max)")
      .optional(),
    positionId: z.string().optional(),
  })
  .refine((d) => d.start !== d.end, {
    message: "Début et fin ne peuvent pas être identiques",
    path: ["end"],
  });

export type CreateState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: true;
};

export async function createShiftAction(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const ctx = await requireManagerContext();

  const parsed = createSchema.safeParse({
    employeeId: formData.get("employeeId"),
    date: formData.get("date"),
    start: formData.get("start"),
    end: formData.get("end"),
    note: formData.get("note") || undefined,
    internalNote: formData.get("internalNote") || undefined,
    positionId: formData.get("positionId") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { employeeId, date, start, end, note, internalNote, positionId } =
    parsed.data;
  const startsAt = dateTimeFromParts(date, start);
  let endsAt = dateTimeFromParts(date, end);
  if (endsAt <= startsAt) endsAt = addDays(endsAt, 1);

  const normalizedEmployeeId =
    employeeId && employeeId.trim() ? employeeId : null;

  try {
    await createShift(ctx, {
      employeeId: normalizedEmployeeId,
      startsAt,
      endsAt,
      note: note?.trim() ? note.trim() : null,
      internalNote: internalNote?.trim() ? internalNote.trim() : null,
      positionId: positionId && positionId.trim() ? positionId : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "EMPLOYEE_NOT_FOUND")
      return { error: "Employé introuvable." };
    if (message === "POSITION_NOT_FOUND")
      return { error: "Position introuvable." };
    if (message === "OVERLAP")
      return {
        error:
          "Un autre shift de cet employé chevauche déjà cette plage horaire.",
      };
    throw err;
  }

  revalidatePath("/schedules");
  return { success: true };
}

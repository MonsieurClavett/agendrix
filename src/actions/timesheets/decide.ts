"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerContext } from "@/lib/session";
import { decideForEmployee } from "@/lib/repositories/timesheetApproval";
import { sendNotificationEmail } from "@/lib/email";

const inputSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employeeId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
  managerNote: z.string().max(500).optional(),
});

export type DecideTimesheetState = {
  error?: string;
  success?: true;
};

export async function decideTimesheetAction(
  _prev: DecideTimesheetState,
  formData: FormData,
): Promise<DecideTimesheetState> {
  const ctx = await requireManagerContext();
  const parsed = inputSchema.safeParse({
    weekStart: formData.get("weekStart"),
    employeeId: formData.get("employeeId"),
    status: formData.get("status"),
    managerNote: formData.get("managerNote") || undefined,
  });
  if (!parsed.success) return { error: "Données invalides." };

  const weekStart = new Date(`${parsed.data.weekStart}T00:00:00`);
  if (Number.isNaN(weekStart.getTime())) {
    return { error: "Semaine invalide." };
  }

  let result: Awaited<ReturnType<typeof decideForEmployee>>;
  try {
    result = await decideForEmployee(ctx, {
      weekStart,
      employeeId: parsed.data.employeeId,
      status: parsed.data.status,
      managerNote: parsed.data.managerNote?.trim() || null,
    });
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "EMPLOYEE_NOT_FOUND")
      return { error: "Employé introuvable." };
    throw err;
  }

  try {
    await sendNotificationEmail({
      to: result.employee.email,
      recipientName: result.employee.name,
      payload: {
        type: "TIMESHEET_DECIDED",
        status: parsed.data.status,
        weekStartISO: parsed.data.weekStart,
        workedMinutes: 0,
        managerNote: parsed.data.managerNote?.trim() ?? null,
      },
    });
  } catch (e) {
    console.warn("[timesheet email] failed:", e);
  }

  revalidatePath("/approbation");
  return { success: true };
}

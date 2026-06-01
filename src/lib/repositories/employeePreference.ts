import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";

export type EmployeePreferenceRow = {
  id: string;
  employeeId: string;
  minHoursPerWeek: number | null;
  maxHoursPerWeek: number | null;
  preferredDays: number[];
  notes: string | null;
  updatedAt: Date;
};

const select = {
  id: true,
  employeeId: true,
  minHoursPerWeek: true,
  maxHoursPerWeek: true,
  preferredDays: true,
  notes: true,
  updatedAt: true,
} as const;

export async function getOwnPreferences(
  ctx: TenantContext,
): Promise<EmployeePreferenceRow | null> {
  return db.employeePreference.findUnique({
    where: { employeeId: ctx.userId },
    select,
  });
}

export async function getPreferencesForEmployee(
  ctx: TenantContext,
  employeeId: string,
): Promise<EmployeePreferenceRow | null> {
  // verify the employee belongs to the same company
  const employee = await db.user.findFirst({
    where: { id: employeeId, companyId: ctx.companyId },
    select: { id: true },
  });
  if (!employee) return null;
  return db.employeePreference.findUnique({
    where: { employeeId },
    select,
  });
}

export async function listPreferencesForCompany(
  ctx: TenantContext,
): Promise<Map<string, EmployeePreferenceRow>> {
  const rows = await db.employeePreference.findMany({
    where: { companyId: ctx.companyId },
    select,
  });
  return new Map(rows.map((r) => [r.employeeId, r]));
}

type UpsertInput = {
  minHoursPerWeek: number | null;
  maxHoursPerWeek: number | null;
  preferredDays: number[];
  notes: string | null;
};

export async function upsertOwnPreferences(
  ctx: TenantContext,
  input: UpsertInput,
): Promise<void> {
  if (
    input.minHoursPerWeek !== null &&
    (input.minHoursPerWeek < 0 || input.minHoursPerWeek > 168)
  ) {
    throw new Error("MIN_OUT_OF_RANGE");
  }
  if (
    input.maxHoursPerWeek !== null &&
    (input.maxHoursPerWeek < 0 || input.maxHoursPerWeek > 168)
  ) {
    throw new Error("MAX_OUT_OF_RANGE");
  }
  if (
    input.minHoursPerWeek !== null &&
    input.maxHoursPerWeek !== null &&
    input.minHoursPerWeek > input.maxHoursPerWeek
  ) {
    throw new Error("MIN_GREATER_THAN_MAX");
  }
  const days = Array.from(new Set(input.preferredDays)).filter(
    (d) => Number.isInteger(d) && d >= 1 && d <= 7,
  );
  if (input.notes && input.notes.length > 500) {
    throw new Error("NOTES_TOO_LONG");
  }

  await db.employeePreference.upsert({
    where: { employeeId: ctx.userId },
    create: {
      companyId: ctx.companyId,
      employeeId: ctx.userId,
      minHoursPerWeek: input.minHoursPerWeek,
      maxHoursPerWeek: input.maxHoursPerWeek,
      preferredDays: days,
      notes: input.notes,
    },
    update: {
      minHoursPerWeek: input.minHoursPerWeek,
      maxHoursPerWeek: input.maxHoursPerWeek,
      preferredDays: days,
      notes: input.notes,
    },
  });
}

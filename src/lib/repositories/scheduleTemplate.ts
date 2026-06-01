import { Prisma } from "@/generated/prisma";

import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";
import { addDays, addMinutes, weekRangeFrom } from "@/lib/week";

/**
 * Tenant pattern (Constitution Principle I): every read AND every write
 * filters on `companyId = ctx.companyId`. Server Actions go through these
 * functions only. All operations here are MANAGER-only (enforced by the
 * Server Actions calling `requireManagerContext`).
 */

const templateSelect = {
  id: true,
  name: true,
  createdAt: true,
  createdByUserId: true,
  createdBy: { select: { id: true, name: true, email: true } },
  _count: { select: { shifts: true } },
} as const;

export type TemplateRow = {
  id: string;
  name: string;
  createdAt: Date;
  createdByUserId: string | null;
  createdBy: { id: string; name: string | null; email: string } | null;
  _count: { shifts: number };
};

const templateShiftSelect = {
  id: true,
  employeeId: true,
  positionId: true,
  dayOfWeek: true,
  startMinute: true,
  endMinute: true,
  endDayOffset: true,
  note: true,
} as const;

export type TemplateDetail = TemplateRow & {
  shifts: {
    id: string;
    employeeId: string | null;
    positionId: string | null;
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
    endDayOffset: number;
    note: string | null;
  }[];
};

export async function listTemplates(ctx: TenantContext): Promise<TemplateRow[]> {
  return db.scheduleTemplate.findMany({
    where: { companyId: ctx.companyId },
    select: templateSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function getTemplate(
  ctx: TenantContext,
  templateId: string,
): Promise<TemplateDetail | null> {
  const t = await db.scheduleTemplate.findFirst({
    where: { id: templateId, companyId: ctx.companyId },
    select: { ...templateSelect, shifts: { select: templateShiftSelect } },
  });
  return t;
}

type CreateInput = {
  name: string;
  weekStart: Date;
};

export async function createTemplateFromWeek(
  ctx: TenantContext,
  input: CreateInput,
): Promise<{ id: string; shiftCount: number }> {
  const trimmed = input.name.trim();
  if (!trimmed) throw new Error("NAME_REQUIRED");
  if (trimmed.length > 80) throw new Error("NAME_TOO_LONG");

  const range = weekRangeFrom(input.weekStart);

  return db.$transaction(async (tx) => {
    const shifts = await tx.shift.findMany({
      where: {
        companyId: ctx.companyId,
        startsAt: { lt: range.end },
        endsAt: { gt: range.start },
      },
      select: {
        employeeId: true,
        positionId: true,
        startsAt: true,
        endsAt: true,
        note: true,
      },
      orderBy: [{ startsAt: "asc" }],
    });

    if (shifts.length === 0) throw new Error("EMPTY_WEEK");

    let template;
    try {
      template = await tx.scheduleTemplate.create({
        data: {
          companyId: ctx.companyId,
          name: trimmed,
          createdByUserId: ctx.userId,
        },
        select: { id: true },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new Error("NAME_TAKEN");
      }
      throw e;
    }

    const rows = shifts.map((s) => {
      const dayOfWeek = ((s.startsAt.getDay() + 6) % 7) + 1; // ISO Mon=1
      const startMinute =
        s.startsAt.getHours() * 60 + s.startsAt.getMinutes();
      const endMinute = s.endsAt.getHours() * 60 + s.endsAt.getMinutes();
      const startMid = new Date(s.startsAt);
      startMid.setHours(0, 0, 0, 0);
      const endMid = new Date(s.endsAt);
      endMid.setHours(0, 0, 0, 0);
      const endDayOffset = Math.round(
        (endMid.getTime() - startMid.getTime()) / (24 * 60 * 60 * 1000),
      );
      return {
        templateId: template.id,
        employeeId: s.employeeId,
        positionId: s.positionId,
        dayOfWeek,
        startMinute,
        endMinute,
        endDayOffset,
        note: s.note,
      };
    });

    await tx.scheduleTemplateShift.createMany({ data: rows });

    return { id: template.id, shiftCount: rows.length };
  });
}

type ApplyInput = {
  templateId: string;
  weekStart: Date;
};

export async function applyTemplate(
  ctx: TenantContext,
  input: ApplyInput,
): Promise<{ createdCount: number }> {
  return db.$transaction(async (tx) => {
    const template = await tx.scheduleTemplate.findFirst({
      where: { id: input.templateId, companyId: ctx.companyId },
      select: {
        id: true,
        shifts: { select: templateShiftSelect },
      },
    });
    if (!template) throw new Error("TEMPLATE_NOT_FOUND");

    const employeeIds = Array.from(
      new Set(
        template.shifts
          .map((s) => s.employeeId)
          .filter((v): v is string => v !== null),
      ),
    );
    const positionIds = Array.from(
      new Set(
        template.shifts
          .map((s) => s.positionId)
          .filter((v): v is string => v !== null),
      ),
    );

    const [validEmployees, validPositions] = await Promise.all([
      employeeIds.length
        ? tx.user.findMany({
            where: {
              id: { in: employeeIds },
              companyId: ctx.companyId,
              isActive: true,
            },
            select: { id: true },
          })
        : Promise.resolve([] as { id: string }[]),
      positionIds.length
        ? tx.position.findMany({
            where: { id: { in: positionIds }, companyId: ctx.companyId },
            select: { id: true },
          })
        : Promise.resolve([] as { id: string }[]),
    ]);
    const validEmployeeSet = new Set(validEmployees.map((e) => e.id));
    const validPositionSet = new Set(validPositions.map((p) => p.id));

    const rows = template.shifts.map((s) => {
      const dayDate = addDays(input.weekStart, s.dayOfWeek - 1);
      const startsAt = addMinutes(dayDate, s.startMinute);
      const endBase = addDays(dayDate, s.endDayOffset);
      const endsAt = addMinutes(endBase, s.endMinute);
      return {
        companyId: ctx.companyId,
        employeeId:
          s.employeeId && validEmployeeSet.has(s.employeeId)
            ? s.employeeId
            : null,
        positionId:
          s.positionId && validPositionSet.has(s.positionId)
            ? s.positionId
            : null,
        startsAt,
        endsAt,
        note: s.note,
        status: "DRAFT" as const,
      };
    });

    if (rows.length === 0) return { createdCount: 0 };
    await tx.shift.createMany({ data: rows });
    return { createdCount: rows.length };
  });
}

export async function renameTemplate(
  ctx: TenantContext,
  templateId: string,
  newName: string,
): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error("NAME_REQUIRED");
  if (trimmed.length > 80) throw new Error("NAME_TOO_LONG");

  const owned = await db.scheduleTemplate.findFirst({
    where: { id: templateId, companyId: ctx.companyId },
    select: { id: true },
  });
  if (!owned) throw new Error("TEMPLATE_NOT_FOUND");

  try {
    await db.scheduleTemplate.update({
      where: { id: templateId },
      data: { name: trimmed },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new Error("NAME_TAKEN");
    }
    throw e;
  }
}

export async function deleteTemplate(
  ctx: TenantContext,
  templateId: string,
): Promise<void> {
  const owned = await db.scheduleTemplate.findFirst({
    where: { id: templateId, companyId: ctx.companyId },
    select: { id: true },
  });
  if (!owned) throw new Error("TEMPLATE_NOT_FOUND");

  await db.scheduleTemplate.delete({ where: { id: templateId } });
}

import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";
import { pairPunches, type PunchRow } from "@/lib/repositories/punch";

export type DayHeatmapPoint = {
  date: string; // YYYY-MM-DD
  workedMinutes: number;
};

export type DayOfWeekStat = {
  dayOfWeek: number; // 1=Mon..7=Sun
  workedMinutes: number;
};

export type PositionStat = {
  positionId: string | null;
  positionName: string;
  scheduledMinutes: number;
};

export type EmployeeStatsData = {
  range: { startDate: Date; endDate: Date };
  totalWorkedMinutes: number;
  totalScheduledMinutes: number;
  preference: {
    minHoursPerWeek: number | null;
    maxHoursPerWeek: number | null;
  } | null;
  avgWorkedMinutesPerWorkedDay: number;
  punctualityPct: number | null; // 0..100, null if no punches matched a shift
  punctualSampleSize: number;
  streakDays: number;
  workedDaysCount: number;
  heatmap: DayHeatmapPoint[];
  byDayOfWeek: DayOfWeekStat[];
  byPosition: PositionStat[];
  badges: { id: string; label: string; tone: "primary" | "amber" | "emerald" }[];
};

function startOfLocalDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getStatsForUser(
  ctx: TenantContext,
  input: { sinceDays?: number } = {},
): Promise<EmployeeStatsData> {
  const sinceDays = Math.max(1, Math.min(365, input.sinceDays ?? 30));
  const today = new Date();
  const endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999);
  const startDate = startOfLocalDay(today);
  startDate.setDate(startDate.getDate() - (sinceDays - 1));

  const [shifts, punches, preference] = await Promise.all([
    db.shift.findMany({
      where: {
        companyId: ctx.companyId,
        employeeId: ctx.userId,
        startsAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        positionId: true,
        position: { select: { id: true, name: true } },
      },
    }),
    db.punch.findMany({
      where: {
        companyId: ctx.companyId,
        employeeId: ctx.userId,
        punchedAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        employeeId: true,
        locationId: true,
        type: true,
        punchedAt: true,
        notes: true,
        employee: { select: { id: true, name: true, email: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { punchedAt: "asc" },
    }),
    db.employeePreference.findUnique({
      where: { employeeId: ctx.userId },
      select: { minHoursPerWeek: true, maxHoursPerWeek: true },
    }),
  ]);

  const sessions = pairPunches(punches as PunchRow[]);

  // Total scheduled / worked.
  const totalScheduledMinutes = shifts.reduce(
    (acc, s) =>
      acc + Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 60_000),
    0,
  );
  const totalWorkedMinutes = sessions.reduce(
    (acc, s) => acc + (s.durationMinutes ?? 0),
    0,
  );

  // Heatmap: per-day worked minutes for the range.
  const workedPerDay = new Map<string, number>();
  for (const s of sessions) {
    if (s.durationMinutes === null) continue;
    const k = isoDate(s.startsAt);
    workedPerDay.set(k, (workedPerDay.get(k) ?? 0) + s.durationMinutes);
  }
  const heatmap: DayHeatmapPoint[] = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const k = isoDate(cur);
    heatmap.push({ date: k, workedMinutes: workedPerDay.get(k) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }

  // By day of week.
  const byDowMap = new Map<number, number>();
  for (const s of sessions) {
    if (s.durationMinutes === null) continue;
    const dow = ((s.startsAt.getDay() + 6) % 7) + 1; // ISO Mon=1
    byDowMap.set(dow, (byDowMap.get(dow) ?? 0) + s.durationMinutes);
  }
  const byDayOfWeek: DayOfWeekStat[] = Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i + 1,
    workedMinutes: byDowMap.get(i + 1) ?? 0,
  }));

  // By position (scheduled basis — punches don't carry position).
  const byPosMap = new Map<string, PositionStat>();
  for (const s of shifts) {
    const key = s.positionId ?? "__none__";
    let entry = byPosMap.get(key);
    if (!entry) {
      entry = {
        positionId: s.positionId,
        positionName: s.position?.name ?? "Sans position",
        scheduledMinutes: 0,
      };
      byPosMap.set(key, entry);
    }
    entry.scheduledMinutes += Math.round(
      (s.endsAt.getTime() - s.startsAt.getTime()) / 60_000,
    );
  }
  const byPosition = Array.from(byPosMap.values()).sort(
    (a, b) => b.scheduledMinutes - a.scheduledMinutes,
  );

  // Worked-days count + streak.
  const workedDays = new Set(
    sessions
      .filter((s) => s.durationMinutes !== null)
      .map((s) => isoDate(s.startsAt)),
  );
  const workedDaysCount = workedDays.size;

  let streakDays = 0;
  const dayCursor = startOfLocalDay(today);
  while (workedDays.has(isoDate(dayCursor))) {
    streakDays += 1;
    dayCursor.setDate(dayCursor.getDate() - 1);
  }

  const avgWorkedMinutesPerWorkedDay =
    workedDaysCount > 0
      ? Math.round(totalWorkedMinutes / workedDaysCount)
      : 0;

  // Punctuality: for each IN punch, find the nearest scheduled shift starting
  // within ±6h and compute |variance| in minutes; punctual if ≤ 5 min.
  const inPunches = punches.filter((p) => p.type === "IN");
  let punctualSampleSize = 0;
  let punctualCount = 0;
  for (const p of inPunches) {
    const winStart = new Date(p.punchedAt.getTime() - 6 * 60 * 60 * 1000);
    const winEnd = new Date(p.punchedAt.getTime() + 6 * 60 * 60 * 1000);
    const match = shifts.find(
      (s) => s.startsAt >= winStart && s.startsAt <= winEnd,
    );
    if (!match) continue;
    punctualSampleSize += 1;
    const diffMin = Math.abs(
      Math.round((p.punchedAt.getTime() - match.startsAt.getTime()) / 60_000),
    );
    if (diffMin <= 5) punctualCount += 1;
  }
  const punctualityPct =
    punctualSampleSize > 0
      ? Math.round((punctualCount / punctualSampleSize) * 100)
      : null;

  // Badges (simple, deterministic).
  const badges: EmployeeStatsData["badges"] = [];
  const hours = totalWorkedMinutes / 60;
  if (workedDaysCount >= 5) {
    badges.push({ id: "first-week", label: "Première semaine !", tone: "primary" });
  }
  if (hours >= 50) {
    badges.push({ id: "50h", label: "50 heures travaillées", tone: "primary" });
  }
  if (hours >= 100) {
    badges.push({ id: "100h", label: "100 heures travaillées", tone: "emerald" });
  }
  if (punctualityPct !== null && punctualityPct >= 90 && punctualSampleSize >= 5) {
    badges.push({ id: "punctual", label: "Ponctuel", tone: "emerald" });
  }
  if (streakDays >= 7) {
    badges.push({ id: "marathon", label: "Marathon (7 jours d'affilée)", tone: "amber" });
  }
  if (
    sessions.some(
      (s) =>
        s.endsAt !== null &&
        (s.endsAt.getHours() >= 22 || s.endsAt.getHours() < 4),
    )
  ) {
    badges.push({ id: "late", label: "Sortie tardive", tone: "amber" });
  }

  return {
    range: { startDate, endDate },
    totalWorkedMinutes,
    totalScheduledMinutes,
    preference,
    avgWorkedMinutesPerWorkedDay,
    punctualityPct,
    punctualSampleSize,
    streakDays,
    workedDaysCount,
    heatmap,
    byDayOfWeek,
    byPosition,
    badges,
  };
}

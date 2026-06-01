import { db } from "@/lib/db";
import type { TenantContext } from "@/lib/session";
import type { PunchType } from "@/generated/prisma";

export type PunchRow = {
  id: string;
  employeeId: string;
  locationId: string | null;
  type: PunchType;
  punchedAt: Date;
  notes: string | null;
  employee: { id: string; name: string | null; email: string };
  location: { id: string; name: string } | null;
};

const punchSelect = {
  id: true,
  employeeId: true,
  locationId: true,
  type: true,
  punchedAt: true,
  notes: true,
  employee: { select: { id: true, name: true, email: true } },
  location: { select: { id: true, name: true } },
} as const;

function startOfLocalDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfLocalDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

export async function getLastPunchOfDay(
  ctx: TenantContext,
  employeeId: string,
  date: Date,
): Promise<PunchRow | null> {
  return db.punch.findFirst({
    where: {
      companyId: ctx.companyId,
      employeeId,
      punchedAt: { gte: startOfLocalDay(date), lte: endOfLocalDay(date) },
    },
    select: punchSelect,
    orderBy: { punchedAt: "desc" },
  });
}

export async function listPunchesForDay(
  ctx: TenantContext,
  date: Date,
): Promise<PunchRow[]> {
  return db.punch.findMany({
    where: {
      companyId: ctx.companyId,
      punchedAt: { gte: startOfLocalDay(date), lte: endOfLocalDay(date) },
    },
    select: punchSelect,
    orderBy: { punchedAt: "desc" },
  });
}

export async function listPunchesForUser(
  ctx: TenantContext,
  userId: string,
  sinceDate: Date,
): Promise<PunchRow[]> {
  return db.punch.findMany({
    where: {
      companyId: ctx.companyId,
      employeeId: userId,
      punchedAt: { gte: sinceDate },
    },
    select: punchSelect,
    orderBy: { punchedAt: "desc" },
  });
}

/**
 * Record a punch. The type (IN vs OUT) is auto-determined by the last
 * punch of the calendar day for this employee:
 *   - no punch yet today           → IN
 *   - last punch is OUT            → IN (new pair starting)
 *   - last punch is IN             → OUT
 *
 * `employeeId` is FORCED to `ctx.userId` so a malicious caller cannot
 * punch on behalf of another employee.
 */
export async function recordPunch(
  ctx: TenantContext,
  input: { locationToken: string },
): Promise<{
  punch: PunchRow;
  nearestShift: {
    id: string;
    startsAt: Date;
    endsAt: Date;
  } | null;
  variance: { kind: "EARLY" | "LATE" | "ON_TIME"; minutes: number } | null;
}> {
  return db.$transaction(async (tx) => {
    const location = await tx.punchLocation.findUnique({
      where: { token: input.locationToken },
      select: { id: true, companyId: true, isActive: true },
    });
    if (!location) throw new Error("LOCATION_NOT_FOUND");
    if (location.companyId !== ctx.companyId) {
      throw new Error("LOCATION_CROSS_TENANT");
    }
    if (!location.isActive) throw new Error("LOCATION_INACTIVE");

    const now = new Date();

    const last = await tx.punch.findFirst({
      where: {
        companyId: ctx.companyId,
        employeeId: ctx.userId,
        punchedAt: {
          gte: startOfLocalDay(now),
          lte: endOfLocalDay(now),
        },
      },
      select: { type: true },
      orderBy: { punchedAt: "desc" },
    });

    const type: PunchType =
      last === null || last.type === "OUT" ? "IN" : "OUT";

    const created = await tx.punch.create({
      data: {
        companyId: ctx.companyId,
        employeeId: ctx.userId,
        locationId: location.id,
        type,
        punchedAt: now,
      },
      select: punchSelect,
    });

    // Find the closest shift within ±6h to compute variance vs scheduled.
    const windowStart = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const nearShift = await tx.shift.findFirst({
      where: {
        companyId: ctx.companyId,
        employeeId: ctx.userId,
        startsAt: { lte: windowEnd },
        endsAt: { gte: windowStart },
      },
      select: { id: true, startsAt: true, endsAt: true },
      orderBy: { startsAt: "asc" },
    });

    let variance: {
      kind: "EARLY" | "LATE" | "ON_TIME";
      minutes: number;
    } | null = null;

    if (nearShift) {
      const ref = type === "IN" ? nearShift.startsAt : nearShift.endsAt;
      const diffMin = Math.round((now.getTime() - ref.getTime()) / 60_000);
      if (Math.abs(diffMin) <= 2) {
        variance = { kind: "ON_TIME", minutes: 0 };
      } else if (diffMin < 0) {
        variance = { kind: "EARLY", minutes: Math.abs(diffMin) };
      } else {
        variance = { kind: "LATE", minutes: diffMin };
      }
    }

    return {
      punch: created,
      nearestShift: nearShift,
      variance,
    };
  });
}

/**
 * Pair IN/OUT punches by day into work intervals. Returns an array of
 * sessions sorted by start desc. Open sessions (IN without OUT) carry
 * `endsAt = null` and `durationMinutes = null`.
 */
export function pairPunches(rows: PunchRow[]): Array<{
  startsAt: Date;
  endsAt: Date | null;
  durationMinutes: number | null;
  inPunch: PunchRow;
  outPunch: PunchRow | null;
  location: { id: string; name: string } | null;
}> {
  // Algorithm: walk chronologically (oldest → newest). Pair each IN with
  // the next OUT. Trailing IN without OUT → open session.
  const sorted = [...rows].sort(
    (a, b) => a.punchedAt.getTime() - b.punchedAt.getTime(),
  );
  const sessions: Array<{
    startsAt: Date;
    endsAt: Date | null;
    durationMinutes: number | null;
    inPunch: PunchRow;
    outPunch: PunchRow | null;
    location: { id: string; name: string } | null;
  }> = [];
  let pendingIn: PunchRow | null = null;
  for (const p of sorted) {
    if (p.type === "IN") {
      if (pendingIn) {
        // Orphan IN (no closing OUT for previous) — push as open.
        sessions.push({
          startsAt: pendingIn.punchedAt,
          endsAt: null,
          durationMinutes: null,
          inPunch: pendingIn,
          outPunch: null,
          location: pendingIn.location,
        });
      }
      pendingIn = p;
    } else {
      if (pendingIn) {
        const dur = Math.round(
          (p.punchedAt.getTime() - pendingIn.punchedAt.getTime()) / 60_000,
        );
        sessions.push({
          startsAt: pendingIn.punchedAt,
          endsAt: p.punchedAt,
          durationMinutes: dur,
          inPunch: pendingIn,
          outPunch: p,
          location: pendingIn.location ?? p.location,
        });
        pendingIn = null;
      }
      // OUT without preceding IN — silently ignore (data oddity).
    }
  }
  if (pendingIn) {
    sessions.push({
      startsAt: pendingIn.punchedAt,
      endsAt: null,
      durationMinutes: null,
      inPunch: pendingIn,
      outPunch: null,
      location: pendingIn.location,
    });
  }
  return sessions.reverse(); // newest first
}

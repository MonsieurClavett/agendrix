import type { TimeOffType, TimeOffStatus } from "@/generated/prisma";
import type { WeekRange } from "@/lib/week";

/**
 * Pure helpers for the TimeOff domain. No DB access.
 *
 * Dates stored on `TimeOffRequest` come back from Prisma as JS `Date` at
 * local midnight (PostgreSQL `DATE` column). The helpers below operate
 * in local time without timezone math, matching the rest of the
 * codebase.
 */

export const TIME_OFF_TYPE_LABELS: Record<TimeOffType, string> = {
  PAID: "Payé",
  UNPAID: "Non payé",
  SICK: "Maladie",
};

export const TIME_OFF_STATUS_LABELS: Record<TimeOffStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
};

/** Parse `"YYYY-MM-DD"` into a local-midnight Date, or null on bad input. */
export function parseISODate(s: string): Date | null {
  if (typeof s !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(year, month, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

/** Local ISO `YYYY-MM-DD`. */
function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Returns inclusive ISO date strings from `startDate` to `endDate`.
 * Caller MUST ensure `endDate >= startDate`.
 */
export function enumerateDates(startDate: Date, endDate: Date): string[] {
  const out: string[] = [];
  const cursor = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );
  const stop = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );
  while (cursor.getTime() <= stop.getTime()) {
    out.push(toLocalISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/**
 * Intersect a request range with the visible week. Returns null if no
 * overlap. Both bounds are inclusive in time-off semantics.
 */
export function clampDatesToWeek(
  start: Date,
  end: Date,
  range: WeekRange,
): { start: Date; end: Date } | null {
  const rangeStart = new Date(
    range.start.getFullYear(),
    range.start.getMonth(),
    range.start.getDate(),
  );
  // `range.end` from weekRangeFrom is the last millisecond of Sunday;
  // for date-only math we want the date of Sunday itself.
  const rangeEnd = new Date(
    range.end.getFullYear(),
    range.end.getMonth(),
    range.end.getDate(),
  );
  if (end < rangeStart || start > rangeEnd) return null;
  const lo = start < rangeStart ? rangeStart : start;
  const hi = end > rangeEnd ? rangeEnd : end;
  return { start: lo, end: hi };
}

type TimeOffMapEntry = {
  approved: Set<string>;
  pending: Set<string>;
};

type RawRow = {
  employeeId: string;
  startDate: Date;
  endDate: Date;
  status: TimeOffStatus;
};

/**
 * Groups rows into a per-employee map of two Sets keyed by ISO date.
 * Only PENDING and APPROVED rows are placed in the sets — callers MUST
 * pre-filter REJECTED out (the repository already does).
 */
export function buildTimeOffMaps(
  rows: RawRow[],
  range: WeekRange,
): Map<string, TimeOffMapEntry> {
  const map = new Map<string, TimeOffMapEntry>();
  for (const r of rows) {
    if (r.status !== "PENDING" && r.status !== "APPROVED") continue;
    const clamp = clampDatesToWeek(r.startDate, r.endDate, range);
    if (!clamp) continue;
    let entry = map.get(r.employeeId);
    if (!entry) {
      entry = { approved: new Set<string>(), pending: new Set<string>() };
      map.set(r.employeeId, entry);
    }
    const days = enumerateDates(clamp.start, clamp.end);
    const target = r.status === "APPROVED" ? entry.approved : entry.pending;
    for (const d of days) target.add(d);
  }
  return map;
}

export type TimeOffOverlayMap = Map<string, TimeOffMapEntry>;

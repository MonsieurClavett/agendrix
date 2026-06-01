/**
 * Pure helpers for the Availability domain. No DB access. Symmetric to
 * `src/lib/week.ts` from earlier phases.
 *
 * `dayOfWeek` follows JS `Date#getDay()`: 0 = Sunday … 6 = Saturday.
 * Minutes are minutes-since-local-midnight in the range [0, 1440].
 */

export const DAY_LABELS = [
  "Dim",
  "Lun",
  "Mar",
  "Mer",
  "Jeu",
  "Ven",
  "Sam",
] as const;

export const DAY_LABELS_LONG = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;

/**
 * Parse "HH:MM" (24h) into minutes-since-midnight. Accepts the literal
 * "24:00" as 1440 (the right-open boundary). Returns null on malformed
 * input.
 */
export function parseHHMMToMinutes(hhmm: string): number | null {
  if (typeof hhmm !== "string") return null;
  const trimmed = hhmm.trim();
  if (trimmed === "24:00") return 1440;
  const m = /^([0-2]\d):([0-5]\d)$/.exec(trimmed);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23) return null;
  return hours * 60 + minutes;
}

/** Format minutes-since-midnight as "HH:MM". 1440 renders as "24:00". */
export function formatMinutesToHHMM(minute: number): string {
  if (minute === 1440) return "24:00";
  const h = String(Math.floor(minute / 60)).padStart(2, "0");
  const m = String(minute % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/** Local day-of-week (0=Sun … 6=Sat). Pure wrapper for readability. */
export function dayOfWeekFromDate(d: Date): number {
  return d.getDay();
}

/** Local minutes-since-midnight for a Date. */
export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export type AvailabilityRange = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

type ShiftLike = { startsAt: Date; endsAt: Date };

/**
 * Returns true when the shift is entirely contained in at least one
 * declared range matching the shift's local day-of-week.
 *
 * A shift that starts before midnight on day D and ends after midnight
 * on day D+1 is NOT considered inside any range (spec scope: ranges
 * never cross midnight). It will trigger the off-availability warning
 * via the caller below.
 */
export function isShiftInsideAvailability(
  shift: ShiftLike,
  ranges: AvailabilityRange[],
): boolean {
  const startDay = dayOfWeekFromDate(shift.startsAt);
  const endDay = dayOfWeekFromDate(shift.endsAt);
  // For multi-day shifts (rare) treat as off — we can't fit them in a
  // single weekly range by definition.
  if (startDay !== endDay) {
    const endMinute = minutesSinceMidnight(shift.endsAt);
    if (endMinute !== 0) return false;
  }
  const start = minutesSinceMidnight(shift.startsAt);
  // A shift ending at exactly 00:00 of the next day = end-minute 1440 on
  // the previous day.
  const rawEnd = minutesSinceMidnight(shift.endsAt);
  const end = startDay !== endDay && rawEnd === 0 ? 1440 : rawEnd;

  for (const r of ranges) {
    if (r.dayOfWeek !== startDay) continue;
    if (r.startMinute <= start && r.endMinute >= end) return true;
  }
  return false;
}

/**
 * The spec's warning rule:
 *  - if the employee has no declared range AT ALL → never warn
 *    (absence of declaration ≠ "unavailable")
 *  - otherwise → warn iff the shift is not entirely inside any range
 *    matching its day-of-week.
 */
export function isShiftOffAvailability(
  shift: ShiftLike,
  allRangesForEmployee: AvailabilityRange[],
): boolean {
  if (allRangesForEmployee.length === 0) return false;
  return !isShiftInsideAvailability(shift, allRangesForEmployee);
}

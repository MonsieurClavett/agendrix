/**
 * Tiny pure-TS week / date helpers. No new dependency (per research.md
 * Decision 3). All functions are pure and timezone-aware against the
 * runtime's local timezone.
 */

export type WeekRange = { start: Date; end: Date };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns 00:00:00.000 local time of the Monday of the ISO week
 * containing `d`. ISO weeks start on Monday; Sunday belongs to the
 * PREVIOUS week.
 */
export function mondayOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const daysSinceMonday = (day + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - daysSinceMonday);
  return monday;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Returns { start: Monday 00:00, end: Sunday 23:59:59.999 }. */
export function weekRangeFrom(monday: Date): WeekRange {
  const end = addDays(monday, 7);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return { start: monday, end };
}

/** YYYY-MM-DD in the runtime's local timezone. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parses a `?week=YYYY-MM-DD` query value and returns the WeekRange of
 * the Monday-of-that-week. Bad input falls back to the Monday of `fallback`
 * (typically `new Date()`).
 */
export function parseWeekParam(
  raw: string | undefined,
  fallback: Date,
): WeekRange {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return weekRangeFrom(mondayOfWeek(parsed));
    }
  }
  return weekRangeFrom(mondayOfWeek(fallback));
}

/**
 * Builds a Date from an ISO date "YYYY-MM-DD" and an HH:mm time string,
 * in local time. Used by the create/update Server Actions to assemble
 * `startsAt` / `endsAt` from form fields.
 */
export function dateTimeFromParts(isoDate: string, hhmm: string): Date {
  return new Date(`${isoDate}T${hhmm}:00`);
}

/** Returns the same date with `n` minutes added. */
export function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60_000);
}

/** Returns true if two half-open intervals [aStart, aEnd) and [bStart, bEnd) overlap. */
export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Days in the week, as 7 consecutive midnights from the Monday. */
export function daysOfWeek(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const FRENCH_WEEKDAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

const FRENCH_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** "Lundi 8 juin 2026" */
export function formatLongDate(d: Date): string {
  const dow = FRENCH_WEEKDAYS[(d.getDay() + 6) % 7];
  const day = d.getDate();
  const month = FRENCH_MONTHS[d.getMonth()];
  return `${dow} ${day} ${month} ${d.getFullYear()}`;
}

/** "HH:mm" in local time. */
export function formatHHMM(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** True if the two dates fall on the same calendar day in local time. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export type CalendarView = "week" | "day" | "2week";

export function parseViewParam(raw: string | undefined): CalendarView {
  if (raw === "day" || raw === "2week") return raw;
  return "week";
}

/**
 * Build the visible date range for a given view, anchored at `anchor`.
 *   - "day"   → [00:00, 24:00) of `anchor` (Monday-of-week not applied — the
 *     anchor IS the day).
 *   - "week"  → 7 days starting at the Monday of `anchor`.
 *   - "2week" → 14 days starting at the Monday of `anchor`.
 */
export function rangeFor(view: CalendarView, anchor: Date): WeekRange {
  if (view === "day") {
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    const end = addDays(start, 1);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { start, end };
  }
  if (view === "2week") {
    const monday = mondayOfWeek(anchor);
    const end = addDays(monday, 14);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { start: monday, end };
  }
  return weekRangeFrom(mondayOfWeek(anchor));
}

export function nextAnchor(view: CalendarView, current: Date): Date {
  return addDays(current, view === "day" ? 1 : view === "2week" ? 14 : 7);
}

export function prevAnchor(view: CalendarView, current: Date): Date {
  return addDays(current, view === "day" ? -1 : view === "2week" ? -14 : -7);
}

/** Enumerate consecutive midnights covering the given range. */
export function daysOfRange(range: WeekRange): Date[] {
  const days: Date[] = [];
  const cur = new Date(range.start);
  cur.setHours(0, 0, 0, 0);
  while (cur < range.end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/** Parse a YYYY-MM-DD param into a local date; fallback to `fallback`. */
export function parseISODate(
  raw: string | undefined,
  fallback: Date,
): Date {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const out = new Date(fallback);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Whole-day count between two dates, in local time. (`b - a` in days, ignoring time.) */
export function dayDiff(a: Date, b: Date): number {
  const aMid = new Date(a);
  aMid.setHours(0, 0, 0, 0);
  const bMid = new Date(b);
  bMid.setHours(0, 0, 0, 0);
  return Math.round((bMid.getTime() - aMid.getTime()) / MS_PER_DAY);
}

import { z } from "zod";

import {
  TIME_OFF_STATUS_LABELS,
  TIME_OFF_TYPE_LABELS,
} from "@/lib/timeOff";

/**
 * Discriminated payload union for the Notification.payload column.
 * The DB column is `Json`, but every read goes through this Zod
 * schema so the UI/render layer always works with a typed value.
 */

export const SHIFT_PUBLISHED_PAYLOAD = z.object({
  type: z.literal("SHIFT_PUBLISHED"),
  shiftCount: z.number().int().positive(),
  weekStartISO: z.string(),
});

export const TIME_OFF_DECIDED_PAYLOAD = z.object({
  type: z.literal("TIME_OFF_DECIDED"),
  status: z.enum(["APPROVED", "REJECTED"]),
  startDate: z.string(),
  endDate: z.string(),
  timeOffType: z.enum(["PAID", "UNPAID", "SICK"]),
});

export const CLAIM_DECIDED_PAYLOAD = z.object({
  type: z.literal("CLAIM_DECIDED"),
  status: z.enum(["APPROVED", "REJECTED"]),
  shiftStartISO: z.string(),
  shiftEndISO: z.string(),
  weekStartISO: z.string(),
});

export const NotificationPayloadSchema = z.discriminatedUnion("type", [
  SHIFT_PUBLISHED_PAYLOAD,
  TIME_OFF_DECIDED_PAYLOAD,
  CLAIM_DECIDED_PAYLOAD,
]);

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;

/** Returns the French label shown to the user in the bell dropdown. */
export function renderNotificationLabel(p: NotificationPayload): string {
  switch (p.type) {
    case "SHIFT_PUBLISHED":
      return p.shiftCount === 1
        ? "1 nouveau shift publié cette semaine."
        : `${p.shiftCount} nouveaux shifts publiés cette semaine.`;
    case "TIME_OFF_DECIDED":
      return `Votre demande de congé (${TIME_OFF_TYPE_LABELS[p.timeOffType]}) du ${formatISODateFR(p.startDate)} au ${formatISODateFR(p.endDate)} a été ${TIME_OFF_STATUS_LABELS[p.status].toLowerCase()}.`;
    case "CLAIM_DECIDED":
      return p.status === "APPROVED"
        ? `Votre demande pour le quart du ${formatISODateFR(p.shiftStartISO)} a été approuvée.`
        : `Votre demande pour le quart du ${formatISODateFR(p.shiftStartISO)} a été refusée.`;
  }
}

/** Returns an optional href the user can navigate to on click. */
export function renderNotificationHref(
  p: NotificationPayload,
): string | undefined {
  switch (p.type) {
    case "SHIFT_PUBLISHED":
      return `/schedules?week=${p.weekStartISO}`;
    case "TIME_OFF_DECIDED":
      return "/conges";
    case "CLAIM_DECIDED":
      return `/schedules?week=${p.weekStartISO}`;
  }
}

/** Email subject for the notification, in French. */
export function renderNotificationEmailSubject(
  p: NotificationPayload,
): string {
  switch (p.type) {
    case "SHIFT_PUBLISHED":
      return p.shiftCount === 1
        ? "1 nouveau shift publié"
        : `${p.shiftCount} nouveaux shifts publiés`;
    case "TIME_OFF_DECIDED":
      return p.status === "APPROVED"
        ? "Votre demande de congé a été approuvée"
        : "Votre demande de congé a été refusée";
    case "CLAIM_DECIDED":
      return p.status === "APPROVED"
        ? "Votre demande de quart a été approuvée"
        : "Votre demande de quart a été refusée";
  }
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatISODateFR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  return `${day}/${month}/${d.getFullYear()}`;
}

/** Human relative date for the bell ("il y a 3 h"). */
export function formatRelativeDate(d: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - d.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "à l'instant";
  if (diffMs < hour) return `il y a ${Math.floor(diffMs / minute)} min`;
  if (diffMs < day) return `il y a ${Math.floor(diffMs / hour)} h`;
  const days = Math.floor(diffMs / day);
  if (days < 7) return `il y a ${days} j`;
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

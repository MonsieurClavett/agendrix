# Research — 012-notifications

## Decision 1 — Single `Notification` table vs per-type tables

**Decision**: Single table with a `type` enum and a `payload Json`.

**Rationale**:
- Three types today, more in the future (shift swap, balance reminders…). One table scales linearly with types.
- Bell queries are `WHERE recipientUserId = ? ORDER BY createdAt DESC LIMIT 10` — uniform across types.
- The application layer parses the payload through a discriminated Zod schema, keeping type safety.

**Alternatives**:
- *Per-type tables*: would require UNION ALL queries for the bell. Joining N tables on every page render is silly.
- *Flat columns (no JSON)*: would force a 30-column table with mostly NULLs.

## Decision 2 — In-transaction vs post-transaction notification creation

**Decision**: In-transaction — the repository function accepts a `tx` and inserts notifications inside the existing `$transaction`.

**Rationale**:
- A rollback of the originating mutation (e.g., overlap rejection on assign) MUST roll back the notifications.
- Prisma's `$transaction` accepts a callback that gives a typed `tx` client — adding `tx.notification.createMany(...)` is one line.

**Alternatives**:
- *Listen on a queue / outbox pattern*: overkill for MVP scale, would introduce eventual consistency.
- *Post-transaction creation*: risks orphan notifications if the action errors AFTER the commit but before the notification insert.

## Decision 3 — Email send synchronous vs async

**Decision**: Synchronous, post-commit, wrapped in `try/catch`, NOT inside the DB transaction.

**Rationale**:
- Resend's API is fast (≈200 ms p50); blocking the action by ~200 ms × N is acceptable at MVP scale (N ≤ 10).
- Wrapping in `try/catch` means a Resend outage or quota error never propagates to the user-facing 500.
- Not inside the transaction: an email is a side effect with the outside world. We never want to "rollback the email" or block the DB commit on Resend latency.

**Alternatives**:
- *Background queue (Bull / Inngest / Trigger.dev)*: deferred to a future phase.
- *fire-and-forget without await*: makes test/dev assertions impossible.

## Decision 4 — Payload shape per type

**Decision**: Discriminated Zod union in `src/lib/notifications.ts`.

```ts
const SHIFT_PUBLISHED = z.object({
  type: z.literal("SHIFT_PUBLISHED"),
  shiftCount: z.number().int().positive(),
  weekStartISO: z.string(),
});
const TIME_OFF_DECIDED = z.object({
  type: z.literal("TIME_OFF_DECIDED"),
  status: z.enum(["APPROVED", "REJECTED"]),
  startDate: z.string(), // ISO date
  endDate: z.string(),
  timeOffType: z.enum(["PAID", "UNPAID", "SICK"]),
});
const CLAIM_DECIDED = z.object({
  type: z.literal("CLAIM_DECIDED"),
  status: z.enum(["APPROVED", "REJECTED"]),
  shiftStartISO: z.string(),
  shiftEndISO: z.string(),
});
const NOTIFICATION_PAYLOAD = z.discriminatedUnion("type", [
  SHIFT_PUBLISHED, TIME_OFF_DECIDED, CLAIM_DECIDED,
]);
```

**Rationale**:
- The discriminator `type` is stored both as the table's enum column AND inside the JSON. Slight duplication, but it makes the union exhaustive on read AND defends against an enum drift between code and DB.
- Render helpers (`renderLabel(notification)`, `renderHref(notification)`) consume the typed union — no `any`.

**Alternatives**:
- *Single flat schema with all optional fields*: loses type safety on render.

## Decision 5 — Bell UI: Server Component + Client dropdown

**Decision**: `NotificationsBell` is a Server Component that fetches `unreadCount` + `latest` in the same query batch. The dropdown is a small Client component that receives those props and handles open/close + mark-read clicks via Server Actions.

**Rationale**:
- The fetch is server-side → no client waterfall.
- Refreshes naturally on every page navigation (server re-renders).
- Mark-read actions revalidate `/` (the root layout) so the bell updates without polling.

**Alternatives**:
- *Fully client with `useEffect` poll*: extra request budget for no real benefit.
- *Push via SSE*: deferred to a real-time future phase.

## Decision 6 — Email template registry

**Decision**: A single `sendNotificationEmail(notification)` function in `src/lib/email.ts` that switches on `notification.type` to render the right subject + body. Reuses the existing dev fallback.

**Rationale**:
- Keeping the email rendering close to the notification rendering avoids the divergence between in-app and email copy.
- Three small inline French HTML strings — no template engine.

**Alternatives**:
- *MJML / React Email*: overkill for three templates.

## Open items

None.

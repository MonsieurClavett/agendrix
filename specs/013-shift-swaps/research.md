# Research — 013-shift-swaps

Phase 0 of `/speckit-plan`.

## Decision 1 — Status enum granularity

**Decision**: 6-value enum `SwapStatus { PENDING_PEER PENDING_MANAGER APPROVED REJECTED_BY_PEER REJECTED_BY_MANAGER CANCELED_BY_PROPOSER }`.

**Rationale**:
- Distinguishing the rejecter at the type level (peer vs manager) lets the UI render the right copy without a switch on a separate column.
- `CANCELED_BY_PROPOSER` is its own terminal state — different audit semantics from rejected.
- Six values is small enough to fit in a SQL enum cleanly.

**Alternatives**:
- *Two columns (`status` + `rejectedBy`)*: more SQL surface for the same information.
- *Free-form string*: loses DB-level safety + introduces typos.

## Decision 2 — Partial unique indexes for engagement

**Decision**: Two partial unique indexes — one on `(proposerShiftId) WHERE status IN ('PENDING_PEER','PENDING_MANAGER')`, one on `(targetShiftId)` with the same filter.

**Rationale**:
- Enforces "a shift is engaged in at most one active swap" at the DB layer.
- Two concurrent propositions touching the same shift can't both succeed — the second `INSERT` fails fast on `P2002`.
- Excluding terminal statuses means a fresh proposition is allowed after a previous swap settles.

**Alternatives**:
- *App-layer probe*: race-prone.
- *Full unique on shiftId*: would forbid re-proposing after a rejection.

## Decision 3 — Atomic permutation in `approveSwap`

**Decision**: All checks + both `Shift.update` calls + the status flip + notification inserts live inside one `db.$transaction(async (tx) => …)`.

**Rationale**:
- Phase 11's notification pattern already runs creates inside the originating transaction.
- The "no partial swap visible" guarantee (SC-003) requires it.
- The two overlap probes also run on `tx`, so a concurrent `createShift` against either employee's calendar is serialized correctly via the transaction's isolation level.

**Alternatives**:
- *Optimistic two-step + rollback compensation*: hard to reason about, defeats SC-003.

## Decision 4 — Extending the notification payload union

**Decision**: Add four new Zod schemas to `NotificationPayloadSchema` (the discriminated union from Phase 11):

```ts
const SWAP_PROPOSED = z.object({
  type: z.literal("SWAP_PROPOSED"),
  swapId: z.string(),
  proposerName: z.string().nullable(),
  proposerShiftStartISO: z.string(),
  targetShiftStartISO: z.string(),
});
const SWAP_ACCEPTED_BY_PEER = z.object({
  type: z.literal("SWAP_ACCEPTED_BY_PEER"),
  swapId: z.string(),
  peerName: z.string().nullable(),
});
const SWAP_REJECTED_BY_PEER = z.object({
  type: z.literal("SWAP_REJECTED_BY_PEER"),
  swapId: z.string(),
  peerName: z.string().nullable(),
  reason: z.string().nullable(),
});
const SWAP_DECIDED_BY_MANAGER = z.object({
  type: z.literal("SWAP_DECIDED_BY_MANAGER"),
  swapId: z.string(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().nullable(),
});
```

Plus four new lucide icons mapped in `renderNotificationIcon` (or the existing fallback if not specifically chosen).

**Rationale**:
- Mirrors Phase 7+11 pattern — each event has its own type with explicit payload shape.
- Stable href: `/echanges?focus=<swapId>` for all four.

**Alternatives**:
- *Single `SWAP_EVENT` type with an inner enum*: would push the discriminator down into the payload, defeating the discriminated-union approach we already use.

## Decision 5 — UI location for the propose action

**Decision**: A "Proposer un échange" item inside the existing `ShiftDialog`. Visible only when `shift.employeeId === ctx.userId` AND `shift.status === "PUBLISHED"`. Clicking opens a new `ProposeSwapDialog`.

**Rationale**:
- Discoverable — users already know where to click on a shift.
- Doesn't pollute the calendar grid with extra icons.
- The dialog can show the right context (this is YOUR shift, here's who can be your peer).

**Alternatives**:
- *Right-click context menu*: discoverability cost.
- *Sidebar wizard*: too heavyweight for a 4-field form.

## Decision 6 — Engagement badge on calendar

**Decision**: When a shift's id is in the `pendingSwapShiftIds: Set<string>` passed to `ShiftBlock`, render a small "Échange" pill (similar style to the existing "Brouillon" badge but in a blue accent).

**Rationale**:
- Quick visual cue without taking screen space.
- Re-uses the existing badge slot in `ShiftBlock` (top-left, where "Brouillon" lives in Phase 8).

**Alternatives**:
- *Border tint*: conflicts with the position accent color (Phase 5).
- *Full overlay*: too aggressive.

## Open items

None.

# Server Action Contracts — 013-shift-swaps

Phase 1 of `/speckit-plan`. Five Server Actions on top of one repository.

## Repository: `src/lib/repositories/shiftSwap.ts`

### `ShiftSwapRow` type

```ts
type ShiftSwapRow = {
  id: string;
  companyId: string;
  proposerUserId: string;
  proposerShiftId: string;
  targetUserId: string;
  targetShiftId: string;
  proposerMessage: string | null;
  status: SwapStatus;
  peerDecidedAt: Date | null;
  peerRejectionReason: string | null;
  managerDecidedAt: Date | null;
  managerDecidedByUserId: string | null;
  managerRejectionReason: string | null;
  createdAt: Date;
  proposerUser: { id: string; name: string | null; email: string };
  targetUser:   { id: string; name: string | null; email: string };
  proposerShift: { id: string; startsAt: Date; endsAt: Date; employeeId: string | null; status: ShiftStatus };
  targetShift:   { id: string; startsAt: Date; endsAt: Date; employeeId: string | null; status: ShiftStatus };
};
```

### `listSwapsForUser(ctx)`

Returns:
```ts
{
  proposed: ShiftSwapRow[]; // proposerUserId === ctx.userId
  incoming: ShiftSwapRow[]; // targetUserId === ctx.userId AND status = PENDING_PEER
  managerPending: ShiftSwapRow[]; // ctx.role === "MANAGER" AND status = PENDING_MANAGER (else [])
}
```

Each list is filtered by `companyId = ctx.companyId` and ordered by `createdAt desc`. `incoming` excludes terminal statuses (the user already saw those in `proposed` if they were the proposer, or via past notifications otherwise).

### `listPendingSwapShiftIds(ctx)`

Returns a `Set<string>` of every `proposerShiftId` and `targetShiftId` involved in a `PENDING_PEER` or `PENDING_MANAGER` swap of `ctx.companyId`. Drives the calendar "Échange" badge.

### `proposeSwap(ctx, input)` — inside `$transaction`

`input: { proposerShiftId, targetUserId, targetShiftId, proposerMessage: string | null }`.

1. Look up both shifts by id + `companyId`. Throw `SHIFT_NOT_FOUND` if either is missing.
2. Verify `proposerShift.employeeId === ctx.userId` AND `proposerShift.status === "PUBLISHED"`. Throw `NOT_PROPOSER_SHIFT` / `NOT_PUBLISHED`.
3. Verify `targetShift.employeeId === input.targetUserId` AND `targetShift.status === "PUBLISHED"`. Throw `NOT_TARGET_SHIFT` / `NOT_PUBLISHED`.
4. Verify `ctx.userId !== input.targetUserId`. Throw `SAME_USER`.
5. Insert with `status = PENDING_PEER`. Catch Prisma P2002 (partial unique) → `SHIFT_ALREADY_ENGAGED`.
6. Emit `SWAP_PROPOSED` notification for `targetUserId` via `createNotificationsInTx`.
7. Return the row + the recipient email/name for the post-commit email send.

### `peerDecide(ctx, swapId, decision, reason?)` — inside `$transaction`

`decision: "ACCEPT" | "REJECT"`.

1. Look up the swap with `(id, companyId, status: "PENDING_PEER")`. Throw `NOT_FOUND` otherwise.
2. Verify `swap.targetUserId === ctx.userId`. Throw `FORBIDDEN`.
3. Update status to `PENDING_MANAGER` (accept) or `REJECTED_BY_PEER` (reject) + set `peerDecidedAt`, `peerRejectionReason`.
4. Emit notifications:
   - On accept: `SWAP_ACCEPTED_BY_PEER` to the proposer + one `SWAP_ACCEPTED_BY_PEER` to every active MANAGER of the company (re-route as `SWAP_AWAITING_MANAGER` via a sub-type? — simpler: emit `SWAP_ACCEPTED_BY_PEER` to proposer AND emit `SWAP_PROPOSED` reused for managers? Cleaner: introduce `SWAP_AWAITING_MANAGER` later if needed; for MVP only notify proposer + the action of looking at `/echanges` is the manager's prompt).
   - On reject: `SWAP_REJECTED_BY_PEER` to the proposer.
5. Return the row + the proposer + managers for post-commit email.

**Note**: To keep the type union small in this phase, we emit only the proposer-targeted notifications here. MANAGERs see PENDING_MANAGER swaps in the existing bell badge by virtue of listing `/echanges`. A future polish can add a `SWAP_AWAITING_MANAGER` event.

### `managerDecide(ctx, swapId, decision, reason?)` — inside `$transaction`

`decision: "APPROVE" | "REJECT"`. Requires `ctx.role === "MANAGER"`.

1. Look up the swap with `(id, companyId, status: "PENDING_MANAGER")`. Throw `NOT_FOUND`.
2. Look up both shifts by id + companyId. Throw `SHIFT_NOT_FOUND` if either is missing.
3. Re-verify `proposerShift.employeeId === swap.proposerUserId` AND `targetShift.employeeId === swap.targetUserId`. Throw `STATE_DRIFT` if not.
4. If APPROVE:
   - Overlap probe A: any OTHER shift of the proposer overlapping `targetShift.[startsAt, endsAt)`. Throw `PROPOSER_OVERLAP` on hit.
   - Overlap probe B: any OTHER shift of the target overlapping `proposerShift.[startsAt, endsAt)`. Throw `TARGET_OVERLAP` on hit.
   - Two `tx.shift.update` calls swapping the `employeeId` columns.
5. Update the swap row to `APPROVED` or `REJECTED_BY_MANAGER` + set `managerDecidedAt`, `managerDecidedByUserId`, `managerRejectionReason`.
6. Emit two `SWAP_DECIDED_BY_MANAGER` notifications: one for proposer, one for target.
7. Return the row + both recipients for post-commit emails.

### `cancelSwap(ctx, swapId)` — inside `$transaction`

1. Look up with `(id, companyId)`. Throw `NOT_FOUND`.
2. Verify `swap.proposerUserId === ctx.userId`. Throw `FORBIDDEN`.
3. Verify `status IN ("PENDING_PEER", "PENDING_MANAGER")`. Throw `NOT_CANCELABLE` otherwise.
4. Update status to `CANCELED_BY_PROPOSER`.
5. No notifications (the proposer is the one canceling — no one else needs to be told for MVP).

## Server Actions

### `proposeSwapAction`

**Path**: `src/actions/shiftSwaps/propose.ts`

`requireTenantContext()`. Inputs: `proposerShiftId`, `targetUserId`, `targetShiftId`, `proposerMessage` (≤ 280, optional). Calls `proposeSwap`. Post-commit, fires `sendNotificationEmail` to the target. Returns `{ success: true } | { error: string }`.

### `peerAcceptAction` and `peerRejectAction`

**Paths**: `src/actions/shiftSwaps/peerAccept.ts`, `peerReject.ts`.

`requireTenantContext()`. Inputs: `swapId` (+ `reason` for reject). Each calls `peerDecide`. Post-commit, fires the proposer email.

### `managerDecideAction`

**Path**: `src/actions/shiftSwaps/managerDecide.ts`

`requireManagerContext()`. Inputs: `swapId`, `decision`, `reason?`. Calls `managerDecide`. Post-commit, fires two emails.

### `cancelSwapAction`

**Path**: `src/actions/shiftSwaps/cancel.ts`

`requireTenantContext()`. Inputs: `swapId`. Calls `cancelSwap`.

## Notification payload extension

Add four schemas to `src/lib/notifications.ts`:

```ts
const SWAP_PROPOSED_PAYLOAD = z.object({
  type: z.literal("SWAP_PROPOSED"),
  swapId: z.string(),
  proposerName: z.string().nullable(),
  proposerShiftStartISO: z.string(),
  targetShiftStartISO: z.string(),
});
const SWAP_ACCEPTED_BY_PEER_PAYLOAD = z.object({
  type: z.literal("SWAP_ACCEPTED_BY_PEER"),
  swapId: z.string(),
  peerName: z.string().nullable(),
});
const SWAP_REJECTED_BY_PEER_PAYLOAD = z.object({
  type: z.literal("SWAP_REJECTED_BY_PEER"),
  swapId: z.string(),
  peerName: z.string().nullable(),
  reason: z.string().nullable(),
});
const SWAP_DECIDED_BY_MANAGER_PAYLOAD = z.object({
  type: z.literal("SWAP_DECIDED_BY_MANAGER"),
  swapId: z.string(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().nullable(),
});
```

Plus four branches in `renderNotificationLabel`,
`renderNotificationEmailSubject`, and `renderNotificationHref`
(all four return `/echanges?focus=<swapId>`).

`renderNotificationIcon` (if used) gets four cases (default to `ArrowRightLeft` for any swap-related type).

## Cross-action invariants

- Every notification creation is in-transaction with the originating mutation.
- All email sends are post-commit, wrapped in `try/catch`, never break the action result.
- Every revalidation hits `/echanges` and `/schedules` (the calendar badge needs refresh).
- The atomic permutation in `managerDecide` is the only place `Shift.employeeId` is swapped between two users.

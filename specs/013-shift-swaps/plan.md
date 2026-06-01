# Implementation Plan: Shift Swaps

**Branch**: `013-shift-swaps` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-shift-swaps/spec.md`

## Summary

Add a `ShiftSwap` entity scoped per `Company` with a five-state
lifecycle: `PENDING_PEER` → `PENDING_MANAGER` → `APPROVED` /
`REJECTED_BY_MANAGER` (with side branches `REJECTED_BY_PEER` and
`CANCELED_BY_PROPOSER`). The `approveSwap` Server Action runs
inside a `$transaction` that (a) re-verifies the two shifts still
exist with the expected employees, (b) re-runs overlap probes for
both targets, (c) swaps the two `employeeId` columns, (d) flips
the status to `APPROVED`.

The Phase 11 notification system is extended with four new types:
`SWAP_PROPOSED` (proposer→peer), `SWAP_ACCEPTED_BY_PEER`
(peer→proposer), `SWAP_REJECTED_BY_PEER` (peer→proposer),
`SWAP_DECIDED_BY_MANAGER` (manager→both). All notifications are
emitted inside the originating transaction; emails fire post-commit
with the same try/catch pattern as Phase 11.

One Prisma migration. One new repository (`shiftSwap.ts`). Five
Server Actions (`propose`, `peerAccept`, `peerReject`,
`managerDecide`, `cancel`). One new route `/echanges`. A small
"Échange" badge on `ShiftBlock` and a "Proposer un échange" item
inside the existing `ShiftDialog` for shift owners.

≈32 tasks.

## Technical Context

**Language/Version**: TypeScript (strict) on Next.js 16 — carry-over.

**Primary Dependencies**: no new deps. Reuses Phase 11 notification infrastructure.

**Storage**: One new migration `add_shift_swaps`:
1. Prisma enum `SwapStatus { PENDING_PEER PENDING_MANAGER APPROVED REJECTED_BY_PEER REJECTED_BY_MANAGER CANCELED_BY_PROPOSER }`.
2. Extend `NotificationType` enum with `SWAP_PROPOSED`, `SWAP_ACCEPTED_BY_PEER`, `SWAP_REJECTED_BY_PEER`, `SWAP_DECIDED_BY_MANAGER`.
3. Table `ShiftSwap` with the columns from data-model.md.
4. Partial unique indexes on `(proposerShiftId)` WHERE `status IN ('PENDING_PEER','PENDING_MANAGER')` and `(targetShiftId)` WHERE same filter. Hand-edited SQL (Prisma can't express these declaratively, same pattern as Phase 10).
5. FKs: `companyId → Company` CASCADE, `proposerUserId / targetUserId → User` CASCADE, `proposerShiftId / targetShiftId → Shift` CASCADE, `managerDecidedByUserId → User` SET NULL.

**Testing**: Manual browser smoke (carry-over per Constitution III).

**Target Platform**: Web — same as previous phases.

**Project Type**: Single Next.js project. New files:
`src/lib/repositories/shiftSwap.ts`, `src/actions/shiftSwaps/*`,
`src/app/(dashboard)/echanges/`. Extended: `prisma/schema.prisma`,
`src/lib/notifications.ts` (4 new payload schemas + labels),
`src/lib/email.ts` (new subject lines via existing render machinery),
`src/components/shell/SidebarNav.tsx` (new nav entry "Échanges"),
`src/app/(dashboard)/schedules/_components/ShiftDialog.tsx`
(adds "Proposer un échange" entry visible to the shift owner),
`src/app/(dashboard)/schedules/_components/ShiftBlock.tsx` (small
"Échange" pill when the shift is involved in a PENDING swap),
`src/app/(dashboard)/schedules/page.tsx` (fetches the swap-pending
shift id set), `src/proxy.ts` (protect `/echanges`).

**Performance Goals**:
- `/echanges` page renders < 300 ms for ≤ 50 swaps across the three sections.
- `approveSwap` transaction (re-checks + double overlap probe + 2 updates + 2 notifications + 2 emails) < 600 ms.
- Sidebar bell + swap-badge fetches don't add a measurable hit (one extra `findMany` selecting only `proposerShiftId` and `targetShiftId`).

**Constraints**:
- All Phase 0–11 invariants carry over: tenant isolation, role gating, overlap detection, Phase 8 visibility filter, Phase 11 notification transactional emission.
- The atomic permutation is the load-bearing invariant — every guard must run inside the same `$transaction` as the two `tx.shift.update` calls.
- The peer-accept Server Action MUST verify the actor is the target user (not the proposer); the manager-decide action MUST verify `requireManagerContext`; the cancel action MUST verify the actor is the proposer.
- All notifications use the Phase 11 typed payload pattern.

**Scale/Scope**: ≤ 100 active swaps per company at peak, ≤ 1000 swaps/year per company.

## Constitution Check

| Principle | How this plan satisfies it | Verdict |
|-----------|---------------------------|---------|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | `ShiftSwap` carries `companyId`. All repository reads filter on it. The `proposer ≠ target` rule + the `target.companyId === ctx.companyId` rule prevent cross-tenant proposals at the repository layer. | ✅ PASS |
| **II. SDD** | This plan follows `/speckit-plan`. | ✅ PASS |
| **III. Simplicity First (YAGNI)** | One new entity, one new enum, four added enum members on `NotificationType`. No new dep. No three-party swaps, no auto-approval, no donation flow. | ✅ PASS |
| **IV. Type Safety End-to-End** | `SwapStatus` and the extended `NotificationType` are Prisma-generated. The four new notification payloads extend the discriminated Zod union in `src/lib/notifications.ts`. The repository's `approveSwap` returns a typed result the action consumes. | ✅ PASS |
| **V. Server-Authoritative Authorization** | Each Server Action enforces the right actor: `propose` requires `requireTenantContext` + `proposerUserId === ctx.userId`; `peerAccept`/`peerReject` require `targetUserId === ctx.userId`; `managerDecide` requires `requireManagerContext`; `cancel` requires `proposerUserId === ctx.userId`. All checks live in the repository functions and run inside the transaction. | ✅ PASS |

**Gate verdict**: 5/5 PASS. Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/013-shift-swaps/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/server-actions.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (delta against Phase 11 baseline)

```text
agendrix/
├── prisma/
│   ├── schema.prisma                                # ★ adds SwapStatus + ShiftSwap + extends NotificationType
│   └── migrations/
│       └── <add_shift_swaps>/migration.sql         # ★ new (includes partial uniques + enum add-values)
├── src/
│   ├── proxy.ts                                     # ★ adds "/echanges"
│   ├── app/
│   │   └── (dashboard)/
│   │       ├── echanges/                            # ★ NEW route
│   │       │   ├── page.tsx
│   │       │   └── _components/
│   │       │       ├── MySwapsList.tsx              # proposer view
│   │       │       ├── IncomingSwapsList.tsx        # peer view
│   │       │       ├── ManagerSwapsList.tsx         # manager view
│   │       │       ├── SwapCard.tsx                 # one card
│   │       │       ├── PeerDecideDialog.tsx         # accept / reject (peer)
│   │       │       ├── ManagerDecideDialog.tsx      # approve / reject (manager)
│   │       │       └── CancelSwapDialog.tsx
│   │       └── schedules/
│   │           ├── page.tsx                         # ★ fetches pendingSwapShiftIds set
│   │           └── _components/
│   │               ├── ScheduleView.tsx             # ★ threads pendingSwapShiftIds
│   │               ├── ScheduleCalendar.tsx         # ★ threads
│   │               ├── ShiftBlock.tsx              # ★ tiny "Échange" badge when in set
│   │               ├── ShiftDialog.tsx              # ★ "Proposer un échange" entry for shift owner
│   │               └── ProposeSwapDialog.tsx       # ★ NEW: pick collègue + leur shift
│   ├── actions/
│   │   └── shiftSwaps/
│   │       ├── propose.ts                           # ★ NEW
│   │       ├── peerAccept.ts                        # ★ NEW
│   │       ├── peerReject.ts                        # ★ NEW
│   │       ├── managerDecide.ts                     # ★ NEW (approve OR reject in one action)
│   │       └── cancel.ts                            # ★ NEW
│   ├── components/
│   │   └── shell/
│   │       └── SidebarNav.tsx                       # ★ adds "Échanges" nav entry
│   ├── lib/
│   │   ├── notifications.ts                          # ★ extends payload union with 4 new types
│   │   ├── email.ts                                  # ★ already type-driven, picks up new types automatically
│   │   └── repositories/
│   │       └── shiftSwap.ts                          # ★ NEW: 6 tenant-scoped fns + notification emission inside each transaction
│   └── generated/prisma/                             # regenerated
```

**Structure Decision**: The `/echanges` page is a Server Component
that branches on `ctx.role` to compose three section components.
The MANAGER section is only mounted when `ctx.role === "MANAGER"`.

The "Proposer un échange" entry lives inside the existing
`ShiftDialog`, but is gated on `shift.employeeId === ctx.userId`
AND `shift.status === "PUBLISHED"`. Manager users see the dialog
without the entry — proposing isn't their workflow.

The atomic permutation logic is concentrated in
`approveSwap(ctx, swapId)` inside `src/lib/repositories/shiftSwap.ts`.
The function:
1. Looks up the swap with `findFirst({ where: { id, companyId, status: "PENDING_MANAGER" } })`.
2. Looks up both shifts.
3. Verifies `proposerShift.employeeId === proposerUserId` and `targetShift.employeeId === targetUserId` (state hasn't drifted).
4. Runs two overlap probes — one per assignee in the swapped world (use the existing `Shift.findFirst` overlap pattern).
5. Two `tx.shift.update` calls swapping the `employeeId`.
6. `tx.shiftSwap.update` to flip status.
7. `createNotificationsInTx` for both employees.

The four new notification types extend the Zod discriminated union
in `src/lib/notifications.ts`. The existing render machinery
(`renderNotificationLabel`, `renderNotificationEmailSubject`,
`renderNotificationHref`) gets new branches and the `email.ts`
helper picks them up automatically — no per-type wiring.

## Complexity Tracking

No violations.

## Post-Design Re-Check

After Phase 1 design:

- The five-state enum + side branches keeps the workflow legible. We could have collapsed `REJECTED_BY_PEER` + `REJECTED_BY_MANAGER` into a single `REJECTED` with a reason field, but distinguishing them at the type level makes the UI render cleanly without a string switch.
- The partial unique indexes prevent the "double-booked swap" race at the DB level — if two propositions try to engage the same shift simultaneously, the second one fails fast on insert instead of relying on app-layer probes that could race.
- The 6 repository functions match the 5 Server Actions plus `listSwapsForUser` (for the page). All authorization lives in the repository per the project convention.
- The `/echanges` page fetches three lists in one `Promise.all`. Each list is bounded (status filter + tenant). Total ≤ 150 rows in the worst MVP case.
- Schedules page now fetches one extra small query: `findMany of ShiftSwap where status IN PENDING and companyId, select proposerShiftId + targetShiftId` → builds a `Set<string>` consumed by `ShiftBlock`.
- Email and notifications reuse Phase 11 100%. The only extension is the 4 new payload schemas + 4 new branches in the existing render switches.

Gate remains ✅ PASS.

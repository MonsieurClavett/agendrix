---
description: "Task list for the Shift Swaps feature (Phase 13)"
---

# Tasks: Échanges de shifts

**Input**: Design documents from `/specs/013-shift-swaps/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md. Phases 0–12 MUST be in place.

**Tests**: Manual browser smoke.

## Format

`- [ ] TXXX [P?] [USX?] Description with file path`

---

## Phase 1: Setup

- [X] T001 No new npm dep.

---

## Phase 2: Foundational

### Database

- [X] T002 Update `prisma/schema.prisma`:
  - Add `enum SwapStatus { PENDING_PEER PENDING_MANAGER APPROVED REJECTED_BY_PEER REJECTED_BY_MANAGER CANCELED_BY_PROPOSER }`.
  - Extend `enum NotificationType` with `SWAP_PROPOSED SWAP_ACCEPTED_BY_PEER SWAP_REJECTED_BY_PEER SWAP_DECIDED_BY_MANAGER`.
  - Add `ShiftSwap` model per data-model.md with the 5 named relations: `SwapProposer`, `SwapTarget`, `SwapProposerShift`, `SwapTargetShift`, `SwapManagerDecider`. Plus 3 indexes.
  - Add back-relations on `Company`, `User`, `Shift`.
- [X] T003 Run `npx prisma migrate dev --create-only --name add_shift_swaps`. Hand-edit the SQL to add the two partial unique indexes (`ShiftSwap_proposerShift_active_uniq`, `ShiftSwap_targetShift_active_uniq`) right after the table creation. Re-run `npx prisma migrate dev` to apply.

### Notification payload extension

- [X] T004 [P] Edit `src/lib/notifications.ts`:
  - Add four Zod schemas (`SWAP_PROPOSED_PAYLOAD`, `SWAP_ACCEPTED_BY_PEER_PAYLOAD`, `SWAP_REJECTED_BY_PEER_PAYLOAD`, `SWAP_DECIDED_BY_MANAGER_PAYLOAD`).
  - Extend `NotificationPayloadSchema` discriminated union with the four.
  - Add four branches to `renderNotificationLabel` returning French strings.
  - Add four branches to `renderNotificationEmailSubject` returning French subjects.
  - Add four branches to `renderNotificationHref` returning `/echanges?focus=<swapId>`.

### Repository

- [X] T005 [P] Create `src/lib/repositories/shiftSwap.ts`:
  - `ShiftSwapRow` type.
  - `listSwapsForUser(ctx)` — returns `{ proposed, incoming, managerPending }`.
  - `listPendingSwapShiftIds(ctx)` — returns `Set<string>` of every shift id engaged in a PENDING swap.
  - `proposeSwap(ctx, input)` — transactional, six guards, P2002 → `SHIFT_ALREADY_ENGAGED`, emits one `SWAP_PROPOSED` notification, returns row + target email/name.
  - `peerDecide(ctx, swapId, decision, reason?)` — transactional, status flip, emits `SWAP_ACCEPTED_BY_PEER` or `SWAP_REJECTED_BY_PEER` to proposer, returns row + proposer info.
  - `managerDecide(ctx, swapId, decision, reason?)` — transactional. On APPROVE: re-verify `employeeId` state, two overlap probes, swap the two `Shift.employeeId`. Emits two `SWAP_DECIDED_BY_MANAGER` notifications. Returns row + both recipients.
  - `cancelSwap(ctx, swapId)` — transactional, owner-only, allowed in `PENDING_*`. No notification.

### Proxy + sidebar

- [X] T006 [P] Edit `src/proxy.ts`: add `"/echanges"` to `PROTECTED_PREFIXES` and `"/echanges/:path*"` to `config.matcher`.
- [X] T007 [P] Edit `src/components/shell/SidebarNav.tsx`: add `{ href: "/echanges", label: "Échanges", icon: ArrowRightLeft }` (import `ArrowRightLeft` from `lucide-react`), between "Quarts à combler" and "Équipe", visible to all roles.

**Checkpoint**: schema migrated, payload schemas extended, repo + nav ready.

---

## Phase 3: User Story 1 - Proposer un échange (Priority: P1) 🎯 MVP

**Goal**: An EMPLOYEE creates a `ShiftSwap` from one of their PUBLISHED shifts pointing at a colleague's PUBLISHED shift.

### Server Action

- [X] T008 [P] [US1] Create `src/actions/shiftSwaps/propose.ts`. `requireTenantContext()`. Zod: `proposerShiftId`, `targetUserId`, `targetShiftId`, optional `proposerMessage` (max 280). Call `proposeSwap`. Post-commit, `sendNotificationEmail` to the target inside try/catch. Map errors `SHIFT_NOT_FOUND`, `NOT_PROPOSER_SHIFT`, `NOT_PUBLISHED`, `NOT_TARGET_SHIFT`, `SAME_USER`, `SHIFT_ALREADY_ENGAGED` to French strings. Revalidate `/echanges` + `/schedules`.

### UI

- [X] T009 [P] [US1] Create `src/app/(dashboard)/schedules/_components/ProposeSwapDialog.tsx` (`"use client"`): controlled Dialog. Props: `{ open, onOpenChange, proposerShift, currentUserId, employees, targetableShifts: Map<targetUserId, WeekShift[]> }`. Two selects (peer + their shift) + textarea (message). Submit dispatches `proposeSwapAction`. Toast "Échange proposé." on success.
- [X] T010 [US1] Edit `src/app/(dashboard)/schedules/_components/ShiftDialog.tsx`: when `shift?.employeeId === ctx.userId` AND `shift?.status === "PUBLISHED"` (use a new `currentUserId` prop), render a "Proposer un échange" button at the bottom that opens the `ProposeSwapDialog`. Build the `targetableShifts` map from the existing shifts prop (filter status PUBLISHED, employeeId !== currentUserId).
- [X] T011 [US1] Edit `src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx` and `ScheduleView.tsx` to thread `currentUserId` from the page down to `ShiftDialog`.
- [X] T012 [US1] Edit `src/app/(dashboard)/schedules/page.tsx`: pass `ctx.userId` as `currentUserId` to `ScheduleView`.

### Smoke

- [X] T013 [US1] Smoke: Bob proposes to Carol, confirm row + Carol's notification + email logged.

**US1 checkpoint**: propose flow operational.

---

## Phase 4: User Story 2 - Peer accepts or rejects (Priority: P1)

**Goal**: The target EMPLOYEE accepts (→ PENDING_MANAGER) or rejects (→ REJECTED_BY_PEER) a swap.

### Server Actions

- [X] T014 [P] [US2] Create `src/actions/shiftSwaps/peerAccept.ts`. `requireTenantContext()`. Zod: `swapId`. Call `peerDecide(ctx, swapId, "ACCEPT")`. Post-commit emails. Map `NOT_FOUND`, `FORBIDDEN`.
- [X] T015 [P] [US2] Create `src/actions/shiftSwaps/peerReject.ts`. `requireTenantContext()`. Zod: `swapId`, `reason?` (max 280). Call `peerDecide(ctx, swapId, "REJECT", reason)`. Post-commit emails. Map errors.

### UI

- [X] T016 [P] [US2] Create `src/app/(dashboard)/echanges/_components/PeerDecideDialog.tsx`: confirms accept or reject. Reject branch shows the textarea for the reason. Dispatches the right action.

(Mounting happens in Phase 6 via the page; smoke test in US4.)

---

## Phase 5: User Story 3 - Manager decides (Priority: P1)

**Goal**: MANAGER approves (atomic swap of `employeeId`) or rejects (no shift change).

### Server Action

- [X] T017 [P] [US3] Create `src/actions/shiftSwaps/managerDecide.ts`. `requireManagerContext()`. Zod: `swapId`, `decision: "APPROVE"|"REJECT"`, `reason?` (max 280). Call `managerDecide`. Post-commit, fires two emails. Map `NOT_FOUND`, `SHIFT_NOT_FOUND`, `STATE_DRIFT`, `PROPOSER_OVERLAP`, `TARGET_OVERLAP`.

### UI

- [X] T018 [P] [US3] Create `src/app/(dashboard)/echanges/_components/ManagerDecideDialog.tsx`: same confirm pattern, two-branch reject reason.

(Mounting in Phase 6.)

---

## Phase 6: User Story 4 - Page /echanges + cancel (Priority: P2)

**Goal**: Full UI to consult and manage swaps.

### Server Action

- [X] T019 [P] [US4] Create `src/actions/shiftSwaps/cancel.ts`. `requireTenantContext()`. Zod: `swapId`. Call `cancelSwap`. Map `NOT_FOUND`, `FORBIDDEN`, `NOT_CANCELABLE`. Revalidate.

### UI components

- [X] T020 [P] [US4] Create `src/app/(dashboard)/echanges/_components/SwapCard.tsx`: shared row component. Props: `{ swap, role: "proposer" | "incoming" | "manager", onAct }`. Shows the two shifts (date + time), the two participants, the message, the status badge (variant per status), and an action area populated by `onAct`.
- [X] T021 [P] [US4] Create `src/app/(dashboard)/echanges/_components/CancelSwapDialog.tsx`: confirm + dispatch `cancelSwapAction`.
- [X] T022 [P] [US4] Create `src/app/(dashboard)/echanges/_components/MySwapsList.tsx`: renders the `proposed` list. Each PENDING_* row shows a "Annuler" button opening `CancelSwapDialog`. Terminal rows are read-only.
- [X] T023 [P] [US4] Create `src/app/(dashboard)/echanges/_components/IncomingSwapsList.tsx`: renders the `incoming` list. Each row shows two buttons "Accepter" / "Refuser" opening `PeerDecideDialog`.
- [X] T024 [P] [US4] Create `src/app/(dashboard)/echanges/_components/ManagerSwapsList.tsx`: renders the `managerPending` list. Each row shows two buttons "Approuver" / "Refuser" opening `ManagerDecideDialog`.

### Page

- [X] T025 [US4] Create `src/app/(dashboard)/echanges/page.tsx` (Server Component): `requireTenantContext()`. `const { proposed, incoming, managerPending } = await listSwapsForUser(ctx)`. Render header + three sections (conditionally mount the manager section when `ctx.role === "MANAGER"`). Empty states for each section.

### Calendar badge

- [X] T026 [US4] Edit `src/app/(dashboard)/schedules/page.tsx`: fetch `const pendingSwapShiftIds = await listPendingSwapShiftIds(ctx)`. Thread to `ScheduleView` then `ScheduleCalendar` then `WeekGridDesktop`/`WeekStackedMobile`.
- [X] T027 [US4] Edit `src/app/(dashboard)/schedules/_components/ShiftBlock.tsx`: accept `isInPendingSwap?: boolean`. When true, render a tiny "Échange" badge in the top-left (similar to "Brouillon" badge, but blue accent: `border-blue-500/40 text-blue-600 dark:text-blue-400`).
- [X] T028 [US4] Edit `WeekGridDesktop.tsx` and `WeekStackedMobile.tsx` to pass `isInPendingSwap={pendingSwapShiftIds.has(shift.id)}` to each `ShiftBlock`.

### Smoke

- [X] T029 [US4] Smoke: end-to-end Bob proposes → Carol accepts → Alice approves → shifts are permuted.

**US4 checkpoint**: full UI loop works.

---

## Phase 7: Polish

- [X] T030 [P] Run `npx tsc --noEmit`.
- [X] T031 [P] Run `npm run build`.
- [X] T032 [P] Quickstart smoke (tests 1–9).
- [X] T033 [P] Mark every T0XX as `[X]`.

---

## Dependencies

| From | To |
|------|----|
| T002 → T003 | schema then migration |
| T003 → T004–T007 | migration before code |
| T004, T005 → T008–T019 | helpers + repo before actions |
| T008 → T009 → T010 → T011 → T012 | propose action → dialog → ShiftDialog → propagate |
| T014, T015 → T016 → T023 | peer actions → peer dialog → incoming list |
| T017 → T018 → T024 | manager action → manager dialog → manager list |
| T019 → T021 → T022 | cancel action → cancel dialog → proposed list |
| T020 → T022, T023, T024 | shared card before lists |
| T022, T023, T024 → T025 | lists before page |
| T026 → T027 → T028 | data fetch → block prop → grids |
| Polish last |

## Implementation strategy

- **MVP scope**: T001–T013 (foundation + US1) = 13 tasks. Propose works end-to-end with notification + email.
- **Increment 1 → US2 + US3 (P1)**: 5 more tasks (T014–T018). Peer + manager decisions live, but the UI to trigger them comes with the page.
- **Increment 2 → US4 (P2)**: 11 tasks (T019–T029). The visible workflow.
- **Final**: 4 polish tasks.

**Total**: 33 tasks. MVP = 13.

## Independent test criteria summary

| Story | Independent slice |
|-------|-------------------|
| US1 (P1) | EMPLOYEE proposes a swap; row created; target notified. |
| US2 (P1) | Peer accepts → PENDING_MANAGER + proposer notified. Reject path symmetrical. |
| US3 (P1) | MANAGER approves → atomic permutation + double notifications. Reject path symmetrical. |
| US4 (P2) | `/echanges` page renders three role-aware sections; cancel works; calendar badge appears. |

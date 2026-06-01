---
description: "Task list for the Open Shifts feature (Phase 9)"
---

# Tasks: Quarts à combler

**Input**: Design documents from `/specs/010-open-shifts/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md. Phases 0–8 MUST be in place.

**Tests**: Manual browser smoke.

## Format

`- [ ] TXXX [P?] [USX?] Description with file path`

---

## Phase 1: Setup

- [X] T001 No new npm dependency. (`UserX` icon comes from `lucide-react`.)

---

## Phase 2: Foundational

### Database

- [X] T002 Update `prisma/schema.prisma`:
  - Make `Shift.employeeId` optional (`String?`) and the relation `employee User?`. Keep `onDelete: Restrict` for non-null FK.
  - Add `enum ClaimStatus { PENDING APPROVED REJECTED }`.
  - Add `ShiftClaim` model per data-model.md (3 named-relations: `company`, `employee` named `"ShiftClaimRequester"`, `decidedBy` named `"ShiftClaimDecider"`), with `@@unique([shiftId, employeeId])`, `@@index([companyId, status])`, `@@index([shiftId])`.
  - Add back-relations on `Company` (`shiftClaims`), `User` (`shiftClaims` requester + `shiftDecisions` decider), `Shift` (`claims`).
- [X] T003 Run `npx prisma migrate dev --name add_open_shifts_and_claims`. Verify the SQL drops NOT NULL on `Shift.employeeId`, creates the enum, the table, the unique index, the two extra indexes, and the four FKs.

### Existing Shift action updates

- [X] T004 [P] Edit `src/actions/shifts/create.ts`: change Zod for `employeeId` to allow empty string. Pre-normalize empty string → null. Pass to the now-extended `createShift(ctx, { employeeId: string | null, … })`.
- [X] T005 [P] Edit `src/actions/shifts/update.ts`: same change.
- [X] T006 Edit `src/lib/repositories/shift.ts`:
  - Update `ShiftRow` type so `employeeId: string | null` and `employee: { … } | null`.
  - Update `createShift(ctx, data)`: `data.employeeId: string | null`. Skip employee resolution when null. Skip the overlap probe when null (no employee = nothing to clash with).
  - Update `updateShift(ctx, shiftId, data)`: same. When transitioning from null to non-null, the overlap check on the NEW employee runs as usual; when transitioning to null, the check is skipped.

### Repository: ShiftClaim

- [X] T007 [P] Create `src/lib/repositories/shiftClaim.ts` with the surface in contracts/server-actions.md:
  - `ClaimRow` type.
  - `listClaimsForEmployee(ctx, targetEmployeeId, opts?: { statusIn })`.
  - `listClaimsForShift(ctx, shiftId)` (MANAGER-only).
  - `countPendingClaimsForCompany(ctx)` (MANAGER-only).
  - `createClaim(ctx, shiftId)`.
  - `cancelClaim(ctx, claimId)`.
  - `assignOpenShift(ctx, shiftId, chosenClaimId)` — the only complex transaction.

### Repository: open shift listing

- [X] T008 [P] Add `listOpenShiftsForCompanyWeek(ctx, range)` to `src/lib/repositories/shift.ts`. EMPLOYEE callers see only PUBLISHED open shifts; MANAGER sees all open shifts (any status).

### Proxy / sidebar

- [X] T009 [P] Edit `src/proxy.ts`: add `"/quarts-a-combler"` to `PROTECTED_PREFIXES` and `"/quarts-a-combler/:path*"` to the matcher.
- [X] T010 [P] Edit `src/components/shell/SidebarNav.tsx`: add `{ href: "/quarts-a-combler", label: "Quarts à combler", icon: ShieldQuestion }` (use `Megaphone` or similar — pick a lucide icon not already used; suggest `UserPlus`). Visible to all roles, between "Congés" and "Équipe".

### Calendar type propagation

- [X] T011 Edit `src/app/(dashboard)/schedules/_components/types.ts`: `employeeId` becomes `string | null`; `employee` becomes `{ id; name; isActive } | null`. Adjust any usage downstream.

**Checkpoint**: schema migrated, repository + actions updated for nullable employee, sidebar + proxy ready.

---

## Phase 3: User Story 1 - MANAGER creates open shifts (Priority: P1) 🎯 MVP

**Goal**: A MANAGER can create a shift without selecting an employee. It appears on the MANAGER calendar in a dedicated "Quarts à combler" row.

**Independent Test**: MANAGER creates a shift with no employee → it shows in a dedicated row; EMPLOYEEs don't see it on their own calendar.

### Dialog change

- [X] T012 [US1] Edit `src/app/(dashboard)/schedules/_components/ShiftDialog.tsx`:
  - Make the employee `<select>` accept an empty option (`<option value="">Quart à combler</option>`).
  - Submit empty string when "Quart à combler" is chosen; the action normalizes to null.
  - When editing an open shift (`shift?.employeeId === null`), preselect the empty option.

### Calendar visual

- [X] T013 [US1] Edit `src/app/(dashboard)/schedules/_components/WeekGridDesktop.tsx` (EmployeeGrid sub-component): if there are shifts with `employeeId === null`, render an extra row at the TOP labeled "Quarts à combler" with a `UserX` icon as the avatar. The row uses `DropCell id="${dayISO}|open"` (drop-target disabled in Phase 9 to avoid an accidental "unassign" via drag). The cards in this row use the existing `ShiftBlock` but `showEmployeeName` is omitted.
- [X] T014 [US1] Edit `src/app/(dashboard)/schedules/_components/ShiftBlock.tsx`: when `shift.employeeId === null`, render the card with a distinct visual cue: a small `UserX` icon (top-left, alongside the existing "Brouillon" badge if applicable) and the text label "Quart à combler" replacing the position name when the position is null OR adding it.

### Smoke

- [X] T015 [US1] Smoke: create an open shift; confirm visual + invisibility to the EMPLOYEE.

**US1 checkpoint**: open shifts can be created and are visible only to MANAGERs (and only in their dedicated row).

---

## Phase 4: User Story 2 - EMPLOYEE claims an open shift (Priority: P2)

**Goal**: An EMPLOYEE sees the public list `/quarts-a-combler` and can submit / cancel a claim.

### Server Actions

- [X] T016 [P] [US2] Create `src/actions/openShifts/createClaim.ts`. `requireTenantContext()`. Zod: `shiftId: z.string().min(1)`. Map errors per contracts/server-actions.md. Revalidate `/quarts-a-combler` and `/schedules`.
- [X] T017 [P] [US2] Create `src/actions/openShifts/cancelClaim.ts`. `requireTenantContext()`. Zod: `claimId: z.string().min(1)`. Map errors. Revalidate.

### UI

- [X] T018 [P] [US2] Create `src/app/(dashboard)/quarts-a-combler/_components/ClaimShiftDialog.tsx` (`"use client"`): controlled confirm Dialog with `{ open; onOpenChange; shiftId; summary }`. Submit dispatches `createClaimAction`. Toast "Demande envoyée." on success.
- [X] T019 [P] [US2] Create `src/app/(dashboard)/quarts-a-combler/_components/CancelClaimDialog.tsx`: confirm. Dispatch `cancelClaimAction`. Toast "Demande annulée.".
- [X] T020 [P] [US2] Create `src/app/(dashboard)/quarts-a-combler/_components/OpenShiftCard.tsx`: card UI showing date, hours, position, and either:
  - a "Je veux ce quart" button (when `myClaim === null`), OR
  - a status badge (`PENDING → "Demande envoyée"`, `APPROVED → "Demande approuvée"`, `REJECTED → "Demande refusée"`) plus, if PENDING, a "Annuler ma demande" small button.
  - When the EMPLOYEE has no claim, optionally show the off-availability warning (Phase 6) by computing `isShiftOffAvailability` against their availability ranges (which are not fetched here for simplicity — skip in Phase 9 if it adds too much plumbing; mention in spec/quickstart).
- [X] T021 [US2] Create `src/app/(dashboard)/quarts-a-combler/_components/OpenShiftsList.tsx`: client wrapper. Props: `{ openShifts: WeekShift[]; myClaimByShift: Record<string, ClaimRow> }`. Renders one `OpenShiftCard` per shift sorted by date. Holds dialog state.
- [X] T022 [US2] Create `src/app/(dashboard)/quarts-a-combler/page.tsx` (Server Component): `requireTenantContext()`. Fetch the current week range (default today). `Promise.all([listOpenShiftsForCompanyWeek(ctx, range), listClaimsForEmployee(ctx, ctx.userId)])`. Build `myClaimByShift`. Render `<OpenShiftsList>`. (Week navigation deferred to a polish task if time permits.)

### Smoke

- [X] T023 [US2] Smoke: claim a shift as Bob, see "Demande envoyée" badge, cancel it, see button reappear.

**US2 checkpoint**: EMPLOYEE side of the workflow is operational.

---

## Phase 5: User Story 3 - MANAGER attributes an open shift to a claim (Priority: P2)

**Goal**: From the open shift's edit dialog, a MANAGER picks a winner. The transaction assigns the shift, approves the winner, rejects others.

### Server Action

- [X] T024 [P] [US3] Create `src/actions/openShifts/assignOpenShift.ts`. `requireManagerContext()`. Zod: `shiftId`, `claimId` strings. Call `assignOpenShift(ctx, shiftId, claimId)`. Map `NOT_FOUND`, `NOT_OPEN`, `CLAIM_NOT_FOUND`, `ASSIGNEE_OVERLAP` (`"Cet employé a déjà un shift qui chevauche cette plage."`). Revalidate `/schedules` and `/quarts-a-combler`.

### UI

- [X] T025 [P] [US3] Create `src/app/(dashboard)/schedules/_components/AssignClaimDialog.tsx` (`"use client"`): controlled Dialog with `{ open; onOpenChange; shiftId; claimId; assigneeName; summary }`. Confirms "Attribuer ce quart à {assigneeName} ? Les autres demandes seront refusées." Submit dispatches `assignOpenShiftAction`. Toast "Quart attribué.".
- [X] T026 [US3] Edit `src/app/(dashboard)/schedules/_components/ShiftDialog.tsx`: when `shift?.employeeId === null` AND `shift?.status === "PUBLISHED"`, render a "Demandes" section below the form with `props.claims` (a new prop containing `ClaimRow[]` for this shift). For each PENDING claim show a row with employee name and a "Attribuer" button (opens `AssignClaimDialog`). For decided claims show their badge. Empty state: "Aucune demande pour le moment.".
- [X] T027 [US3] Edit `src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx` and `ScheduleView.tsx`: thread a `claimsByShift: Map<string, ClaimRow[]>` prop down to `ShiftDialog`. Pass an empty array when no claims exist for a given shift.
- [X] T028 [US3] Edit `src/app/(dashboard)/schedules/page.tsx`: when `isManager`, fetch `const allClaims = await listClaimsForCompanyOpenShifts(ctx)` (new helper that lists claims for all open shifts of the company), group by `shiftId`. Pass to ScheduleView. Also fetch `pendingClaimsCount = await countPendingClaimsForCompany(ctx)` to feed the filter-panel badge.
- [X] T029 [US3] Edit `src/app/(dashboard)/schedules/_components/FilterPanel.tsx`: show `pendingClaimsCount` as a small badge in the existing "Quarts à combler" section.

### Smoke

- [X] T030 [US3] Smoke: 2 EMPLOYEEs claim → MANAGER attributes to one → shift is assigned, winner approved, others rejected, EMPLOYEE side reflects accurately.

**US3 checkpoint**: MANAGER side of the workflow is operational.

---

## Phase 6: Polish

- [X] T031 [P] Run `npx tsc --noEmit`.
- [X] T032 [P] Run `npm run build`.
- [X] T033 [P] Quickstart smoke pass (tests 1–7).
- [X] T034 [P] Mark every T0XX as `[X]`.

---

## Dependencies

| From | To |
|------|----|
| T002 → T003 | schema then migration |
| T003 → T004…T010 | migration before code using the new types |
| T006 → T007, T008, T011 | shift repo first |
| T007 → T016, T017, T024 | claim repo before claim actions |
| T011 → T012, T013, T014 | type changes before UI |
| T016, T017 → T018, T019, T020, T021 | actions before claim UI |
| T020, T021 → T022 | components before page |
| T024 → T025, T026 | assign action before its dialog |
| T026 → T027 → T028 | thread prop chain |
| T024 → T030 | smoke at the end of US3 |
| Polish last |

## Implementation strategy

- **MVP scope**: T001 + T002–T011 + T012–T015 = 15 tasks. Open shifts can be created and are visible to MANAGER only. Repository + actions ready for US2/US3.
- **Increment 1 → US2**: 8 more tasks (T016–T023). Public list + claim/cancel.
- **Increment 2 → US3**: 7 more tasks (T024–T030). Attribute + reject peers atomically.
- **Final**: 4 polish tasks.

**Total**: 34 tasks. MVP = 15 tasks.

## Independent test criteria summary

| Story | Independent slice |
|-------|-------------------|
| US1 (P1) | MANAGER creates a shift without employee; appears in a dedicated row; invisible to EMPLOYEEs. |
| US2 (P2) | EMPLOYEE submits and cancels a claim from `/quarts-a-combler`. |
| US3 (P2) | MANAGER attributes a shift to a chosen claim atomically; peers rejected. |

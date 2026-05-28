---
description: "Task list for the Weekly Schedules feature (Phase 2)"
---

# Tasks: Weekly Schedules

**Input**: Design documents from `/specs/003-schedules/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md. Phase 0 and Phase 1 MUST be in place (merged or branched-from).

**Tests**: The Phase 2 spec did NOT request automated tests. Per Constitution III, the testing posture is manual smoke (`quickstart.md`). No test tasks below.

**Organization**: Tasks are grouped by user story for independent implementation and testing.

## Format

`- [X] TXXX [P?] [USX?] Description with file path`

- `[P]` = different files, can run in parallel
- `[USx]` = required on user-story tasks only
- Setup, Foundational, Polish: no `[USx]` label

## Path Conventions

Single Next.js project — paths relative to `Agendrix/` root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Phase 2 introduces no new dependencies. The setup phase is a single confirmation task.

- [X] T001 Confirm no new `npm install` is needed for Phase 2 (date helpers are written in-repo per `research.md` Decision 3). If `package.json` shows a stale lockfile after branch switching, run `npm install` once to sync.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema migration, week helper, proxy update, repository layer. ALL user stories depend on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Database

- [X] T002 Update `prisma/schema.prisma`: add a `Shift` model with fields `id (cuid)`, `companyId (FK Company, onDelete: Cascade)`, `employeeId (FK User, onDelete: Restrict)`, `startsAt DateTime`, `endsAt DateTime`, `note String?`, `createdAt`, `updatedAt`. Add `@@index([companyId, startsAt])` and `@@index([employeeId, startsAt])`. Also add the back-relations `shifts Shift[]` to `Company` and `User`.
- [X] T003 Generate migration: `npx prisma migrate dev --name add_shift`. Verify the SQL creates the table + the two indexes + the two FKs with the correct ON DELETE rules.

### Pure date helper (no new dep)

- [X] T004 [P] Create `src/lib/week.ts` exporting: `type WeekRange = { start: Date; end: Date }`; `mondayOfWeek(d: Date): Date` (sets to the Monday 00:00 of the ISO week containing `d`); `addDays(d: Date, n: number): Date`; `weekRangeFrom(monday: Date): WeekRange` (start = monday, end = Sunday 23:59:59.999); `toISODate(d: Date): string` (YYYY-MM-DD); `parseWeekParam(raw: string | undefined, fallback: Date): WeekRange` (parses a YYYY-MM-DD; on invalid input falls back to the Monday of `fallback`). Pure functions, no IO, fully typed.

### Tenant-scoped repository (the load-bearing layer — Principle I)

- [X] T005 Create `src/lib/repositories/shift.ts` exporting `listShiftsForCompanyWeek(ctx, range)`, `listShiftsForUserWeek(ctx, userId, range)`, `createShift(ctx, { employeeId, startsAt, endsAt, note })`, `updateShift(ctx, shiftId, { employeeId, startsAt, endsAt, note })`, `deleteShift(ctx, shiftId)`. Read queries select `{ id, employeeId, startsAt, endsAt, note, employee: { select: { id, name, isActive } } }`. Create + update wrap an employee-belongs-to-tenant lookup AND a half-open-interval overlap check inside `db.$transaction`; throw `EMPLOYEE_NOT_FOUND`, `OVERLAP`, or `NOT_FOUND` as documented in `contracts/server-actions.md`.

### Proxy + dashboard nav

- [X] T006 [P] Edit `src/proxy.ts`: extend `PROTECTED_PREFIXES` and `config.matcher` to include `/schedules/:path*`.
- [X] T007 [P] Edit `src/app/(dashboard)/layout.tsx`: add a nav link "Horaires" → `/schedules` visible to ALL authenticated users (no role gate this time).

**Checkpoint**: schema migrated, week helper ready, proxy and dashboard updated, repository in place. User story implementation can begin.

---

## Phase 3: User Story 1 - Create a shift (Priority: P1) 🎯 MVP

**Goal**: A MANAGER can open `/schedules` (current week) and add a new shift; it appears immediately in the week view.

**Independent Test**: Sign in as MANAGER, open `/schedules`, click "Ajouter un shift", fill the form for an active employee with valid date/start/end, save, see the new shift on the right day in the week view. See `quickstart.md` SC-001.

### Implementation for User Story 1

- [X] T008 [P] [US1] Create `src/actions/shifts/create.ts` `createShiftAction(prev, formData)`. Begin with `await requireManagerContext()`. Zod schema: `employeeId .min(1)`, `date` matching `YYYY-MM-DD`, `start` and `end` matching `HH:mm` and not equal, `note` optional ≤ 280. Build `startsAt` = `date + start`, `endsAt` = `date + end`; if `endsAt <= startsAt` add 24 h (midnight-crossing rule per `research.md` Decision 1). Call `createShift(ctx, ...)`. Catch `EMPLOYEE_NOT_FOUND` → "Employé introuvable."; `OVERLAP` → "Un autre shift de cet employé chevauche déjà cette plage horaire." `revalidatePath("/schedules")`. Return `{ success: true }`.
- [X] T009 [P] [US1] Create `src/app/(dashboard)/schedules/_components/ShiftDialog.tsx` (`"use client"`): a Dialog containing the create form. Accept props `{ employees: { id, name }[]; defaultDate: string }`. Use `useActionState(createShiftAction, initial)`. Render a `<select name="employeeId">` populated from `employees` (active list), a `<input type="date" name="date" defaultValue={defaultDate}>`, `<input type="time" name="start">`, `<input type="time" name="end">`, `<textarea name="note" maxLength={280}>`. On `state.success`, close the dialog + `router.refresh()`. Surface `state.error` and `state.fieldErrors`.
- [X] T010 [P] [US1] Create `src/app/(dashboard)/schedules/_components/WeekGrid.tsx`: client component receiving `{ shifts: Shift[]; range: WeekRange; canMutate: boolean }`. For each of the 7 days in `range`, render a section with the day label and the day's shifts (filter by `startsAt` falling on that day, using the SHIFT's start date). If a day has no shifts → "Aucun shift" placeholder. Each shift line shows assignee name (with "désactivé" Badge when `!employee.isActive`), time range "HH:mm–HH:mm" (formatted from `startsAt`/`endsAt` in local time; if it spans next day, suffix " (+1)"), and the note if present. When `canMutate`, also wire per-shift Edit and Delete affordances — for US1 these can be no-op or simply absent; US2 wires them.
- [X] T011 [US1] Create `src/app/(dashboard)/schedules/page.tsx`: async Server Component. `const ctx = await requireTenantContext();`. Read `searchParams.week` and resolve `range` via `parseWeekParam`. If `ctx.role === "MANAGER"`: fetch `users = await listUsersInCompany(ctx)` AND `shifts = await listShiftsForCompanyWeek(ctx, range)`. Render: heading "Horaires", week label (e.g. "Semaine du 8 juin 2026"), an "Ajouter un shift" trigger that opens `ShiftDialog` (passing `employees=users` and `defaultDate=toISODate(range.start)`), and `<WeekGrid shifts={shifts} range={range} canMutate={true} />`. (Branching for EMPLOYEE happens in US3.)
- [ ] T012 [US1] Manual smoke per quickstart.md SC-001: open `/schedules`, add a shift for an active employee today 11:00–15:00 with a note, verify it appears in the right day column.

**Checkpoint**: US1 functional. A MANAGER can create shifts and see them on the current week.

---

## Phase 4: User Story 2 - Weekly view + edit + delete (Priority: P2)

**Goal**: A MANAGER can navigate prev/next week, click a shift to edit it, click delete to remove it (after confirm).

**Independent Test**: With several shifts created across days and employees, the MANAGER opens `/schedules`, uses prev/next nav, edits one shift (time + employee swap), deletes another. See `quickstart.md` US2 + SC-004 + SC-005.

### Implementation for User Story 2

- [X] T013 [P] [US2] Create `src/actions/shifts/update.ts` `updateShiftAction(prev, formData)`. Same shape as create but takes a `shiftId` hidden input. Calls `updateShift(ctx, shiftId, ...)`. Catch `NOT_FOUND` → "Shift introuvable.", `EMPLOYEE_NOT_FOUND` and `OVERLAP` as in create.
- [X] T014 [P] [US2] Create `src/actions/shifts/delete.ts` `deleteShiftAction(prev, formData)`. Begin with `requireManagerContext()`. Zod schema: `shiftId .min(1)`. Call `deleteShift(ctx, shiftId)`. Catch `NOT_FOUND` → "Shift introuvable." `revalidatePath("/schedules")`. Return `{ success: true }`.
- [X] T015 [US2] Extend `ShiftDialog.tsx` to support edit mode. Add optional prop `shift?: { id, employeeId, startsAt, endsAt, note }`. When provided, the dialog title becomes "Modifier le shift", form `defaultValue`s come from the shift, an `<input type="hidden" name="shiftId">` is included, and the Server Action is `updateShiftAction` instead of `createShiftAction` (the component picks one based on `shift` presence). Also extend the `employees` prop to optionally include the currently-assigned-but-deactivated employee so they remain selectable.
- [X] T016 [P] [US2] Create `src/app/(dashboard)/schedules/_components/DeleteShiftDialog.tsx` (`"use client"`): a small Dialog that shows the shift summary and a confirm/cancel pair. Form posts to `deleteShiftAction` with the hidden `shiftId`. On `state.success`, close + `router.refresh()`.
- [X] T017 [US2] Extend `WeekGrid.tsx` (or its child `ShiftRow`): when `canMutate`, each shift row gets two affordances — "Modifier" opens `ShiftDialog` with the shift prop, "Supprimer" opens `DeleteShiftDialog`. When `!canMutate` (EMPLOYEE view in US3), no affordances render.
- [X] T018 [P] [US2] Create `src/app/(dashboard)/schedules/_components/WeekNav.tsx`: client component receiving `{ range: WeekRange }`. Renders three Buttons as `<Link>`s: "Semaine précédente" → `/schedules?week=YYYY-MM-DD` (Monday of prev week), "Cette semaine" → `/schedules` (current default), "Semaine suivante" → next Monday. Also displays the week label "Semaine du {date}".
- [X] T019 [US2] Wire `WeekNav` into `schedules/page.tsx` (between the heading and the WeekGrid).
- [ ] T020 [US2] Manual smoke per quickstart.md US2 + SC-004 + SC-005: create 2 shifts, edit one (change time + reassign employee), delete one. Test back-to-back accepted, overlap rejected, midnight-crossing overlap rejected. Click prev/next 12 times and confirm URL updates each time.

**Checkpoint**: US1 + US2 work. Full MANAGER scheduling workflow operational.

---

## Phase 5: User Story 3 - Employee self-view (Priority: P3)

**Goal**: A signed-in EMPLOYEE sees the same week view but filtered to their own shifts only, with no mutation affordances.

**Independent Test**: With shifts existing for at least two employees of the same company, the EMPLOYEE signs in and opens `/schedules`. They see only their own shifts, no "Add shift" button, no edit/delete affordances. They can still navigate prev/next week. See `quickstart.md` US3 (SC-002, SC-003, SC-007).

### Implementation for User Story 3

- [X] T021 [US3] Update `src/app/(dashboard)/schedules/page.tsx` to branch on `ctx.role`. For EMPLOYEE: fetch `shifts = await listShiftsForUserWeek(ctx, ctx.userId, range)`, do NOT fetch `users`, do NOT render the "Ajouter un shift" button, and pass `canMutate={false}` to `WeekGrid`. The page heading can adapt ("Mes horaires" vs "Horaires de l'équipe"). WeekNav still renders for both roles.
- [ ] T022 [US3] Manual smoke per quickstart.md US3 + SC-002 + SC-003 + SC-007: as the MANAGER, create shifts for two different employees in the same week. Sign in as one of those employees, open `/schedules`. Confirm only their own shifts are visible, no mutation affordances. Try to invoke `createShiftAction` programmatically (from devtools console) with a crafted FormData — confirm the action throws. Deactivate that employee, sign in as a MANAGER, verify their past shifts still appear (with "désactivé" badge), and the employee dropdown of the create dialog no longer lists them.

**Checkpoint**: All three user stories functional. Phase 2 feature complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T023 [P] Run `npx tsc --noEmit`. Fix any TypeScript errors.
- [X] T024 [P] Run `npm run dev`. Visit `/`, `/login`, `/signup`, `/dashboard`, `/team`, `/schedules` as both a MANAGER and an EMPLOYEE. Confirm no runtime errors in the dev console.
- [ ] T025 Walk through every smoke step in `quickstart.md` (SC-001 → SC-007 + edge cases) end-to-end with the dev server live.
- [X] T026 Stage and commit the Phase 2 work in five SDD-narrative commits on the `003-schedules` branch:
   - `[Spec Kit] Add specification` — spec.md + checklist
   - `[Spec Kit] Add implementation plan` — plan.md + research.md + data-model.md + contracts/ + quickstart.md + CLAUDE.md
   - `[Spec Kit] Add tasks` — tasks.md
   - `[Spec Kit] Implementation progress` — schema migration + all `src/` changes
   - `[Spec Kit] Mark T027 complete (branch pushed)` — after push
- [X] T027 Push the branch: `git push -u origin 003-schedules`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: trivial; runs immediately.
- **Foundational (Phase 2)**: depends on Setup. **BLOCKS all user stories.** Within Phase 2: T002→T003 sequential (migration depends on schema edit); T004/T006/T007 are [P]; T005 stands alone.
- **US1 → US2 → US3**: each depends on Phase 2. Within a story, [P] tasks can run in parallel.
- **Polish (Phase 6)**: depends on whichever user stories you want to ship.

### Within Each User Story

- T008/T009/T010 [P] for US1 then T011 then T012 (smoke).
- T013/T014/T016/T018 [P] for US2 then T015/T017/T019 (file edits) then T020 (smoke).
- T021 then T022 (smoke) for US3.

### Same-file sequencing

- T015 + T017 both extend `ShiftDialog.tsx` / `WeekGrid.tsx`. Combine into one edit pass per file (or write the final form once with all branches).
- T021 reuses `schedules/page.tsx` from T011 — write the final role-aware version directly during US3 implementation.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2 → foundation ready.
2. Phase 3 (US1) → MANAGER can create + see today's shifts. MVP shipped.

### Incremental Delivery

1. Setup + Foundational → ready.
2. + US1 → create works.
3. + US2 → full week navigation + edit + delete.
4. + US3 → employees see their own week.
5. + Polish → typecheck + smoke + commits + push.

### Solo Developer Strategy (this project)

Sequential. Inside each story, batch [P] tasks into a single edit pass.
Do not skip manual smoke tasks.

---

## Notes

- `[P]` = different files, no dependency on incomplete tasks.
- `[Story]` label maps tasks to a user story.
- Each user story should be independently completable and testable from Phase-1-shipped baseline.
- Commit narrative mirrors Phase 0 / 1: spec → plan → tasks → implementation.
- The constitutional load-bearing piece (Principle I) extends to Shift: a grep at the end of T024 should confirm `db.shift.*` calls live ONLY in `src/lib/repositories/shift.ts`.

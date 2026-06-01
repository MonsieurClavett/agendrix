---
description: "Task list for the Publish Workflow feature (Phase 8)"
---

# Tasks: Publication brouillon/publié

**Input**: Design documents from `/specs/009-publish-workflow/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md. Phases 0–7 MUST be in place.

**Tests**: Manual browser smoke.

## Format

`- [ ] TXXX [P?] [USX?] Description with file path`

---

## Phase 1: Setup

- [X] T001 No new npm dependency for Phase 8.

---

## Phase 2: Foundational

### Database

- [X] T002 Update `prisma/schema.prisma`:
  - Add `enum ShiftStatus { DRAFT PUBLISHED }`.
  - Add `status ShiftStatus @default(DRAFT)` to `Shift`.
  - Add `@@index([companyId, status])`.
- [X] T003 Generate the migration with `npx prisma migrate dev --create-only --name add_shift_status`. Then hand-edit `prisma/migrations/<add_shift_status>/migration.sql` to insert, between the `ALTER TABLE` and the `CREATE INDEX`, this backfill statement: `UPDATE "Shift" SET "status" = 'PUBLISHED';`. Re-run `npx prisma migrate dev` to apply.

### Repository layer

- [X] T004 [P] Extend `src/lib/repositories/shift.ts`:
  - Add `status: true` to `shiftSelect`.
  - Update the `ShiftRow` type to include `status: "DRAFT" | "PUBLISHED"` (use the Prisma-generated `ShiftStatus` type).
  - Modify `listShiftsForUserWeek(ctx, userId, range)` to add `status: "PUBLISHED"` to the `where` clause. `listShiftsForCompanyWeek` stays unchanged.
  - Add `countDraftsForCompanyWeek(ctx, range): Promise<number>` using `db.shift.count({ where: { companyId: ctx.companyId, status: "DRAFT", startsAt: { lt: range.end }, endsAt: { gt: range.start } } })`.
  - Add `publishDraftsForWeek(ctx, range): Promise<{ count: number }>` using `db.shift.updateMany` with the same `where` shape, setting `status: "PUBLISHED"`.
  - Add `unpublishShift(ctx, shiftId): Promise<void>` using `db.shift.updateMany({ where: { id, companyId: ctx.companyId, status: "PUBLISHED" }, data: { status: "DRAFT" } })`. If `result.count === 0` throw `NOT_FOUND`.

**Checkpoint**: schema migrated, repository layer enforces the new filter.

---

## Phase 3: User Story 1 - DRAFT invisible aux EMPLOYEEs + visuel brouillon (Priority: P1) 🎯 MVP

**Goal**: New shifts are DRAFT by default and are invisible to EMPLOYEEs while showing a distinctive style on the MANAGER calendar.

**Independent Test**: MANAGER creates a shift → he sees it with "Brouillon" badge + dashed border + reduced opacity. The EMPLOYEE assigned sees nothing.

### Type propagation

- [X] T005 [US1] Edit `src/app/(dashboard)/schedules/_components/types.ts`: add `status: "DRAFT" | "PUBLISHED"` to `WeekShift`.

### Calendar visuals

- [X] T006 [US1] Edit `src/app/(dashboard)/schedules/_components/ShiftBlock.tsx`:
  - Compute `const isDraft = shift.status === "DRAFT"`.
  - Add the conditional classes `isDraft && "opacity-70 border-dashed"` to the card.
  - Render a small `<Badge variant="outline" className="text-[10px] py-0 px-1">Brouillon</Badge>` in the top-left corner (separate from the warning glyphs in the top-right).

### Smoke

- [X] T007 [US1] Run the dev server. Create a shift as MANAGER and verify the visual. Sign in as the assigned EMPLOYEE and verify the shift is invisible.

**US1 checkpoint**: new shifts default to DRAFT; EMPLOYEEs cannot see them; MANAGER sees the brouillon style.

---

## Phase 4: User Story 2 - Publier la semaine (Priority: P2)

**Goal**: A MANAGER publishes every DRAFT shift in the visible week in one transaction via a toolbar button.

### Server Action

- [X] T008 [P] [US2] Create `src/actions/shifts/publishWeek.ts` exporting `publishWeekAction(prev, formData)`. `requireManagerContext()`. Zod: `weekStart: z.string()`. Derive `range = parseWeekParam(weekStart, new Date())`. Call `publishDraftsForWeek(ctx, range)`. Return `{ success: true, count }`. `revalidatePath("/schedules")`.

### UI

- [X] T009 [P] [US2] Create `src/app/(dashboard)/schedules/_components/PublishWeekDialog.tsx` (`"use client"`): controlled Dialog with `{ open; onOpenChange; draftCount; weekStartISO; weekLabel }`. Body: "Publier {draftCount} shifts pour la semaine du {weekLabel} ?". Submit form dispatches `publishWeekAction` with `weekStart` hidden field. Toast `${result.count} shifts publiés.` on success.
- [X] T010 [US2] Edit `src/app/(dashboard)/schedules/_components/ScheduleToolbar.tsx`: accept a new prop `draftCount: number`. Render a new `Button` "Publier la semaine" with the count badge (e.g. "Publier la semaine (3)") between the "Aujourd'hui" navigation and the "Nouveau shift" action. Disabled when `draftCount === 0`. Clicking opens a controlled `PublishWeekDialog`.
- [X] T011 [US2] Edit `src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx`: accept `draftCount: number` and pass to `ScheduleToolbar`.
- [X] T012 [US2] Edit `src/app/(dashboard)/schedules/_components/ScheduleView.tsx`: accept `draftCount: number` and pass to `ScheduleCalendar`.
- [X] T013 [US2] Edit `src/app/(dashboard)/schedules/page.tsx`: when `isManager`, fetch `const draftCount = await countDraftsForCompanyWeek(ctx, range)` in parallel with the other queries. Pass to `<ScheduleView>`. EMPLOYEE branch passes `draftCount={0}`.

### Smoke

- [X] T014 [US2] Smoke: create 3 DRAFT shifts, click "Publier la semaine (3)", confirm. Verify 3 shifts publish and EMPLOYEEs now see them.

**US2 checkpoint**: bulk publish works; idempotent; cross-tenant safe.

---

## Phase 5: User Story 3 - Dépublier un shift (Priority: P3)

**Goal**: A MANAGER reverses a single PUBLISHED shift back to DRAFT from the edit dialog.

### Server Action

- [X] T015 [P] [US3] Create `src/actions/shifts/unpublish.ts` exporting `unpublishShiftAction(prev, formData)`. `requireManagerContext()`. Zod: `shiftId: z.string().min(1)`. Call `unpublishShift(ctx, shiftId)`. Map `NOT_FOUND` → "Shift introuvable ou déjà brouillon.". Revalidate.

### UI

- [X] T016 [US3] Edit `src/app/(dashboard)/schedules/_components/ShiftDialog.tsx`: when `shift?.status === "PUBLISHED"` and `onDeleteRequest` is defined (the MANAGER edit case), render an extra `Button variant="ghost"` labeled "Dépublier" next to the "Supprimer" button. The button is a small `<form action={unpublishAction}>` with a hidden `shiftId`. On success: toast "Shift dépublié." and close the dialog.

### Smoke

- [X] T017 [US3] Smoke: open a PUBLISHED shift, click "Dépublier". Verify it acquires the DRAFT visual and disappears for the EMPLOYEE.

**US3 checkpoint**: single-shift status reversal works.

---

## Phase 6: Polish

- [X] T018 [P] Run `npx tsc --noEmit`.
- [X] T019 [P] Run `npm run build`.
- [X] T020 [P] Run the full quickstart smoke (tests 1–6).
- [X] T021 [P] Mark all T0XX as `[X]` in this file.

---

## Dependencies

| From | To |
|------|----|
| T002 → T003 | schema then migration |
| T003 → T004 | migration before repository |
| T004 → T005 | repo type before propagation |
| T005, T004 → T006, T007 | type + repo before US1 visual |
| T004 → T008 | repo before publish action |
| T008, T009 → T010 → T011 → T012 → T013 | action + dialog before toolbar before propagation chain |
| T004 → T015 → T016 → T017 | repo, action, dialog edit, smoke |
| All US3 → Phase 6 polish |

## Implementation strategy

- **MVP scope**: T001 + T002–T004 + T005–T007 = 7 tasks. DRAFTs are invisible to EMPLOYEEs and visually distinct for MANAGERs.
- **Increment 1 → US2**: 7 more tasks (T008–T014). Bulk publish.
- **Increment 2 → US3**: 3 more tasks (T015–T017). Unpublish.
- **Final**: 4 polish tasks.

**Total**: 21 tasks. MVP = 7 tasks.

## Independent test criteria summary

| Story | Independent slice |
|-------|-------------------|
| US1 (P1) | New shifts default to DRAFT; invisible to EMPLOYEE; "Brouillon" visual on MANAGER calendar. |
| US2 (P2) | "Publier la semaine" bulk-publishes all DRAFT shifts of the visible week; idempotent. |
| US3 (P3) | A MANAGER reverses a single PUBLISHED shift to DRAFT. |

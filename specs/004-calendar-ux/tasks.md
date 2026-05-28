---
description: "Task list for the Calendar UX Overhaul feature (Phase 3)"
---

# Tasks: Calendar UX Overhaul

**Input**: Design documents from `/specs/004-calendar-ux/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md. Phases 0–2 MUST be in place.

**Tests**: Manual browser smoke (carry-over per Constitution III). Spec did not request automated tests.

**Organization**: Tasks are grouped by user story for independent implementation and testing.

## Format

`- [X] TXXX [P?] [USX?] Description with file path`

- `[P]` = different files, can run in parallel
- `[USx]` = required on user-story tasks only
- Setup, Foundational, Polish phases: no `[USx]` label

## Path Conventions

Single Next.js project — paths relative to `Agendrix/` root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install the three new client libraries.

- [X] T001 Install Phase 3 deps: `npm install sonner next-themes @dnd-kit/core`. Confirm versions in `package.json` lock to recent stable releases.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Theme provider + toaster mount + theme cookie reader. Shared infrastructure used by ALL three user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Theme infrastructure

- [X] T002 [P] Create `src/lib/theme.ts` exporting `async function getServerTheme(): Promise<"light" | "dark" | null>` that reads `cookies().get("agendrix-theme")?.value` from `next/headers` and returns the value if it is `"light"` or `"dark"`, else `null`. Used by `src/app/layout.tsx` to apply the initial `<html className="dark">` attribute before the body renders, eliminating FOUC.
- [X] T003 [P] Create `src/components/theme/ThemeProvider.tsx` (`"use client"`): default export a wrapper around `next-themes`' `ThemeProvider` configured with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `storageKey="agendrix-theme"`, `disableTransitionOnChange`.
- [X] T004 [P] Create `src/components/theme/ThemeToggle.tsx` (`"use client"`): uses `useTheme()` from next-themes. Renders a small icon Button (sun in light mode, moon in dark mode, via lucide-react). On click, calls `setTheme(theme === "dark" ? "light" : "dark")`. Defends against SSR mismatch with the `mounted` pattern: render a transparent placeholder Button of the right size until `useEffect` flips `mounted` to true.

### Root layout integration

- [X] T005 Update `src/app/layout.tsx`: import `ThemeProvider`, `Toaster` (from `sonner`), and `getServerTheme`. Read the cookie in the async layout; pass `className={cookie === "dark" ? "dark" : ""}` and `suppressHydrationWarning` to `<html>`. Wrap `{children}` in `<ThemeProvider>`. Mount `<Toaster richColors position="top-right" closeButton />` once inside `<body>` (after children).

### Dashboard header integration

- [X] T006 Update `src/app/(dashboard)/layout.tsx`: import `ThemeToggle` from `@/components/theme/ThemeToggle` and insert it into the header's action group between the nav links and the `LogoutButton`.

**Checkpoint**: theme system live across the app, toaster mounted, ready for the schedule UX rebuild.

---

## Phase 3: User Story 1 - Visual calendar grid (Priority: P1) 🎯 MVP

**Goal**: Replace the Phase 2 list view at `/schedules` with a true grid (desktop) + clean stacked view (mobile). No drag-and-drop yet — that lands in US2.

**Independent Test**: A MANAGER with employees and shifts opens `/schedules` on desktop and sees a 7-column grid with employee rows and positioned shift blocks. Resizing under 768 px reflows to a stacked vertical list. See `quickstart.md` US1.

### Implementation for User Story 1

- [X] T007 [P] [US1] Create `src/app/(dashboard)/schedules/_components/ShiftBlock.tsx` (`"use client"`): renders one shift as a colored block. Props: `{ shift, canDrag?: boolean, onClick?: () => void }`. For US1, `canDrag` is unused — just renders a block with the time label and (if height allows) the note. Click handler stays empty for now (US2 will wire it to open ShiftDialog). Computes its own `top` and `height` style from the shift's `startsAt`/`endsAt` against a `--hour-height` CSS variable. Uses Badge variants for visual differentiation.
- [X] T008 [P] [US1] Create `src/app/(dashboard)/schedules/_components/DropCell.tsx` (`"use client"`): a relatively-positioned `<div>` representing one (day, employee) cell. Props: `{ day, employeeId, children }`. For US1, just renders a tall empty `<div>` with `position: relative` so its children (`<ShiftBlock>`s) can be absolutely positioned. US2 will add the `useDroppable` hook.
- [X] T009 [P] [US1] Create `src/app/(dashboard)/schedules/_components/WeekGridDesktop.tsx` (`"use client"`): renders a CSS Grid with `grid-template-columns: 160px repeat(7, 1fr)` (first col for employee labels, 7 day cols). Headers row: empty corner cell + 7 day labels with formatted dates. Body rows: one per employee, with the employee name (+ "désactivé" Badge if applicable) on the left, then 7 `<DropCell>`s. Inside each cell, filter shifts by start-day and assignee, render them as `<ShiftBlock>`s. CSS variable `--hour-height: 64px` controls row height; total row height = 24 × hour height (scrollable).
- [X] T010 [P] [US1] Create `src/app/(dashboard)/schedules/_components/WeekStackedMobile.tsx` (`"use client"`): vertical stack of 7 day sections (clone of the Phase 2 WeekGrid look but with refreshed typography: larger day headers, tighter shift rows, hover states). Click on a row opens the existing edit dialog when `canMutate`.
- [X] T011 [US1] Create `src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx` (`"use client"`): orchestrator. Props: `{ shifts, range, employees, canMutate, currentUserId }`. Renders both `<WeekGridDesktop>` and `<WeekStackedMobile>` as siblings, controlling visibility with Tailwind responsive classes (`hidden md:block` for desktop, `md:hidden` for mobile). For US1, the desktop component is NOT wrapped in `<DndContext>` yet — US2 will add that.
- [X] T012 [US1] Update `src/app/(dashboard)/schedules/page.tsx`: replace the existing `<WeekGrid>` import + usage with `<ScheduleCalendar>`. Drop the old `WeekGrid` component file (T010 replaces it via the stacked component).
- [ ] T013 [US1] Manual smoke per quickstart.md US1: load `/schedules` as MANAGER on a wide window — confirm grid renders with employee rows and shifts positioned by time. Shrink window below 768 px — confirm stacked view. Add a shift via the (existing) dialog — confirm it appears in the right grid cell on next render.

**Checkpoint**: US1 functional. The schedules page LOOKS like a real calendar.

---

## Phase 4: User Story 2 - Drag-and-drop reassignment (Priority: P2)

**Goal**: A MANAGER on desktop can drag a shift block from one (day, employee) cell to another to reassign it, with optimistic UI, server commit, overlap rollback, and toast feedback.

**Independent Test**: A MANAGER on desktop picks up a shift and drops it on a different cell — the block moves visually instantly, then a green toast confirms persistence. An overlap-triggering drop snaps back with a red toast. See `quickstart.md` US2.

### Implementation for User Story 2

- [X] T014 [P] [US2] Update `src/app/(dashboard)/schedules/_components/DropCell.tsx`: wire `useDroppable({ id: \`${dayISO}|${employeeId}\` })`. Apply `ref` and a hover style (e.g., bg-accent/30 when `isOver`).
- [X] T015 [P] [US2] Update `src/app/(dashboard)/schedules/_components/ShiftBlock.tsx`: when `canDrag === true`, wrap the block rendering with `useDraggable({ id: shift.id, data: shift })`. Apply `ref`, `style={{ transform }}`, and `listeners` / `attributes` from the hook. When dragging, increase opacity / z-index. When `!canDrag`, render exactly as in US1 (no drag wiring).
- [X] T016 [US2] Update `src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx`: when `canMutate`, wrap `<WeekGridDesktop>` in `<DndContext>` with sensors `[useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor)]`. Hold `useOptimistic` against the `shifts` prop with a reducer that handles `{ type: "move", shiftId, toDate, toEmployeeId }`. The `onDragEnd` handler: parses `over.id` → `{ toDate, toEmployeeId }`; if same as source, no-op; otherwise dispatch optimistic move, build a FormData with all the existing shift fields except updated `date` + `employeeId`, call `updateShiftAction(initial, formData)`; on `state.success`, `toast.success("Shift déplacé.")` (the action already calls `revalidatePath` so the next render will reset optimistic state to authoritative); on `state.error`, `toast.error(state.error)` (the React-19 rerender from `revalidatePath` will also revert optimistic state on failure since the authoritative shifts haven't changed).
- [X] T017 [US2] Update `src/app/(dashboard)/schedules/_components/ShiftBlock.tsx` again: hook up an `onClick` handler that opens an `EditShiftDialog` wrapper (or pass through to a parent-supplied `onEdit(shift)` callback). Important: `onClick` should NOT fire when the user just finished a drag — dnd-kit's `PointerSensor` with `activationConstraint.distance: 4` ensures a click without movement doesn't trigger a drag, but the inverse (a real drag should suppress the click) needs handling: detect via dnd-kit's `isDragging` flag and short-circuit the click handler.
- [ ] T018 [US2] Manual smoke per quickstart.md US2: drag a shift to a new cell — confirm green toast + persistence. Drag onto an overlap — confirm red toast + rollback. Press Escape mid-drag — confirm cancel. Sign in as EMPLOYEE and confirm dragging does nothing.

**Checkpoint**: US1 + US2 work. Full drag-and-drop scheduling experience is live.

---

## Phase 5: User Story 3 - Polish bundle (Priority: P3)

**Goal**: Toasts on every mutation; empty state with illustration.

(Theme toggle is already done in Phase 2 foundational because every user story benefits from it. The "polish" bundle in user-story terms is the toasts + empty state.)

**Independent Test**: Every shift create / edit / delete / drag triggers a toast (green or red). A week with no shifts shows the empty-state card with an illustration and (for MANAGER) an "Add shift" CTA. See `quickstart.md` US3.

### Implementation for User Story 3

- [X] T019 [P] [US3] Update `src/app/(dashboard)/schedules/_components/ShiftDialog.tsx`: after `state.success` on create, call `toast.success("Shift créé.")`; on edit, call `toast.success("Shift mis à jour.")`. On `state.error`, call `toast.error(state.error)`. The dialog still closes on success as before.
- [X] T020 [P] [US3] Update `src/app/(dashboard)/schedules/_components/DeleteShiftDialog.tsx`: on `state.success`, call `toast.success("Shift supprimé.")`; on error, `toast.error(state.error)`.
- [X] T021 [P] [US3] Create `src/app/(dashboard)/schedules/_components/EmptyWeekCard.tsx`: a centered Card with an inline SVG calendar illustration (~50 lines, currentColor-based so it works in both themes). Props: `{ canMutate, onAddShift?: () => void }`. Text: "Aucun shift cette semaine." When `canMutate`, includes a primary Button "Ajouter un shift" that calls `onAddShift`.
- [X] T022 [US3] Update `src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx`: when `shifts.length === 0`, render `<EmptyWeekCard>` INSTEAD of the desktop grid and the mobile stack. Pass `onAddShift={() => /* open ShiftDialog */}` when `canMutate`; the dialog state is already lifted in this component for US2.
- [ ] T023 [US3] Manual smoke per quickstart.md US3: trigger create / edit / delete / drag, confirm green toasts. Trigger an overlap, confirm red toast. Click theme toggle, confirm immediate flip and persistence across reload + sign-out + sign-in. Navigate to an empty week, confirm the empty-state card.

**Checkpoint**: All three user stories functional. Phase 3 feature complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T024 [P] Run `npx tsc --noEmit` — fix any TypeScript errors introduced (especially around the dnd-kit data prop typing and `useOptimistic` reducer).
- [X] T025 [P] Run `npm run dev`. Visit `/`, `/login`, `/signup`, `/dashboard`, `/team`, `/schedules` as MANAGER and EMPLOYEE in both light and dark themes. Confirm no console errors.
- [ ] T026 Walk through every smoke step in `quickstart.md` (US1 + US2 + US3 + Accessibility keyboard drag + Mobile stacked) end-to-end with the dev server live.
- [X] T027 Commit the Phase 3 work in five SDD-narrative commits on the `004-calendar-ux` branch:
   - `[Spec Kit] Add specification` — spec.md + checklist
   - `[Spec Kit] Add implementation plan` — plan.md + research.md + data-model.md + contracts/ + quickstart.md + CLAUDE.md
   - `[Spec Kit] Add tasks` — tasks.md
   - `[Spec Kit] Implementation progress` — all `src/` changes + package.json/package-lock.json
   - `[Spec Kit] Mark T028 complete (branch pushed)` — after push
- [ ] T028 Push: `git push -u origin 004-calendar-ux`.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2)** → **US1** → **US2** → **US3** → **Polish (Phase 6)**.
- US1, US2, US3 can technically be implemented in parallel by multiple devs after Phase 2, but US2 modifies files US1 created (`ShiftBlock`, `DropCell`, `ScheduleCalendar`), so doing them sequentially is the only sane path for a solo dev.
- Phase 2's T002/T003/T004 are [P] (different files). T005 depends on them. T006 depends on T004.
- Inside each US, [P] tasks can be written in one edit pass per file.

---

## Implementation Strategy

### MVP First

1. Phase 1 + Phase 2 → toaster + theme live.
2. Phase 3 (US1) → calendar grid replaces list. Already a huge visible win.
3. Stop and demo. The grid alone makes the product feel 10× more like Agendrix.

### Incremental Delivery

1. + US2 → drag-and-drop. Killer feature.
2. + US3 → toasts + empty state. Polish.
3. + Phase 6 → typecheck + smoke + commits + push.

### Solo Dev Strategy (this project)

Sequential. Don't try to skip US1 — US2 directly depends on the components it creates. After Phase 2 the dark-mode toggle works app-wide; that's a satisfying mid-phase checkpoint.

---

## Notes

- `[P]` = different files, no dep on incomplete tasks.
- `[Story]` maps tasks to user story.
- Each US should be independently completable + testable from a Phase-2-shipped baseline.
- No new Server Action introduced — drag-and-drop reuses `updateShiftAction` from Phase 2. The grep "no `db.shift.*` outside `src/lib/repositories/shift.ts`" rule from Phase 2 carries over and MUST still hold.

---
description: "Task list for the Positions feature (Phase 5)"
---

# Tasks: Positions

**Input**: Design documents from `/specs/006-positions/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md. Phases 0–4 MUST be in place.

**Tests**: Manual browser smoke (carry-over per Constitution III).

**Organization**: Tasks grouped by user story.

## Format

`- [X] TXXX [P?] [USX?] Description with file path`

---

## Phase 1: Setup

- [X] T001 Phase 5 introduces no new npm dependency. Skip install. (`positions.ts` palette is pure TS; FilterPanel/Dialog reuse existing shadcn primitives.)

---

## Phase 2: Foundational

**Purpose**: schema migration, color palette, repository layer, sidebar nav. Shared by all three user stories.

### Database

- [X] T002 Update `prisma/schema.prisma`:
  - Add a new `Position` model: `id String @id @default(cuid())`, `companyId String`, `company Company @relation(fields:[companyId], references:[id], onDelete: Cascade)`, `name String`, `color String`, `shifts Shift[]`, `createdAt`, `updatedAt`, `@@unique([companyId, name])`, `@@index([companyId])`.
  - Add a `positions Position[]` back-relation to the `Company` model.
  - Add `positionId String?` and `position Position? @relation(fields:[positionId], references:[id], onDelete: SetNull)` to the `Shift` model. Add `@@index([positionId])`.
- [X] T003 Run `npx prisma migrate dev --name add_positions`. Verify the SQL creates the `Position` table with the unique index, adds the nullable `Shift.positionId` column with `ON DELETE SET NULL`, and creates the new index on `Shift.positionId`.

### Color palette helper

- [X] T004 [P] Create `src/lib/positions.ts` exporting:
  - `POSITION_COLORS` — a `const` object mapping palette keys (`"teal" | "coral" | "amber" | "green" | "blue" | "purple" | "magenta" | "red"`) to `{ swatch: string; accent: string; bg: string; fg: string }` OKLCH values (light + dark friendly).
  - `POSITION_COLOR_KEYS` — `Object.keys(POSITION_COLORS) as const`.
  - `getPositionColor(key: string)` — returns the palette entry, falling back to a neutral one if the key is unknown.

### Repository layer

- [X] T005 [P] Create `src/lib/repositories/position.ts` exporting:
  - `listPositionsForCompany(ctx)` — returns positions of `ctx.companyId` ordered by name.
  - `createPosition(ctx, { name, color })` — wraps a transaction: (a) lowercase + trim the name; (b) check for existing position with same lowercase name in the company (throw `DUPLICATE` on hit); (c) insert with `companyId: ctx.companyId`. Catches Prisma P2002 as `DUPLICATE`.
  - `updatePosition(ctx, positionId, { name, color })` — transactional: (a) tenant-scoped lookup (throw `NOT_FOUND` if not found); (b) check lowercase-name uniqueness against OTHER positions of the company (`id: { not: positionId }`) — throw `DUPLICATE` on collision; (c) update.
  - `deletePosition(ctx, positionId)` — `deleteMany({ where: { id, companyId } })`; if `count === 0` throw `NOT_FOUND`. FK SET NULL handles the shift fan-out.
- [X] T006 Extend `src/lib/repositories/shift.ts`:
  - Extend the `shiftSelect` constant to include `position: { select: { id: true, name: true, color: true } }`.
  - Update the exported `ShiftRow` type to include `position: { id, name, color } | null`.
  - Extend `createShift(ctx, data)` signature: `data: { employeeId, startsAt, endsAt, note, positionId: string | null }`. Inside the transaction, if `positionId !== null`, run `tx.position.findFirst({ where: { id: positionId, companyId: ctx.companyId } })` — throw `POSITION_NOT_FOUND` on miss. Persist `positionId` on create.
  - Extend `updateShift(ctx, shiftId, data)` the same way.

### Sidebar nav

- [X] T007 [P] Edit `src/components/shell/SidebarNav.tsx`: add a 4th entry to `NAV_ITEMS` after "Équipe": `{ href: "/positions", label: "Positions", icon: TagIcon, managerOnly: true }` (import `TagIcon` from lucide-react).

**Checkpoint**: schema migrated, palette + repository + nav in place. User-story work can begin.

---

## Phase 3: User Story 1 - Position CRUD (Priority: P1) 🎯 MVP

**Goal**: MANAGER can create, rename, recolor, and delete positions of their company from a dedicated page.

**Independent Test**: Sign in as MANAGER → sidebar shows "Positions" → page lists positions (empty initially) → add "Service" teal, "Cuisine" amber → rename one → delete one → all changes reflected.

### Implementation for User Story 1

- [X] T008 [P] [US1] Create `src/actions/positions/create.ts` `createPositionAction(prev, formData)`. `requireManagerContext()`. Zod: `name z.string().min(1).max(40)`, `color z.enum(POSITION_COLOR_KEYS)`. Call `createPosition(ctx, { name: name.trim(), color })`. Map `DUPLICATE` → "Une position avec ce nom existe déjà." `revalidatePath("/positions")` + `revalidatePath("/schedules")`. Return `{ success: true }`.
- [X] T009 [P] [US1] Create `src/actions/positions/update.ts` `updatePositionAction(prev, formData)`. Same shape with `positionId` hidden field. Map `NOT_FOUND` → "Position introuvable." and `DUPLICATE` like above.
- [X] T010 [P] [US1] Create `src/actions/positions/delete.ts` `deletePositionAction(prev, formData)`. `requireManagerContext()`. Zod: `positionId z.string().min(1)`. Call `deletePosition(ctx, positionId)`. Map `NOT_FOUND` → "Position introuvable." Revalidate.
- [X] T011 [P] [US1] Create `src/app/(dashboard)/positions/_components/PositionDialog.tsx` (`"use client"`): controlled Dialog (`open`/`onOpenChange` props) with form for name + color picker. Color picker = a row of swatch buttons (one per `POSITION_COLOR_KEYS` entry) using `getPositionColor(key).swatch` as `backgroundColor`; clicking selects (visual ring). Hidden `color` input syncs the selection. Optional `position?: { id, name, color }` prop switches between create and edit modes (same pattern as `ShiftDialog`). Uses `toast.success("Position créée.")` / `toast.success("Position mise à jour.")` on success.
- [X] T012 [P] [US1] Create `src/app/(dashboard)/positions/_components/DeletePositionDialog.tsx` (`"use client"`): controlled confirm Dialog. Body text mentions that affected shifts will simply lose their position tag (not be deleted). Calls `deletePositionAction`; toast on success.
- [X] T013 [US1] Create `src/app/(dashboard)/positions/_components/PositionsList.tsx` (`"use client"`): renders positions as a list of Cards (one per position): big color swatch on the left, name + small "0 shift" or "N shifts" count, edit + delete buttons on the right (each opens the matching dialog with controlled state). Props: `{ positions, shiftCountsByPositionId }`.
- [X] T014 [US1] Create `src/app/(dashboard)/positions/page.tsx`: async Server Component. `await requireManagerContext()` (if the user is EMPLOYEE → `redirect("/dashboard?error=forbidden")`). Fetch positions via `listPositionsForCompany(ctx)`. Compute a per-position shift count via a small repo helper or via `db.shift.groupBy({ by: ['positionId'], where: { companyId: ctx.companyId, positionId: { not: null } }, _count: true })`. Render heading "Positions" + "Ajouter une position" Button + `<PositionsList />`. Empty state when zero positions: card with the same "Ajouter" CTA.
- [ ] T015 [US1] Manual smoke per quickstart.md US1: as MANAGER, create / rename / recolor / delete positions; try a duplicate name; sign in as EMPLOYEE → confirm sidebar lacks "Positions" and `/positions` redirects to dashboard.

**Checkpoint**: US1 functional. The MANAGER can manage positions.

---

## Phase 4: User Story 2 - Tag shifts + colored pills on cards (Priority: P2)

**Goal**: shifts gain an optional position; the create / edit form shows a position picker; cards display a colored accent + the position's name.

**Independent Test**: With positions existing, MANAGER creates a new shift tagged "Service" → card on calendar shows colored accent + "Service" instead of "Quart". Editing changes the accent. Drag preserves the position.

### Implementation for User Story 2

- [X] T016 [P] [US2] Extend `src/actions/shifts/create.ts` `createShiftAction`: Zod schema add `positionId: z.string().optional()`. Coerce `""` or `undefined` to `null`. Pass `positionId` to `createShift(ctx, ...)`. Map `POSITION_NOT_FOUND` → "Position introuvable."
- [X] T017 [P] [US2] Extend `src/actions/shifts/update.ts` `updateShiftAction` the same way.
- [X] T018 [P] [US2] Extend the `WeekShift` and `Employee` types in `src/app/(dashboard)/schedules/_components/types.ts`: add `position: { id: string; name: string; color: string } | null` to `WeekShift`. Add a new export `Position = { id: string; name: string; color: string }` type.
- [X] T019 [US2] Update `src/app/(dashboard)/schedules/_components/ShiftDialog.tsx`:
  - Add a `positions: Position[]` prop.
  - Add a `<select name="positionId">` between the date/times row and the note input, with first option `value="" — "Aucune"` followed by one option per position. Default value = `shift?.position?.id ?? ""`.
  - Render a small colored circle inline next to each option's label (since native `<option>` can't style children, use a sibling preview chip that reflects the current selection).
- [X] T020 [US2] Update `src/app/(dashboard)/schedules/_components/ShiftBlock.tsx`:
  - When `shift.position` is non-null, apply a 3-px-wide left border in the position's `accent` color (via inline style with `borderLeftColor` from `getPositionColor(shift.position.color).accent`).
  - The secondary text line shows `shift.position.name` when set, else "Quart".
- [X] T021 [US2] Pass the `positions` prop down through `ScheduleCalendar` → `ShiftDialog` (the dialog is rendered inside ScheduleCalendar for both create and edit). Update `schedules/page.tsx` to call `listPositionsForCompany(ctx)` and pass the result down (alongside `employees`).
- [ ] T022 [US2] Manual smoke per quickstart.md US2: create shift tagged "Service", edit to "Cuisine", revert to "Aucune", drag a tagged shift to another cell → confirm position stays.

**Checkpoint**: US1 + US2 work. Schedule cards now carry colored position pills.

---

## Phase 5: User Story 3 - Functional filters + group by Position (Priority: P3)

**Goal**: the filter panel becomes functional (position checkboxes + "Sans position") and the "Gérer par Position" toggle reorganizes the grid by position.

**Independent Test**: MANAGER ticks "Service" → grid filters; ticks "Sans position" → untagged shifts also appear. Clicks "Gérer par Position" → rows become positions, each card shows the employee's name. Drag in this mode reassigns the position.

### Implementation for User Story 3

- [X] T023 [US3] Create `src/app/(dashboard)/schedules/_components/ScheduleView.tsx` (`"use client"`): new wrapper component receiving all server data (`shifts, employees, positions, range, today, isManager`). Owns React state: `selectedPositionIds: Set<string>`, `includeNoneFilter: boolean`, `groupBy: "employee" | "position"`. Computes the filtered shift list (`shifts.filter(s => …)`) based on the filter state. Renders `<FilterPanel>` (with controlled props + callbacks) on the left and `<ScheduleCalendar>` on the right.
- [X] T024 [US3] Rewrite `src/app/(dashboard)/schedules/_components/FilterPanel.tsx` as a controlled component:
  - Props: `positions, selectedPositionIds, includeNoneFilter, groupBy, onTogglePosition(id), onToggleNone(), onChangeGroupBy(mode)`.
  - The "Gérer par" segment: both buttons enabled now; "Employé" / "Position" toggle calls `onChangeGroupBy`.
  - The "Filtres / Positions" section: render real checkboxes — one per position with a color swatch next to the name, plus "Sans position". Disabled (`"Bientôt"`) controls in the "Affichage" section stay as in Phase 4 (those features are deferred to Phase 6+).
- [X] T025 [US3] Update `src/app/(dashboard)/schedules/page.tsx`: render `<ScheduleView />` instead of the two-column FilterPanel + ScheduleCalendar split. Pass it the server-fetched `shifts`, `employees`, `positions`, `range`, `today`, `isManager`.
- [X] T026 [US3] Update `src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx`:
  - Drop the `searchTerm` state lift (still in ScheduleCalendar — search remains independent of position filtering).
  - Accept new props: `groupBy: "employee" | "position"`, `positions: Position[]` (only used when `groupBy === "position"`).
  - Compute totals: when `groupBy === "employee"`, group by `employeeId` as before; when `groupBy === "position"`, group by `position?.id ?? "none"` (use literal `"none"` key for untagged shifts).
  - Pass `groupBy`, `positions`, and the appropriate row totals to `WeekGridDesktop`.
- [X] T027 [US3] Update `src/app/(dashboard)/schedules/_components/WeekGridDesktop.tsx`:
  - Accept new props: `groupBy: "employee" | "position"`, `positions: Position[]`, `rowTotalsMinutes: Map<string, number>` (keyed by employeeId OR positionId-or-"none" depending on `groupBy`).
  - When `groupBy === "employee"`: render employee rows as today (avatar + name + total). Each `DropCell` id = `${dateISO}|emp:${employeeId}`.
  - When `groupBy === "position"`: render one row per position (left cell = color swatch + position name + total). Append a "Sans position" row at the bottom (color = neutral grey, key = `"none"`). Each `DropCell` id = `${dateISO}|pos:${positionId | "none"}`. Each `ShiftBlock` adds a tiny line above the time with the employee's name (props can carry `showEmployeeOnCard: boolean`).
  - Filter the shifts client-side BEFORE rendering rows using a helper passed in (or have the parent pass already-filtered shifts).
- [X] T028 [US3] Update `src/app/(dashboard)/schedules/_components/DropCell.tsx`: change the id prefix detection — accept the prefix as part of the parent's choice (the cell still just registers `useDroppable` with the full id; the prefix logic lives in the parent's `onDragEnd`).
- [X] T029 [US3] Update `src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx`'s `handleDragEnd`:
  - Parse the `over.id` — split on `|` then check whether the suffix starts with `emp:` or `pos:`.
  - If `emp:`: behavior as Phase 3 (change `employeeId` + date, keep `positionId`).
  - If `pos:`: change `positionId` + date, keep `employeeId`. The destination position id might be `"none"` → submit `positionId=""` (the action coerces to null).
  - Build the FormData accordingly and call `updateShiftAction`. Toast / rollback unchanged.
- [X] T030 [US3] Update `src/app/(dashboard)/schedules/_components/ShiftBlock.tsx`: accept a new optional `showEmployeeName?: boolean` prop. When true, render an extra small text row at the top of the card with `shift.employee.name`.
- [ ] T031 [US3] Manual smoke per quickstart.md US3: filter on a single position, then add "Sans position"; switch to "Gérer par Position" — confirm grid reorganizes, cards show employee names; drag a card from one position row to another — confirm position changes. Confirm overlap rejection still works when dragging to an existing-employee conflict.

**Checkpoint**: All three user stories functional. Phase 5 complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T032 [P] Run `npx tsc --noEmit`. Fix any TypeScript errors (notably the `WeekShift` type extension and the discriminated-union for `groupBy`).
- [X] T033 [P] Run `npm run dev`. Visit `/`, `/login`, `/dashboard`, `/team`, `/positions`, `/schedules` as MANAGER and EMPLOYEE in both themes. Confirm no console errors and that the EMPLOYEE flow is intact (cannot see Positions in sidebar, cannot reach `/positions`).
- [ ] T034 Walk every smoke step in `quickstart.md` end-to-end.
- [X] T035 Commit Phase 5 in five SDD-narrative commits on the `006-positions` branch:
   - `[Spec Kit] Add specification` — spec.md + checklist
   - `[Spec Kit] Add implementation plan` — plan.md + research.md + data-model.md + contracts/ + quickstart.md + CLAUDE.md
   - `[Spec Kit] Add tasks` — tasks.md
   - `[Spec Kit] Implementation progress` — all `src/` + prisma + migration + repos + actions + UI
   - `[Spec Kit] Mark T036 complete (branch pushed)` — after push
- [X] T036 Push: `git push -u origin 006-positions`.

---

## Dependencies & Execution Order

- Setup (Phase 1) is empty → start at Foundational.
- Within Phase 2: T002 → T003 sequential; T004, T005, T007 are [P]; T006 depends on T005 because it edits the shared repo file.
- US1 (T008..T015) → US2 (T016..T022) → US3 (T023..T031): each builds on the previous.
- Polish (Phase 6) at the end.

## Implementation Strategy

### MVP First (US1)
1. Phase 2 → schema + repo ready.
2. US1 → positions page works. Demoable.

### Incremental Delivery
1. + US2 → cards get colored pills.
2. + US3 → filters + group-by become functional.
3. + Polish → typecheck + smoke + commits + push.

### Solo Dev
Sequential, batch [P] inside each phase.

---

## Notes

- `[P]` = different files, no dep on incomplete tasks.
- `[Story]` maps to user story.
- The constitutional grep ("no `db.position.*` outside `src/lib/repositories/position.ts` and no `db.shift.position*` outside `src/lib/repositories/shift.ts`") MUST still hold at the end.
- Drag-and-drop semantics expand cleanly: the `emp:` / `pos:` prefix on drop-cell IDs keeps the parsing self-describing.

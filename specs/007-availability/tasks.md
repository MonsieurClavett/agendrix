---
description: "Task list for the Availability feature (Phase 6)"
---

# Tasks: Disponibilités des employés

**Input**: Design documents from `/specs/007-availability/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md. Phases 0–5 MUST be in place.

**Tests**: Manual browser smoke (carry-over per Constitution III).

**Organization**: Tasks grouped by user story.

## Format

`- [ ] TXXX [P?] [USX?] Description with file path`

---

## Phase 1: Setup

- [X] T001 Phase 6 introduces no new npm dependency. Skip install. (`AlertTriangle` icon comes from `lucide-react`, already pulled in by shadcn.)

---

## Phase 2: Foundational

**Purpose**: schema migration, pure helpers, repository layer, proxy, sidebar nav. Shared by all three user stories.

### Database

- [X] T002 Update `prisma/schema.prisma`:
  - Add a new `Availability` model: `id String @id @default(cuid())`, `companyId String`, `employeeId String`, `dayOfWeek Int`, `startMinute Int`, `endMinute Int`, `createdAt`, `updatedAt`, `@@index([companyId, employeeId, dayOfWeek])`.
  - Add `company Company @relation(fields:[companyId], references:[id], onDelete: Cascade)`.
  - Add `employee User @relation(fields:[employeeId], references:[id], onDelete: Cascade)`.
  - Add back-relations: `availabilities Availability[]` on `Company` and on `User`.
- [X] T003 Run `npx prisma migrate dev --name add_availability`. Verify the SQL creates the `Availability` table with the composite index and both ON DELETE CASCADE foreign keys.

### Pure helpers

- [X] T004 [P] Create `src/lib/availability.ts` exporting:
  - `DAY_LABELS` — `readonly ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]`.
  - `DAY_LABELS_LONG` — `readonly ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]`.
  - `parseHHMMToMinutes(hhmm: string): number | null` — accepts `"HH:MM"` and the literal `"24:00"`; rejects anything else.
  - `formatMinutesToHHMM(minute: number): string` — pads to `"HH:MM"`; renders `1440` as `"24:00"`.
  - `dayOfWeekFromDate(d: Date): number` — wraps `d.getDay()` (already 0=Sun..6=Sat).
  - `minutesSinceMidnight(d: Date): number` — `d.getHours() * 60 + d.getMinutes()`.
  - `isShiftInsideAvailability(shift: { startsAt: Date; endsAt: Date }, ranges: { dayOfWeek: number; startMinute: number; endMinute: number }[]): boolean` — returns true when at least one range matches the shift's day-of-week AND has `startMinute <= shiftStart && endMinute >= shiftEnd`.
  - `isShiftOffAvailability(shift, allRangesForEmployee): boolean` — returns true ONLY when `allRangesForEmployee.length > 0` AND `!isShiftInsideAvailability(shift, allRangesForEmployee)`. This encodes the spec rule: no ranges declared at all → no warning.

### Repository layer

- [X] T005 [P] Create `src/lib/repositories/availability.ts` exporting:
  - `AvailabilityRow` type: `{ id: string; companyId: string; employeeId: string; dayOfWeek: number; startMinute: number; endMinute: number }`.
  - `listAvailabilitiesForEmployee(ctx, targetEmployeeId): Promise<AvailabilityRow[]>` — verifies `target.companyId === ctx.companyId` (throws `EMPLOYEE_NOT_FOUND` otherwise); verifies `targetEmployeeId === ctx.userId || ctx.role === "MANAGER"` (throws `FORBIDDEN` otherwise); returns rows ordered by `dayOfWeek` then `startMinute`.
  - `listAvailabilitiesForCompany(ctx): Promise<AvailabilityRow[]>` — throws `FORBIDDEN` if `ctx.role !== "MANAGER"`; returns all rows of `ctx.companyId` ordered by `employeeId`, `dayOfWeek`, `startMinute`.
  - `createAvailability(ctx, targetEmployeeId, data): Promise<AvailabilityRow>` — `data: { dayOfWeek; startMinute; endMinute }`. Transactional: (a) employee lookup by `(id, companyId)` → `EMPLOYEE_NOT_FOUND` on miss; (b) actor check `targetEmployeeId === ctx.userId || ctx.role === "MANAGER"` → `FORBIDDEN`; (c) overlap probe (`startMinute < data.endMinute && endMinute > data.startMinute` AND `dayOfWeek = data.dayOfWeek`) → `OVERLAP`; (d) insert with `companyId: ctx.companyId`, `employeeId: targetEmployeeId`.
  - `updateAvailability(ctx, availabilityId, data): Promise<AvailabilityRow>` — same shape. Transactional: (a) lookup by `(id, companyId)` → `NOT_FOUND` on miss; (b) actor check `existing.employeeId === ctx.userId || ctx.role === "MANAGER"` → `FORBIDDEN`; (c) overlap probe excluding `id: { not: availabilityId }` → `OVERLAP`; (d) update.
  - `deleteAvailability(ctx, availabilityId): Promise<void>` — transactional: (a) lookup by `(id, companyId)` → `NOT_FOUND` on miss; (b) actor check → `FORBIDDEN`; (c) `tx.availability.delete({ where: { id } })`.

### Proxy / middleware

- [X] T006 [P] Edit `src/proxy.ts`: add `"/disponibilites"` to `PROTECTED_PREFIXES` and `"/disponibilites/:path*"` to `config.matcher`. (Available to any authenticated tenant user — no MANAGER restriction at the proxy layer.)

### Sidebar nav

- [X] T007 [P] Edit `src/components/shell/SidebarNav.tsx`: add a new `NAV_ITEMS` entry `{ href: "/disponibilites", label: "Disponibilités", icon: CalendarCheck }` (import `CalendarCheck` from `lucide-react`). Available to all roles (no `managerOnly: true`). Place it between "Horaires" and "Positions".

**Checkpoint**: schema migrated, helpers + repository + proxy + nav in place. User-story work can begin.

---

## Phase 3: User Story 1 - Un employé déclare ses disponibilités hebdomadaires (Priority: P1) 🎯 MVP

**Goal**: An EMPLOYEE (or MANAGER acting on themselves) can list, add, edit, and delete their own weekly availability ranges from `/disponibilites`.

**Independent Test**: Sign in as EMPLOYEE → click "Disponibilités" in sidebar → page shows empty 7-day grid → add three ranges (two on the same day, one elsewhere) → edit one → delete one → reload → surviving ranges persist; another tenant's user sees none of them.

### Server Actions for US1

- [X] T008 [P] [US1] Create `src/actions/availability/create.ts` exporting `createAvailabilityAction(prev, formData)`. `requireTenantContext()`. Zod parse: `targetEmployeeId z.string().min(1)`, `dayOfWeek z.coerce.number().int().min(0).max(6)`, `startTime z.string()`, `endTime z.string()`. Convert with `parseHHMMToMinutes` and refine `endMinute > startMinute`. Call `createAvailability(ctx, targetEmployeeId, { dayOfWeek, startMinute, endMinute })`. Map `OVERLAP` → "Cette plage chevauche une plage existante de ce jour.", `EMPLOYEE_NOT_FOUND` → "Employé introuvable.", `FORBIDDEN` → "Vous n'avez pas le droit de modifier ces disponibilités.", Zod failures → "Veuillez vérifier les heures (format HH:MM, fin > début)." `revalidatePath("/disponibilites")`, `revalidatePath("/team")`, `revalidatePath("/schedules")`. Return `{ success: true }` or `{ error }`.
- [X] T009 [P] [US1] Create `src/actions/availability/update.ts` exporting `updateAvailabilityAction(prev, formData)`. Same shape but reads `availabilityId` instead of `targetEmployeeId`. Calls `updateAvailability(ctx, availabilityId, { dayOfWeek, startMinute, endMinute })`. Map `NOT_FOUND` → "Plage introuvable." plus the same `OVERLAP` / `FORBIDDEN` mappings as T008. Revalidate the same paths.
- [X] T010 [P] [US1] Create `src/actions/availability/delete.ts` exporting `deleteAvailabilityAction(prev, formData)`. `requireTenantContext()`. Zod: `availabilityId z.string().min(1)`. Calls `deleteAvailability(ctx, availabilityId)`. Map `NOT_FOUND` and `FORBIDDEN`. Revalidate.

### UI components for US1

- [X] T011 [P] [US1] Create `src/app/(dashboard)/disponibilites/_components/AvailabilityDialog.tsx` (`"use client"`): controlled Dialog (`open`, `onOpenChange`, `targetEmployeeId`, `range?: AvailabilityRow`, `mode: "create" | "edit"`). Form fields: `dayOfWeek` select (using `DAY_LABELS_LONG`), `startTime` `<input type="time">`, `endTime` `<input type="time">` (allowing the literal `24:00` by accepting it as text fallback — or by displaying `23:59` and treating it as `endMinute = 1440` server-side; the simpler choice is to require strict `HH:MM` in 00:00–23:59 and document that the user types `00:00` for "until midnight" via two adjacent ranges if needed — pick whichever matches the time picker's behavior on Chrome). On submit dispatches `createAvailabilityAction` or `updateAvailabilityAction` via `useActionState`. Toast `Plage ajoutée.` / `Plage mise à jour.` on success and close. Renders the error string from the action under the form on failure.
- [X] T012 [P] [US1] Create `src/app/(dashboard)/disponibilites/_components/DeleteAvailabilityDialog.tsx` (`"use client"`): controlled confirm Dialog with summary text `"<Day> <HH:MM>–<HH:MM>"` from the provided range. Calls `deleteAvailabilityAction`; toast `Plage supprimée.` on success.
- [X] T013 [P] [US1] Create `src/app/(dashboard)/disponibilites/_components/AvailabilityRangeRow.tsx` (`"use client"`): small row UI rendering one range as a pill (`HH:MM–HH:MM`) with edit + delete icon buttons that toggle controlled state in the parent. Props: `{ range: AvailabilityRow; onEdit(): void; onDelete(): void }`. No internal state.
- [X] T014 [US1] Create `src/app/(dashboard)/disponibilites/_components/AvailabilityWeekView.tsx` (`"use client"`): client wrapper that holds the controlled state for create/edit/delete dialogs. Props: `{ ranges: AvailabilityRow[]; targetEmployeeId: string; canEdit: boolean }`. Layout: a 7-row stack (Sunday to Saturday using `DAY_LABELS_LONG`), each row showing the day name on the left, the day's ranges as `AvailabilityRangeRow` chips in the middle, and (if `canEdit`) an "Ajouter une plage" button on the right that opens `AvailabilityDialog` in create mode with the right `dayOfWeek` pre-filled. Edit buttons open the dialog in edit mode; delete buttons open `DeleteAvailabilityDialog`. Empty days render "Aucune plage" in muted text.
- [X] T015 [US1] Create `src/app/(dashboard)/disponibilites/page.tsx` (Server Component): `await requireTenantContext()`; `const ranges = await listAvailabilitiesForEmployee(ctx, ctx.userId)`; render the `AppShell` (same layout as `/schedules`) with a page title "Mes disponibilités" and `<AvailabilityWeekView ranges={ranges} targetEmployeeId={ctx.userId} canEdit={true} />`. Add a short intro paragraph explaining that ranges declared here help the MANAGER plan shifts.

**US1 checkpoint**: an EMPLOYEE can manage their own ranges end-to-end. Overlap rejected. Cross-tenant ids return `EMPLOYEE_NOT_FOUND`.

---

## Phase 4: User Story 2 - Le calendrier signale les shifts hors-disponibilité (Priority: P2)

**Goal**: On the schedules calendar, each shift card shows a soft warning when assigned to a time outside the employee's declared availability.

**Independent Test**: Bob declares "mercredi 9h–17h" → MANAGER creates Bob shift mercredi 10h–15h (no warning) → creates Bob shift mercredi 18h–22h (warning visible) → drags it to thursday same time (no ranges declared for thursday — but Bob has at least one range globally — warning persists, then drag to another employee with matching availability — warning disappears).

### Data fetch for US2

- [X] T016 [US2] Edit `src/app/(dashboard)/schedules/page.tsx`: after the existing tenant/role check, fetch `const allRanges = ctx.role === "MANAGER" ? await listAvailabilitiesForCompany(ctx) : await listAvailabilitiesForEmployee(ctx, ctx.userId)`. Build `const availabilitiesByEmployee = new Map<string, AvailabilityRow[]>()` by grouping `allRanges` on `employeeId`. Pass it as a new prop to `ScheduleView`.

### Prop drilling through the calendar

- [X] T017 [US2] Edit `src/app/(dashboard)/schedules/_components/ScheduleView.tsx`: accept `availabilitiesByEmployee: Map<string, AvailabilityRow[]>` in props and forward it untouched to `ScheduleCalendar`. No new state.
- [X] T018 [US2] Edit `src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx`: accept `availabilitiesByEmployee` in props. Forward it to both `WeekGridDesktop` and `WeekStackedMobile`. No other behavior change. (The optimistic state already drives DnD; the warning recomputes per render because `ShiftBlock` consumes the map.)
- [X] T019 [US2] Edit `src/app/(dashboard)/schedules/_components/WeekGridDesktop.tsx`: accept `availabilitiesByEmployee` in props. Pass `availabilities={availabilitiesByEmployee.get(shift.employeeId) ?? []}` to each `<ShiftBlock>` instance.
- [X] T020 [US2] Edit `src/app/(dashboard)/schedules/_components/WeekStackedMobile.tsx`: same change as T019.

### Warning rendering

- [X] T021 [US2] Edit `src/app/(dashboard)/schedules/_components/ShiftBlock.tsx`: accept `availabilities: AvailabilityRow[]` as a new prop. Compute `const isOff = isShiftOffAvailability({ startsAt: shift.startsAt, endsAt: shift.endsAt }, availabilities)` (import the helper from `@/lib/availability`). When `isOff`:
  - Add an amber 1px outline class (`ring-1 ring-amber-500/60 dark:ring-amber-400/60`) to the card root.
  - Render a small `<AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" />` in the top-right corner of the card (use `lucide-react`), wrapped in a Tooltip with text "Hors disponibilités de l'employé".
- [X] T022 [US2] Smoke test in browser: with Bob having `mercredi 9h–17h` declared, create three shifts and visually verify the warning appears for off-range shifts and not for in-range ones. Drag a shift and confirm the warning recomputes optimistically.

**US2 checkpoint**: MANAGER can immediately spot off-availability assignments without any flow being blocked.

---

## Phase 5: User Story 3 - Le MANAGER consulte et édite les disponibilités d'un employé (Priority: P3)

**Goal**: From `/team`, a MANAGER can open a Dialog showing any employee's declared ranges and add/edit/delete on their behalf.

**Independent Test**: As MANAGER, open `/team`, click "Disponibilités" on Bob's card → dialog shows Bob's current ranges → add "samedi 10h–14h" → close → sign in as Bob, go to `/disponibilites`, the new range is visible.

### Server data for US3

- [X] T023 [P] [US3] Create `src/app/(dashboard)/team/_components/EmployeeAvailabilityDialog.tsx` (`"use client"`): controlled Dialog (`open`, `onOpenChange`, `employee: { id, name }`, `ranges: AvailabilityRow[]`, `canEdit: boolean`). Inside the Dialog body, mounts the SAME `AvailabilityWeekView` component used by `/disponibilites`, passing `targetEmployeeId={employee.id}` and the provided `ranges` and `canEdit`. Title: `"Disponibilités de {employee.name}"`. No other layout — let the week view fill the dialog.

### Team page integration

- [X] T024 [US3] Edit the Server Component that renders `/team` (existing page from Phase 2): change the fetch so each employee card has `ranges: AvailabilityRow[]` attached. Strategy: still call `listEmployeesForCompany(ctx)` first; then call `listAvailabilitiesForCompany(ctx)` and group by `employeeId`; pass `rangesByEmployee` down to the client list.
- [X] T025 [US3] Edit `src/app/(dashboard)/team/_components/TeamList.tsx` (client): for each employee card, add a "Disponibilités" outline button (`<Button variant="outline" size="sm">`) that opens a controlled `EmployeeAvailabilityDialog`. The dialog receives the employee's ranges from the precomputed map and `canEdit = role === "MANAGER"`. The button is visible to the MANAGER. For the EMPLOYEE flow, hide the button (they already have `/disponibilites`).
- [X] T026 [US3] Manual smoke: as MANAGER add a range for Bob via the team dialog, sign out, sign in as Bob, confirm visibility on `/disponibilites`.

**US3 checkpoint**: MANAGER can administer availabilities of any team member without leaving `/team`.

---

## Phase 6: Polish

- [X] T027 [P] Edit `src/app/(dashboard)/schedules/_components/types.ts`: export an `AvailabilityRow` re-export from `@/lib/repositories/availability` so calendar components import a single source of truth.
- [X] T028 [P] Make sure `npm run build` passes (TypeScript strict). Common spots to verify: the `ShiftBlock` prop addition is non-optional with a default `[]` to avoid breaking dashboards that mount it elsewhere; the `ScheduleCalendar` prop chain is consistent.
- [X] T029 [P] Run the full quickstart smoke once end-to-end (US1 + US2 + US3 + cross-tenant isolation test from `quickstart.md`). Fix any UX rough edges discovered (e.g., default `endTime` value in the create dialog).
- [X] T030 [P] Mark every shipped task in this file `[X]`. Update the project memory note for Phase 6 status.

---

## Dependencies

| From | To |
|------|----|
| T002 → T003 | schema edit before migration |
| T003 → T004, T005, T006, T007 | migration before any code that imports the new generated types |
| T002–T007 (foundational) | T008 onward (US1) |
| T008, T009, T010 | T011, T012 (dialogs depend on actions for `useActionState`) |
| T011, T012, T013 → T014 | dialogs and row UI before week view |
| T014 → T015 | week view before page wires the data fetch |
| T015 (US1) → T023, T024, T025 (US3) | US3 reuses `AvailabilityWeekView` |
| T015 (US1) → T016–T022 (US2) | US2 needs the helper from T004 and the repository from T005; conceptually independent of US1's UI but the data flow is shared |
| Phase 3, 4, 5 → Phase 6 | polish runs last |

## Parallel-execution examples

- After T003 lands, T004 + T005 + T006 + T007 can run in parallel (different files, no shared imports).
- T008 + T009 + T010 are three independent Server Actions, all parallel.
- T011 + T012 + T013 are three independent client components, all parallel.
- T017 + T021 are file-disjoint inside US2 (they touch different components), but the chain T016 → T017 → T018 → T019 → T020 is sequential because each parent passes the prop down to children — keep it sequential to avoid prop-shape drift mid-edit.
- T023 + T024 (US3) are file-disjoint and can run in parallel.
- T027 + T028 + T029 + T030 are independent polish items, all parallel.

## Implementation strategy

- **MVP scope**: US1 only (T001 + T002–T007 + T008–T015 = 15 tasks). At this point, an EMPLOYEE can declare their availability, the schema is in place, and the repository / proxy / sidebar are wired. The calendar warning (US2) and the MANAGER team-page dialog (US3) layer on top without changing the foundation.
- **Increment 1 → US2**: 7 more tasks (T016–T022). Pure additive UI plus one extra fetch on `/schedules`. No data-model change.
- **Increment 2 → US3**: 4 more tasks (T023–T026). Reuses the US1 UI surface — almost no new code.
- **Final**: 4 polish tasks (T027–T030).

**Total**: 30 tasks across 6 phases. MVP = 15 tasks.

## Independent test criteria summary

| Story | Independent slice testable as |
|-------|-------------------------------|
| US1 (P1) | EMPLOYEE creates / edits / deletes ranges on `/disponibilites`; overlap rejected; cross-tenant isolation holds. |
| US2 (P2) | Calendar shows warning iff employee has ranges and shift falls outside; warning recomputes on DnD. |
| US3 (P3) | MANAGER edits target employee's ranges from `/team`; changes visible to the employee on `/disponibilites`. |

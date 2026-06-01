---
description: "Task list for the Time Off feature (Phase 7)"
---

# Tasks: Congés ponctuels

**Input**: Design documents from `/specs/008-time-off/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md. Phases 0–6 MUST be in place.

**Tests**: Manual browser smoke (carry-over per Constitution III).

**Organization**: Tasks grouped by user story.

## Format

`- [ ] TXXX [P?] [USX?] Description with file path`

---

## Phase 1: Setup

- [X] T001 Phase 7 introduces no new npm dependency. Skip install. (`CalendarOff` / `Plane` icons come from `lucide-react`.)

---

## Phase 2: Foundational

**Purpose**: schema migration, pure helpers, repository layer, proxy, sidebar nav. Shared by all three user stories.

### Database

- [X] T002 Update `prisma/schema.prisma`:
  - Add `enum TimeOffType { PAID UNPAID SICK }`.
  - Add `enum TimeOffStatus { PENDING APPROVED REJECTED }`.
  - Add `TimeOffRequest` model with all fields per data-model.md, plus indexes `[companyId, employeeId, startDate]` and `[companyId, status]`.
  - Add three named relations: `company`, `employee` (named `"TimeOffRequester"`), `decidedBy` (named `"TimeOffDecider"`).
  - Add back-relations on `Company` (`timeOffRequests TimeOffRequest[]`) and on `User` (`timeOffRequests TimeOffRequest[] @relation("TimeOffRequester")` AND `timeOffDecisions TimeOffRequest[] @relation("TimeOffDecider")`).
- [X] T003 Run `npx prisma migrate dev --name add_time_off`. Verify SQL creates two enums, the table, both indexes, and three foreign keys with the right ON DELETE behaviors (CASCADE for company + employee; SET NULL for decidedByUserId).

### Pure helpers

- [X] T004 [P] Create `src/lib/timeOff.ts` exporting:
  - `TIME_OFF_TYPE_LABELS: Record<TimeOffType, string>` (`{ PAID: "Payé", UNPAID: "Non payé", SICK: "Maladie" }`).
  - `TIME_OFF_STATUS_LABELS: Record<TimeOffStatus, string>` (`{ PENDING: "En attente", APPROVED: "Approuvée", REJECTED: "Refusée" }`).
  - `parseISODate(s: string): Date | null` — accepts `YYYY-MM-DD` and returns the local-midnight Date or null.
  - `enumerateDates(startDate: Date, endDate: Date): string[]` — returns inclusive ISO strings from start to end. Caller guarantees `endDate >= startDate`.
  - `clampDatesToWeek(start: Date, end: Date, range: WeekRange): { start: Date; end: Date } | null` — intersects a request range with a week; returns null if no overlap.
  - `buildTimeOffMaps(rows, range): Map<string, { approved: Set<string>; pending: Set<string> }>` — accepts rows of shape `{ employeeId, startDate, endDate, status }` and groups them. Internally uses `clampDatesToWeek` + `enumerateDates`.

### Repository layer

- [X] T005 [P] Create `src/lib/repositories/timeOff.ts` exporting:
  - `TimeOffRequestRow` type mirroring data-model.md.
  - `listTimeOffForEmployee(ctx, targetEmployeeId): Promise<TimeOffRequestRow[]>` — enforces target = self OR MANAGER; ordered by `startDate desc`.
  - `listTimeOffForCompany(ctx, { statusIn }): Promise<TimeOffRequestRow[]>` — MANAGER-only; filtered by `status: { in: statusIn }`; ordered by `startDate desc`.
  - `listTimeOffOverlappingWeek(ctx, range): Promise<TimeOffRequestRow[]>` — returns rows where `status IN (PENDING, APPROVED) AND startDate <= range.end AND endDate >= range.start`. For non-MANAGER actors, additionally filter `employeeId = ctx.userId`.
  - `createTimeOff(ctx, targetEmployeeId, data): Promise<TimeOffRequestRow>` — transactional: (a) employee lookup → `EMPLOYEE_NOT_FOUND`; (b) actor check → `FORBIDDEN`; (c) `endDate >= startDate` → `INVALID_INPUT`; (d) overlap probe filtered by `status: { in: ["PENDING", "APPROVED"] }` → `OVERLAP`; (e) insert with `status: "PENDING"`.
  - `decideTimeOff(ctx, requestId, decision): Promise<TimeOffRequestRow>` — MANAGER-only; transactional: (a) row lookup → `NOT_FOUND`; (b) role check → `FORBIDDEN`; (c) current `status === "PENDING"` → `ALREADY_DECIDED` otherwise; (d) if `decision === "APPROVED"`, re-run overlap probe excluding `id: { not: requestId }` → `OVERLAP`; (e) update `status`, `decidedAt: new Date()`, `decidedByUserId: ctx.userId`.
  - `deleteTimeOff(ctx, requestId): Promise<void>` — transactional: (a) row lookup → `NOT_FOUND`; (b) auth: MANAGER OK; EMPLOYEE iff (`existing.employeeId === ctx.userId` AND `existing.status === "PENDING"`); else → `FORBIDDEN`; (c) delete.

### Proxy / middleware

- [X] T006 [P] Edit `src/proxy.ts`: add `"/conges"` to `PROTECTED_PREFIXES` and `"/conges/:path*"` to `config.matcher`. Available to any authenticated tenant user.

### Sidebar nav

- [X] T007 [P] Edit `src/components/shell/SidebarNav.tsx`: add a new `NAV_ITEMS` entry `{ href: "/conges", label: "Congés", icon: PlaneTakeoff }` (import `PlaneTakeoff` from `lucide-react`). Available to all roles. Place it between "Disponibilités" and "Équipe".

**Checkpoint**: schema migrated, helpers + repository + proxy + nav in place. User-story work can begin.

---

## Phase 3: User Story 1 - Un employé soumet une demande de congé (Priority: P1) 🎯 MVP

**Goal**: An EMPLOYEE can submit, cancel, and list their own time-off requests.

**Independent Test**: Sign in as EMPLOYEE → click "Congés" → page shows empty list → "Nouvelle demande" 15–22 July 2026 Payé → row appears with "En attente" badge → try to create overlapping range → rejected → cancel original → list empty.

### Server Action for create

- [X] T008 [P] [US1] Create `src/actions/timeOff/create.ts` exporting `createTimeOffAction(prev, formData)`. `requireTenantContext()`. Zod: `targetEmployeeId z.string().min(1)`, `startDate z.string()`, `endDate z.string()`, `type z.enum(["PAID", "UNPAID", "SICK"])`, `reason z.string().max(280).optional()`. Convert dates with `parseISODate`; refine `endDate >= startDate`. Call `createTimeOff(ctx, targetEmployeeId, { startDate, endDate, type, reason: reason ?? null })`. Map `OVERLAP` / `EMPLOYEE_NOT_FOUND` / `FORBIDDEN` / `INVALID_INPUT` to user-facing French strings per contracts/server-actions.md. `revalidatePath("/conges")` + `revalidatePath("/schedules")`.

### Server Action for delete

- [X] T009 [P] [US1] Create `src/actions/timeOff/delete.ts` exporting `deleteTimeOffAction(prev, formData)`. `requireTenantContext()`. Zod: `requestId z.string().min(1)`. Call `deleteTimeOff(ctx, requestId)`. Map `NOT_FOUND` → "Demande introuvable.", `FORBIDDEN` → "Vous n'avez pas le droit de supprimer cette demande.". Revalidate.

### UI components for US1

- [X] T010 [P] [US1] Create `src/app/(dashboard)/conges/_components/CreateTimeOffDialog.tsx` (`"use client"`): controlled Dialog. Props: `{ open; onOpenChange; targetEmployeeId }`. Form fields: `startDate` (date input), `endDate` (date input), `type` (select PAID/UNPAID/SICK with French labels from `TIME_OFF_TYPE_LABELS`), `reason` (textarea, max 280). On submit dispatches `createTimeOffAction`. Toast "Demande envoyée." on success.
- [X] T011 [P] [US1] Create `src/app/(dashboard)/conges/_components/CancelTimeOffDialog.tsx` (`"use client"`): controlled confirm Dialog. Summary text: "Annuler la demande du {start} au {end} ({type})". Calls `deleteTimeOffAction`; toast "Demande annulée." on success.
- [X] T012 [P] [US1] Create `src/app/(dashboard)/conges/_components/TimeOffRequestRow.tsx` (`"use client"`): card UI for one row. Props: `{ request; canCancel; onCancelClick }`. Renders date range (`formatLongDate(startDate)` + " – " + same for endDate when different, otherwise just the single date), `Badge` for type using `TIME_OFF_TYPE_LABELS`, `Badge` for status using `TIME_OFF_STATUS_LABELS` (variant: PENDING=secondary, APPROVED=default, REJECTED=destructive), reason text (muted) if present, and a small "Décidé le {decidedAt} par {decidedBy.name}" footer when status is not PENDING. If `canCancel`, renders a small "Annuler" icon button that fires `onCancelClick`.
- [X] T013 [US1] Create `src/app/(dashboard)/conges/_components/EmployeeRequestList.tsx` (`"use client"`): client wrapper for the EMPLOYEE view. Props: `{ requests: TimeOffRequestRow[]; targetEmployeeId: string }`. Holds controlled state for `createOpen` and `cancelTarget`. Renders an "Ajouter une demande" button (opens `CreateTimeOffDialog`), then a list of `TimeOffRequestRow` cards. Empty state: small card with "Aucune demande pour le moment." and the same Add button. Each card's `onCancelClick` (passed only when `request.status === "PENDING"`) opens `CancelTimeOffDialog`.
- [X] T014 [US1] Create `src/app/(dashboard)/conges/page.tsx` (Server Component): `await requireTenantContext()`. If `ctx.role !== "MANAGER"`, fetch `listTimeOffForEmployee(ctx, ctx.userId)` and render an `<EmployeeRequestList ranges={...} targetEmployeeId={ctx.userId} />` inside a page header "Mes congés". Manager branch is wired in Phase 4 (US2). Add a short intro paragraph.

**US1 checkpoint**: EMPLOYEE creates, cancels, sees own requests; overlap rejected; cross-tenant isolated.

---

## Phase 4: User Story 2 - Le MANAGER approuve ou refuse les demandes (Priority: P2)

**Goal**: From `/conges`, a MANAGER sees two tabs (À approuver / Historique) and can Approve or Reject each PENDING request.

**Independent Test**: Bob submits PENDING → Alice opens "/conges" → sees Bob's row in "À approuver" tab → clicks "Approuver" → row moves to "Historique" with badge "Approuvée" + decided date.

### Server Action for decide

- [X] T015 [P] [US2] Create `src/actions/timeOff/decide.ts` exporting `decideTimeOffAction(prev, formData)`. `requireTenantContext()` (NOT `requireManagerContext` — the role check happens in the repository to keep the error model unified). Zod: `requestId z.string().min(1)`, `decision z.enum(["APPROVED", "REJECTED"])`. Call `decideTimeOff(ctx, requestId, decision)`. Map `NOT_FOUND` → "Demande introuvable.", `FORBIDDEN` → "Vous n'avez pas le droit de décider.", `ALREADY_DECIDED` → "Cette demande a déjà été décidée.", `OVERLAP` → "Impossible d'approuver : un conflit a été créé entre-temps." Revalidate.

### UI components for US2

- [X] T016 [P] [US2] Create `src/app/(dashboard)/conges/_components/DecideTimeOffDialog.tsx` (`"use client"`): controlled confirm Dialog. Props: `{ open; onOpenChange; request: TimeOffRequestRow; decision: "APPROVED" | "REJECTED" }`. Title varies by decision ("Approuver la demande" / "Refuser la demande"). Body shows the request summary (employee, dates, type, reason). Submit form dispatches `decideTimeOffAction`. Toast "Décision enregistrée." on success.
- [X] T017 [P] [US2] Create `src/app/(dashboard)/conges/_components/ManagerPendingList.tsx` (`"use client"`): renders `TimeOffRequestRow` cards. For each row, two outline buttons "Approuver" / "Refuser" that open `DecideTimeOffDialog` with the right decision. Empty state: "Aucune demande à approuver."
- [X] T018 [P] [US2] Create `src/app/(dashboard)/conges/_components/ManagerHistoryList.tsx` (`"use client"`): renders `TimeOffRequestRow` cards in read-only mode. Adds a small delete icon button that opens `CancelTimeOffDialog` (reused — the action accepts MANAGER deletion of any status). Empty state: "Aucune décision passée."
- [X] T019 [US2] Create `src/app/(dashboard)/conges/_components/TimeOffPageClient.tsx` (`"use client"`): client wrapper for the MANAGER view. Props: `{ pending: TimeOffRequestRow[]; decided: TimeOffRequestRow[] }`. Holds tab state ("pending" | "history"), defaults to "pending". Renders a simple tab bar (two buttons + active indicator) plus the matching list. Includes the same "Ajouter une demande" button (the MANAGER may want to record an absence on behalf of an employee — `CreateTimeOffDialog` accepts any `targetEmployeeId` they're allowed to act on; for this phase the dialog renders an employee dropdown when actor is MANAGER, hidden otherwise).
- [X] T020 [US2] Edit `src/app/(dashboard)/conges/_components/CreateTimeOffDialog.tsx` to accept a new prop `employees?: { id; name }[]`. When present (MANAGER case), render an employee `<select>` instead of using the hard-coded `targetEmployeeId`. The selected id becomes the form's `targetEmployeeId`.
- [X] T021 [US2] Edit `src/app/(dashboard)/conges/page.tsx`: in the MANAGER branch, run `Promise.all([listTimeOffForCompany(ctx, { statusIn: ["PENDING"] }), listTimeOffForCompany(ctx, { statusIn: ["APPROVED", "REJECTED"] }), listUsersInCompany(ctx)])` and render `<TimeOffPageClient pending decided employees />`.

**US2 checkpoint**: MANAGER decides; tabs work; cross-tenant isolated.

---

## Phase 5: User Story 3 - Le calendrier signale les jours de congé (Priority: P3)

**Goal**: Cell overlay on the schedules calendar for PENDING + APPROVED days; absence marker on shifts placed in APPROVED days; coexistence with the Phase 6 off-availability marker.

**Independent Test**: Bob APPROVED 15–17 July → Alice opens schedules week of 13 July → cells 15/16/17 for Bob are tinted with "Congé" label → shift on 16 July shows absence marker + existing markers → drag to 14 July → marker gone.

### Data fetch for US3

- [X] T022 [US3] Edit `src/app/(dashboard)/schedules/page.tsx`: after the existing fetches, `const timeOffRows = await listTimeOffOverlappingWeek(ctx, range)` then `const timeOffByEmployee = buildTimeOffMaps(timeOffRows, range)`. Pass the map down to `<ScheduleView>`.

### Prop drilling

- [X] T023 [US3] Edit `src/app/(dashboard)/schedules/_components/ScheduleView.tsx`: accept `timeOffByEmployee: Map<string, { approved: Set<string>; pending: Set<string> }>` and forward to `ScheduleCalendar`.
- [X] T024 [US3] Edit `src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx`: accept and forward to both `WeekGridDesktop` and `WeekStackedMobile`.

### Cell overlay (desktop)

- [X] T025 [US3] Edit `src/app/(dashboard)/schedules/_components/WeekGridDesktop.tsx`: accept `timeOffByEmployee` prop and pass to the `EmployeeGrid` sub-component. Inside `EmployeeGrid`, for each cell, compute `const dayISO = toISODate(day)` and `const empOff = timeOffByEmployee.get(emp.id)`. If `empOff?.approved.has(dayISO)`, render the `DropCell` with an additional CSS class `bg-amber-50/40 dark:bg-amber-950/20 border border-dashed border-amber-500/40` and a tiny absolute-positioned text label "Congé" in the top-left. If `empOff?.pending.has(dayISO)`, render with `bg-amber-50/20 dark:bg-amber-950/10` and a "?" label in the top-left. Do NOT change the layout (use absolute positioning so the existing children stay aligned).

### Cell overlay (mobile)

- [X] T026 [US3] Edit `src/app/(dashboard)/schedules/_components/WeekStackedMobile.tsx`: accept `timeOffByEmployee` and per shift compute `isOnApprovedTimeOff = timeOffByEmployee.get(s.employeeId)?.approved.has(toISODate(s.startsAt)) ?? false`. When true, add the absence marker icon next to the existing icons in the row.

### Warning on ShiftBlock

- [X] T027 [US3] Edit `src/app/(dashboard)/schedules/_components/ShiftBlock.tsx`: accept a new prop `isOnApprovedTimeOff?: boolean` (default `false`). When true, render an additional `CalendarOff` icon from `lucide-react` next to (or just below) the existing AlertTriangle icon. Add a small text label "En congé" inside the tooltip pattern (or, since there are no tooltips on the existing AlertTriangle, just use `aria-label="Shift planifié pendant un congé approuvé"`).
- [X] T028 [US3] Edit `WeekGridDesktop.tsx` again: when rendering `<ShiftBlock>` inside an `EmployeeGrid` cell, also pass `isOnApprovedTimeOff={empOff?.approved.has(dayISO) ?? false}`. Same for the `PositionGrid` rendering using `timeOffByEmployee.get(s.employeeId)?.approved.has(toISODate(s.startsAt)) ?? false`.

**US3 checkpoint**: overlay + warning visible; drag recomputes; cross-marker composition works.

---

## Phase 6: Polish

- [X] T029 [P] Run `npx tsc --noEmit` and fix any strict errors.
- [X] T030 [P] Run `npm run build` and confirm `/conges` is registered as a `ƒ` route in the Next route table.
- [X] T031 [P] Quickstart smoke pass: tests 1–5 end-to-end.
- [X] T032 [P] Mark every shipped task in this file `[X]`.

---

## Dependencies

| From | To |
|------|----|
| T002 → T003 | schema before migration |
| T003 → T004, T005, T006, T007 | migration before code referencing the new types |
| T002–T007 | T008+ (all stories) |
| T008, T009 → T010, T011, T012, T013 | actions before dialogs/wrappers |
| T013 → T014 | wrapper before page |
| T014 (US1) → T015–T021 (US2) | US2 depends on US1's components (reuse) |
| T015 → T016, T017, T018 | decide action before dialogs |
| T019 (US2 wrapper) → T021 (page wires both branches) | wire MANAGER after both wrappers exist |
| T022 → T023 → T024 → (T025, T026, T027, T028) | data + prop chain before overlay rendering |
| All US3 → Phase 6 polish |

## Parallel-execution examples

- After T003: T004, T005, T006, T007 in parallel.
- T008 + T009 in parallel.
- T010 + T011 + T012 in parallel (after T008, T009).
- T015, T016, T017, T018 mostly independent (after T013).
- T029, T030, T031, T032 all parallel.

## Implementation strategy

- **MVP scope**: T001 + T002–T007 + T008–T014 (15 tasks) = an EMPLOYEE-only end-to-end flow. Schema + EMPLOYEE submit/cancel + list. No MANAGER decisions, no calendar overlay. Useful as a checkpoint to verify the foundational layer.
- **Increment 1 → US2**: 7 more tasks (T015–T021). Adds the MANAGER decision workflow. No data-model change.
- **Increment 2 → US3**: 7 more tasks (T022–T028). Pure UI plus one extra fetch on `/schedules`. No data-model change.
- **Final**: 4 polish tasks (T029–T032).

**Total**: 32 tasks across 6 phases. MVP = 15 tasks.

## Independent test criteria summary

| Story | Independent slice testable as |
|-------|-------------------------------|
| US1 (P1) | EMPLOYEE creates / cancels requests on `/conges`; overlap rejected; cross-tenant isolated. |
| US2 (P2) | MANAGER approves / rejects from "À approuver"; row moves to "Historique"; cross-tenant isolated. |
| US3 (P3) | Cell overlay visible; absence marker on shifts placed in APPROVED days; coexists with Phase 6 marker; drag recomputes. |

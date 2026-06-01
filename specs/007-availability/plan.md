# Implementation Plan: Availability

**Branch**: `007-availability` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-availability/spec.md`

## Summary

Add an `Availability` entity, scoped to a `Company` + `User`, representing a
recurring weekly window where an employee declares being able to work. A new
`/disponibilites` page (accessible by both EMPLOYEE and MANAGER) lets a user
manage their own ranges. MANAGER can also view and edit the ranges of any
employee in their company from the existing `/team` page via a Dialog.

On the schedules calendar, each shift card displays a soft warning marker
when the assigned employee has declared at least one availability range
anywhere AND the shift is not entirely contained in any declared range for
the shift's day-of-week. The marker is purely visual — never blocking. The
drag-and-drop pipeline recomputes the warning optimistically each time a
shift's date or employee changes.

One Prisma migration, one repository file, three Server Actions, one new
route, one Sidebar nav entry, one Dialog reachable from `/team`. The
calendar's existing components are extended with one prop (per-employee
availability map) plus a small warning badge in `ShiftBlock`.

## Technical Context

**Language/Version**: TypeScript (strict) on Next.js 16 (App Router), Node.js 24 — carry-over.

**Primary Dependencies**: no new deps. Phase 0–5 stack reused: Prisma 6, Auth.js v5, shadcn primitives, dnd-kit, sonner, next-themes.

**Storage**: Same Neon Postgres. One new migration `add_availability`:
1. Create `Availability` table with `companyId`, `employeeId`, `dayOfWeek` (Int 0–6), `startMinute` (Int 0–1439), `endMinute` (Int 1–1440).
2. Add index on `(companyId, employeeId, dayOfWeek)` for fast per-employee per-day lookups.
3. FK `employeeId → User(id)` ON DELETE CASCADE (spec FR-011).
4. FK `companyId → Company(id)` ON DELETE CASCADE.

**Testing**: Manual browser smoke (carry-over per Constitution III).

**Target Platform**: Web — same as previous phases.

**Project Type**: Single Next.js project. New files under
`src/lib/repositories/availability.ts`, `src/actions/availability/`,
`src/app/(dashboard)/disponibilites/`. Existing files extended:
`prisma/schema.prisma`, `src/proxy.ts`, `src/components/shell/SidebarNav.tsx`,
`src/app/(dashboard)/team/_components/*`, the schedules calendar pieces
(`ScheduleCalendar.tsx`, `ShiftBlock.tsx`, `WeekGridDesktop.tsx`,
`WeekStackedMobile.tsx`, `page.tsx`).

**Performance Goals**:
- `/disponibilites` page renders < 200 ms for ≤ 30 ranges.
- Warning recomputation during drag completes in < 16 ms (one frame) for ≤ 50 shifts.
- Server round-trip for Availability CRUD < 500 ms.

**Constraints**:
- All Phase 0–5 invariants carry over: tenant isolation, role gating, overlap detection on shifts, theme persistence, totals correctness, position colors.
- Availability is dual-actor: an EMPLOYEE may CRUD their own ranges; a MANAGER may CRUD ranges of any employee within their company. Cross-tenant access MUST be rejected server-side.
- Shift creation/update/delete and DnD MUST NOT be blocked by availability checks — only visually warned.
- Range overlap check is transactional and per `(employeeId, dayOfWeek)`.

**Scale/Scope**: ≤ 30 ranges per employee, ≤ 10 employees per company, ≤ 50 shifts/week.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan satisfies it | Verdict |
|-----------|---------------------------|---------|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | New `Availability` table carries `companyId`. All four new repository functions take `TenantContext` and inject `where: { companyId: ctx.companyId }`. The `employeeId` resolution against the company is done in the same transaction as the mutation. | ✅ PASS |
| **II. Specification-Driven Development (NON-NEGOTIABLE)** | This plan is `/speckit-plan` output. `/speckit-tasks` and `/speckit-implement` follow. | ✅ PASS |
| **III. Simplicity First (YAGNI)** | One new entity. Pure integer (minutes-since-midnight) representation — no `Date` columns, no timezone fields, no exceptions-by-date. Warning is computed client-side (no extra round-trip). No notifications, no audit log, no bulk import. The Dialog on `/team` reuses the same components as `/disponibilites`. | ✅ PASS |
| **IV. Type Safety End-to-End** | `Availability` type is Prisma-generated. Server Action input is Zod-validated (`dayOfWeek` as `z.number().int().min(0).max(6)`, `startMinute`/`endMinute` as `z.number().int().min(0).max(1440)`, plus refinement `end > start`). The per-employee availability map passed to the calendar is typed `Map<string, AvailabilityRow[]>`. | ✅ PASS |
| **V. Server-Authoritative Authorization** | `/disponibilites` route is guarded by the existing `requireTenantContext` (any authenticated tenant user). The "modify someone else's availability" check is done inside the repository: if `actorUserId !== targetEmployeeId`, the actor MUST have `role === MANAGER`. The proxy/middleware adds `/disponibilites` to its protected prefix list. | ✅ PASS |

**Gate verdict**: 5/5 PASS. Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/007-availability/
├── spec.md
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── server-actions.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks output (separate command)
```

### Source Code (delta against Phase 5 baseline)

```text
agendrix/
├── prisma/
│   ├── schema.prisma                                # ★ adds Availability model
│   └── migrations/
│       └── <add_availability>/migration.sql        # ★ new
├── src/
│   ├── proxy.ts                                     # ★ adds "/disponibilites" to PROTECTED_PREFIXES
│   ├── app/
│   │   └── (dashboard)/
│   │       ├── disponibilites/                      # ★ NEW route
│   │       │   ├── page.tsx                         # Server Component: fetches current user's ranges
│   │       │   └── _components/
│   │       │       ├── AvailabilityWeekView.tsx     # Client: 7-day grid + Add buttons
│   │       │       ├── AvailabilityRangeRow.tsx     # row UI: range pill + Edit/Delete buttons
│   │       │       ├── AvailabilityDialog.tsx       # create + edit (controlled)
│   │       │       └── DeleteAvailabilityDialog.tsx
│   │       ├── team/
│   │       │   ├── page.tsx                         # ★ unchanged structure; client subtree now mounts dispo dialog
│   │       │   └── _components/
│   │       │       ├── TeamList.tsx                 # ★ adds "Disponibilités" button per employee card
│   │       │       └── EmployeeAvailabilityDialog.tsx  # ★ NEW: wraps AvailabilityWeekView for a target employee
│   │       └── schedules/
│   │           ├── page.tsx                         # ★ fetches availabilitiesByEmployee, passes down
│   │           └── _components/
│   │               ├── ScheduleView.tsx             # ★ accepts availabilities prop
│   │               ├── ScheduleCalendar.tsx        # ★ accepts availabilities, passes to grid + block
│   │               ├── WeekGridDesktop.tsx         # ★ forwards availabilities to ShiftBlock
│   │               ├── WeekStackedMobile.tsx       # ★ forwards availabilities to ShiftBlock
│   │               └── ShiftBlock.tsx              # ★ renders warning badge when off-availability
│   ├── actions/
│   │   └── availability/
│   │       ├── create.ts                            # ★ NEW
│   │       ├── update.ts                            # ★ NEW
│   │       └── delete.ts                            # ★ NEW
│   ├── components/
│   │   └── shell/
│   │       └── SidebarNav.tsx                       # ★ adds "Disponibilités" nav item (all roles)
│   ├── lib/
│   │   ├── availability.ts                          # ★ NEW: pure helpers (minutes parsing, off-range check, day labels)
│   │   └── repositories/
│   │       └── availability.ts                      # ★ NEW: 4 tenant-scoped fns
│   └── generated/prisma/                             # regenerated by `prisma migrate dev`
```

**Structure Decision**: The `/disponibilites` page is a thin Server
Component that hands the current user's ranges to a client wrapper.
The same `AvailabilityWeekView` is mounted twice: once on
`/disponibilites` (operates on the session user) and once inside
`EmployeeAvailabilityDialog` on `/team` (operates on a chosen target
employee, MANAGER only). The wrapper's `targetEmployeeId` prop drives
which Server Actions it dispatches to.

Time storage is integer minutes-since-midnight (0–1440) plus
`dayOfWeek` (Int 0–6). No `Date` columns, no timezones, no SQL
timestamp arithmetic. Display formatting (`HH:MM`) lives in
`src/lib/availability.ts` next to the parsing helpers — symmetric to
`src/lib/week.ts` from earlier phases.

Warning calculation is **client-side only** and uses a pure helper
`isShiftOffAvailability(shift, ranges)` that returns `true` when the
employee has at least one range globally but the shift's local
`[startsAt, endsAt)` is not entirely contained in any range matching
the shift's `dayOfWeek`. The schedules page fetches each tenant
employee's ranges once (cheap: ≤ 30 rows per employee), groups them
into `Map<employeeId, AvailabilityRow[]>`, and passes the map down.
The `useOptimistic` state already drives DnD; the warning naturally
recomputes per render.

## Complexity Tracking

No violations. Empty.

## Post-Design Re-Check

After Phase 1 design:

- `Availability` is the only new table. No new package, no extra
  npm install, no new auth path.
- Dual-actor authorization fits cleanly in the repository: every
  mutation accepts `(ctx, targetEmployeeId, data)`. If
  `targetEmployeeId !== ctx.userId` and `ctx.role !== "MANAGER"`,
  the function throws `FORBIDDEN`. This compresses the role check
  to one site.
- Overlap detection mirrors the existing `Shift` overlap query — a
  half-open-interval check per `(employeeId, dayOfWeek)` filtered by
  `companyId`, inside a transaction with the insert/update.
- The schedules page already fetches employees and shifts for the
  week; adding a single `listAvailabilitiesForCompany(ctx)` call is
  O(employees × ~30 ranges) ≤ 300 rows. Negligible.
- Drag-and-drop pipeline is untouched at the Server Action level —
  the new warning is purely a render-time computation against the
  optimistic state.
- The proxy receives one new protected prefix; no auth flow change.

Gate remains ✅ PASS.

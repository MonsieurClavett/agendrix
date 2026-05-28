# Implementation Plan: Weekly Schedules

**Branch**: `003-schedules` | **Date**: 2026-05-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-schedules/spec.md`

## Summary

Add a `Shift` entity and a `/schedules` route. A MANAGER creates / edits /
deletes shifts (employee + datetime range + optional note); the week view
shows all shifts of the company for the selected week. An EMPLOYEE sees the
same week view filtered to their own shifts only. Overlap detection
(including across midnight) and tenant isolation are enforced at the
data-access layer in transactions.

Technical approach: one new Prisma model `Shift` with FKs to `User` and
`Company` (companyId denormalised for fast tenant filtering). One new
migration. New `src/lib/repositories/shift.ts` with five tenant-scoped
functions (`listShiftsForCompanyWeek`, `listShiftsForUserWeek`,
`createShift`, `updateShift`, `deleteShift`) that all accept
`TenantContext` and enforce: (a) `WHERE companyId = ctx.companyId`,
(b) the assigned employee belongs to the same company, (c) the standard
half-open-interval overlap check `WHERE startsAt < newEnd AND endsAt > newStart`
for the same employee. Three new Server Actions under
`src/actions/shifts/`. One new route group `(schedules)` under
`(dashboard)`, with one page that branches on `ctx.role` to pick the right
repository function. Week navigation uses URL param `?week=YYYY-MM-DD`
where the value is the Monday of the displayed week — no new date library
added (we write a tiny pure helper instead).

## Technical Context

**Language/Version**: TypeScript (strict) on Next.js 16 (App Router), Node.js 24 — carry-over.

**Primary Dependencies**: same stack as Phase 0 + 1. No new dependencies. Date math handled by a small pure-TS helper in `src/lib/week.ts` (Monday-of-week, addDays, format).

**Storage**: Same Neon Postgres. One new migration `add_shift` creating the `Shift` table + indexes.

**Testing**: Manual browser smoke (carry-over per Constitution III). Spec did not request automated tests.

**Target Platform**: Web, modern desktop + mobile browsers (carry-over).

**Project Type**: Same single Next.js project. Adds one route group `(schedules)` under `(dashboard)` + a new repository file + a new actions folder + a small week helper.

**Performance Goals**:
- Create-shift flow < 30 s end-to-end (SC-001)
- Week-view page load < 1.5 s for up to 50 shifts in the week (SC-006)
- Server-side overlap check in a single SQL query (under 50 ms typical)

**Constraints**:
- 100% tenant isolation on read AND write (SC-002): every repository function takes `TenantContext` and joins on `companyId = ctx.companyId`.
- 100% role gating for create/edit/delete (SC-003): each mutation Server Action calls `requireManagerContext()` on entry.
- 100% overlap rejection including across midnight (SC-004): the half-open-interval SQL check `WHERE employeeId = ? AND startsAt < newEnd AND endsAt > newStart` runs inside the same transaction that performs the insert/update.
- Past shifts of deactivated employees remain visible (SC-007): the read queries do NOT filter by `User.isActive`; only the *create-new-shift* employee picker does.
- Bookmarkable week URLs (FR-012): `/schedules?week=YYYY-MM-DD` where the value is the Monday of the displayed week, validated server-side.

**Scale/Scope**: MVP — ≤ 50 shifts per week, ≤ 20 employees per company. No pagination needed.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.0.0 (unchanged).

| Principle | How this plan satisfies it | Verdict |
|-----------|---------------------------|---------|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | New `Shift` table carries `companyId` (denormalised from the assignee for fast filtering). Every repository function in `src/lib/repositories/shift.ts` takes `TenantContext` and includes `where: { companyId: ctx.companyId }`. `createShift` and `updateShift` additionally verify the target employee belongs to `ctx.companyId` before any write. | ✅ PASS |
| **II. Specification-Driven Development (NON-NEGOTIABLE)** | This plan is the output of `/speckit-plan` on `/speckit-specify` output, after `/speckit-constitution`. Implementation will be driven by `/speckit-tasks` → `/speckit-implement`. | ✅ PASS |
| **III. Simplicity First (YAGNI)** | One new entity, one new route group, three new Server Actions. No new dependencies (week math = ~30 lines of pure TS). No recurring/template shifts, no drag-and-drop, no notifications, no time-off, no time clock — all explicitly deferred in the spec's Assumptions. List rendering (not pixel-perfect calendar) for the MVP. | ✅ PASS |
| **IV. Type Safety End-to-End** | `Shift` types come from Prisma's generated client. Server Action inputs validated via Zod (date string parsed to `Date`, times to `0..1439`-minute integers). Week-helper is fully typed (`type WeekRange = { start: Date; end: Date }`). No `any`, no `!` outside framework boundaries. | ✅ PASS |
| **V. Server-Authoritative Authorization** | `/schedules` is guarded by `src/proxy.ts` (adds `/schedules/:path*`). The page calls `requireTenantContext()` for both MANAGER and EMPLOYEE. Every mutation Server Action calls `requireManagerContext()` — an EMPLOYEE invoking the action with a crafted request is rejected at the server. Client-side `pointer-events: none` on edit/delete affordances is presentation only. | ✅ PASS |

**Gate verdict**: All five principles pass. Complexity Tracking section
remains empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-schedules/
├── spec.md
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── pages.md
│   └── server-actions.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 of /speckit pipeline output (not here)
```

### Source Code (delta against Phase 1 baseline)

```text
agendrix/
├── prisma/
│   ├── schema.prisma                              # ★ new model Shift
│   └── migrations/
│       └── <add_shift>/migration.sql              # ★ new
├── src/
│   ├── app/
│   │   └── (dashboard)/
│   │       └── schedules/
│   │           ├── page.tsx                       # ★ week view (role-aware)
│   │           └── _components/
│   │               ├── WeekNav.tsx                # prev/next/this-week
│   │               ├── WeekGrid.tsx               # day-grouped list of shifts
│   │               ├── ShiftRow.tsx               # single shift row
│   │               ├── ShiftDialog.tsx            # create + edit
│   │               └── DeleteShiftDialog.tsx
│   ├── actions/
│   │   └── shifts/
│   │       ├── create.ts                          # ★ createShiftAction
│   │       ├── update.ts                          # ★ updateShiftAction
│   │       └── delete.ts                          # ★ deleteShiftAction
│   ├── lib/
│   │   ├── repositories/
│   │   │   └── shift.ts                           # ★ 5 tenant-scoped fns
│   │   └── week.ts                                # ★ pure date helpers
│   ├── proxy.ts                                    # ★ adds /schedules/:path*
│   ├── app/
│   │   └── (dashboard)/
│   │       └── layout.tsx                          # ★ nav link "Horaires"
│   └── ... (everything else unchanged)
```

**Structure Decision**: `/schedules` lives under `(dashboard)` so it
inherits the auth-required layout and the header. The week navigation
state lives in the URL (Server Component reads `searchParams.week`) — no
client-side state for the displayed week, which means the page is
shareable and SSR-friendly. The page branches on `ctx.role` to pick
between `listShiftsForCompanyWeek(ctx, range)` (MANAGER) and
`listShiftsForUserWeek(ctx, ctx.userId, range)` (EMPLOYEE). Mutation
affordances render only when `ctx.role === "MANAGER"`. The pure
`week.ts` helper avoids pulling in `date-fns` for our 3 date operations.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Empty.

## Post-Design Re-Check

After Phase 1 design:

- **Overlap detection** is a single SQL query inside the same transaction
  that performs the write (Principle I — central enforcement).
- **Week parsing** is server-side from the URL — no client validation can
  bypass it (Principle V).
- The `Shift.companyId` denormalisation is a deliberate trade against
  Principle III ("Simplicity") for a Principle I win (no JOIN on every
  tenant query): noted in `research.md` Decision 2 with rationale.
- `quickstart.md` includes an explicit adversarial test: EMPLOYEE
  attempts to invoke `createShiftAction` directly via crafted form data
  — MUST be rejected (concrete validation of Principle V).

Gate remains: ✅ PASS.

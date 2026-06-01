# Implementation Plan: Time Off

**Branch**: `008-time-off` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-time-off/spec.md`

## Summary

Add a `TimeOffRequest` entity scoped per `Company` + `User`, with date
range, type enum, optional reason, status enum, and decision
metadata. A new `/conges` page (accessible by both EMPLOYEE and
MANAGER) lets users create + cancel their own requests, and lets
MANAGERs see two tabs: "À approuver" (PENDING) and "Historique"
(APPROVED + REJECTED) with Approve / Reject actions.

On the schedules calendar, each `(day × employee)` cell whose date
falls inside an APPROVED request is rendered with a distinctive
overlay (pale tint + dashed border + small "Congé" label). PENDING
days get a lighter treatment (subtle tint + question mark). On any
shift placed in an APPROVED-covered day, the `ShiftBlock` shows an
extra warning marker (absence icon) alongside the existing
off-availability marker — the two coexist.

One Prisma migration. One new repository. Three Server Actions. One
new route. One Sidebar nav entry. Calendar components extended with
one extra prop (per-employee approved date set + pending date set).

## Technical Context

**Language/Version**: TypeScript (strict) on Next.js 16 (App Router), Node.js 24 — carry-over.

**Primary Dependencies**: no new deps. Phase 0–6 stack reused.

**Storage**: Same Neon Postgres. One new migration `add_time_off`:
1. Create `TimeOffRequest` table with `companyId`, `employeeId`, `startDate` (DateTime), `endDate` (DateTime), `type` (Prisma enum), `reason` (String?), `status` (Prisma enum, default PENDING), `decidedAt` (DateTime?), `decidedByUserId` (String?).
2. Create two Prisma enums: `TimeOffType { PAID UNPAID SICK }` and `TimeOffStatus { PENDING APPROVED REJECTED }`.
3. Index `(companyId, employeeId, startDate)` for per-employee + per-week range lookups.
4. Index `(companyId, status)` for the MANAGER "À approuver" tab query.
5. FK `employeeId → User(id)` ON DELETE CASCADE.
6. FK `companyId → Company(id)` ON DELETE CASCADE.
7. FK `decidedByUserId → User(id)` ON DELETE SET NULL (decision survives if the deciding manager is later removed).

**Testing**: Manual browser smoke (carry-over per Constitution III).

**Target Platform**: Web.

**Project Type**: Single Next.js project. New files under
`src/lib/repositories/timeOff.ts`, `src/actions/timeOff/`,
`src/app/(dashboard)/conges/`. Existing files extended:
`prisma/schema.prisma`, `src/proxy.ts`,
`src/components/shell/SidebarNav.tsx`, `src/lib/timeOff.ts` (pure
date helpers), schedules calendar pieces (`page.tsx`,
`ScheduleView.tsx`, `ScheduleCalendar.tsx`, `WeekGridDesktop.tsx`,
`WeekStackedMobile.tsx`, `ShiftBlock.tsx`).

**Performance Goals**:
- `/conges` page renders < 300 ms for ≤ 100 requests.
- Calendar overlay computation < 16 ms (one frame) for ≤ 50 shifts × ≤ 30 days = ≤ 1500 lookups (all `Set.has` on a `Set<string>` of ISO dates).
- Server round-trip on Approve / Reject < 500 ms.

**Constraints**:
- All Phase 0–6 invariants carry over: tenant isolation, role gating, overlap detection on shifts, position colors, availability warnings.
- TimeOff is dual-actor: EMPLOYEE manages their own PENDING; MANAGER decides on any in their company and can also create/edit/delete any. Cross-tenant access MUST be rejected server-side.
- Shift creation/update/delete and DnD MUST NOT be blocked by time-off checks — only visually warned.
- Range overlap check is transactional and considers only PENDING + APPROVED requests of the same employee.

**Scale/Scope**: ≤ 100 requests per employee per year, ≤ 10 employees per company, ≤ 50 shifts/week.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan satisfies it | Verdict |
|-----------|---------------------------|---------|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | New `TimeOffRequest` table carries `companyId`. All repository functions take `TenantContext` and inject `where: { companyId: ctx.companyId }`. Employee resolution and decider resolution are inside the same transaction as the mutation. | ✅ PASS |
| **II. Specification-Driven Development (NON-NEGOTIABLE)** | This plan is `/speckit-plan` output. `/speckit-tasks` and `/speckit-implement` follow. | ✅ PASS |
| **III. Simplicity First (YAGNI)** | One new entity. Two small enums. Pure-date storage (no time component — we use `DateTime @db.Date` to make the lack of timezone explicit). Calendar overlay computed client-side from two `Set<string>` (approved + pending) keyed by `"employeeId|YYYY-MM-DD"`. No notifications, no balance, no policy, no recurrence. The Dialog from US1 reuses the same form for MANAGER edits in the future (deferred). | ✅ PASS |
| **IV. Type Safety End-to-End** | `TimeOffRequest`, `TimeOffType`, `TimeOffStatus` are Prisma-generated. Server Action input is Zod-validated (`type z.enum`, `status z.enum`, `startDate z.string()` parsed to `Date` via `parseISODate`, refinement `endDate >= startDate`, optional `reason z.string().max(280)`). The per-employee date sets are typed `Map<string, { approved: Set<string>; pending: Set<string> }>`. | ✅ PASS |
| **V. Server-Authoritative Authorization** | `/conges` route guarded by `requireTenantContext`. The dual-actor check ("EMPLOYEE on their own PENDING only" vs "MANAGER on anyone in company") is enforced inside the repository, identical pattern to Phase 6. APPROVE / REJECT specifically check `ctx.role === "MANAGER"`. Proxy adds `/conges` to its protected prefix list. | ✅ PASS |

**Gate verdict**: 5/5 PASS. Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/008-time-off/
├── spec.md
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── server-actions.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks output
```

### Source Code (delta against Phase 6 baseline)

```text
agendrix/
├── prisma/
│   ├── schema.prisma                                # ★ adds TimeOffRequest + 2 enums
│   └── migrations/
│       └── <add_time_off>/migration.sql            # ★ new
├── src/
│   ├── proxy.ts                                     # ★ adds "/conges" to PROTECTED_PREFIXES
│   ├── app/
│   │   └── (dashboard)/
│   │       ├── conges/                              # ★ NEW route
│   │       │   ├── page.tsx                         # Server Component: fetches per-role data
│   │       │   └── _components/
│   │       │       ├── TimeOffPageClient.tsx        # Client wrapper: tabs + state for dialogs
│   │       │       ├── EmployeeRequestList.tsx      # EMPLOYEE list of their own requests
│   │       │       ├── ManagerPendingList.tsx       # MANAGER "À approuver" tab
│   │       │       ├── ManagerHistoryList.tsx       # MANAGER "Historique" tab
│   │       │       ├── TimeOffRequestRow.tsx        # one-row card with dates + type + status badge
│   │       │       ├── CreateTimeOffDialog.tsx      # creation form (EMPLOYEE flow)
│   │       │       ├── DecideTimeOffDialog.tsx      # Approve / Reject confirmation
│   │       │       └── CancelTimeOffDialog.tsx      # EMPLOYEE-side cancellation confirmation
│   │       └── schedules/
│   │           ├── page.tsx                         # ★ fetches timeOffByEmployee, passes down
│   │           └── _components/
│   │               ├── ScheduleView.tsx             # ★ accepts timeOffByEmployee prop
│   │               ├── ScheduleCalendar.tsx        # ★ accepts + forwards
│   │               ├── WeekGridDesktop.tsx         # ★ overlays cell tint + label per (day, emp)
│   │               ├── WeekStackedMobile.tsx       # ★ overlays per (day, emp)
│   │               └── ShiftBlock.tsx              # ★ renders absence marker when in APPROVED day
│   ├── actions/
│   │   └── timeOff/
│   │       ├── create.ts                            # ★ NEW (EMPLOYEE or MANAGER)
│   │       ├── decide.ts                            # ★ NEW (MANAGER only — Approve | Reject)
│   │       └── delete.ts                            # ★ NEW (own-PENDING or MANAGER any)
│   ├── components/
│   │   └── shell/
│   │       └── SidebarNav.tsx                       # ★ adds "Congés" nav item (all roles)
│   ├── lib/
│   │   ├── timeOff.ts                               # ★ NEW: date enumeration + status labels
│   │   └── repositories/
│   │       └── timeOff.ts                           # ★ NEW: 5 tenant-scoped fns
│   └── generated/prisma/                             # regenerated by `prisma migrate dev`
```

**Structure Decision**: The `/conges` page is a Server Component
that branches on `ctx.role`. For an EMPLOYEE, it renders a single
list of their own requests (sorted descending by `startDate`). For a
MANAGER, it fetches all company requests once and partitions them
into two lists (PENDING vs decided) on the server, then renders the
client wrapper `TimeOffPageClient` which manages tab state and the
dialogs.

Date storage uses Prisma's `DateTime` typed as PostgreSQL `DATE` via
`@db.Date`, giving us pure dates without a time-of-day. The
calendar's overlay keys are local ISO dates (`YYYY-MM-DD`); the
helper `enumerateDates(startDate, endDate)` returns the inclusive
list as ISO strings. This makes the cell-overlay check a single
`approvedDays.has(\`${empId}|${dateISO}\`)` test.

Overlap detection mirrors Phase 6: a half-open-interval probe
filtered by `(employeeId, status IN (PENDING, APPROVED))` inside the
same transaction as the insert/update.

## Complexity Tracking

No violations. Empty.

## Post-Design Re-Check

After Phase 1 design:

- `TimeOffRequest` is the only new table; two enums are local to it.
- The dual-actor check fits cleanly in the repository: every mutation
  accepts `(ctx, …)` and resolves authorization from the existing
  row (for update/delete/decide) or from the form input (for create).
- Overlap check considers only PENDING + APPROVED — REJECTED rows
  are inert. A simple `status: { in: ["PENDING", "APPROVED"] }`
  clause in the probe.
- The schedules page adds one extra fetch:
  `listApprovedAndPendingTimeOffForWeek(ctx, range)` — bounded to the
  visible week (`endDate >= weekStart AND startDate <= weekEnd`).
  ≤ 10 employees × ≤ a few requests/week = trivial.
- DnD pipeline unchanged: the absence marker is a render-time check
  against the same `Set<string>` already used for cell overlay.
- Proxy receives one new protected prefix.
- Cross-warning composition: `ShiftBlock` now considers two booleans
  — `isOffAvailability` and `isOnApprovedTimeOff` — and renders both
  badges if both are true. The amber ring used in Phase 6 carries
  over; the absence marker is an additional small icon.

Gate remains ✅ PASS.

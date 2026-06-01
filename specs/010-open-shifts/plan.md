# Implementation Plan: Open Shifts

**Branch**: `010-open-shifts` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-open-shifts/spec.md`

## Summary

Make `Shift.employeeId` nullable. Add a new `ShiftClaim` entity
representing an EMPLOYEE's request to take an open shift, with
`status ClaimStatus { PENDING APPROVED REJECTED }` and the same
decision metadata pattern used by Phase 7 (`decidedAt` +
`decidedByUserId`).

UI surface: a new `/quarts-a-combler` page listing PUBLISHED open
shifts for any authenticated tenant user (with per-user claim state
overlaid). The MANAGER calendar gains a dedicated "Quarts à combler"
row when grouped by employee. The `ShiftDialog` accepts the explicit
"Aucun employé" option and, when editing an open shift with claims,
shows the requester list with an "Attribuer à …" action that runs an
atomic transaction: assign + APPROVE the chosen claim + REJECT the
others.

One Prisma migration. One new repository. Three new Server Actions
(`createClaim`, `cancelClaim`, `assignOpenShift`). Modifications to
the existing shift create/update actions to allow null employeeId.

## Technical Context

**Language/Version**: TypeScript (strict) on Next.js 16 — carry-over.

**Primary Dependencies**: no new deps.

**Storage**: One new migration `add_open_shifts_and_claims`:
1. Make `Shift.employeeId` nullable. (Prisma generates an `ALTER COLUMN … DROP NOT NULL`.)
2. Add Prisma enum `ClaimStatus { PENDING APPROVED REJECTED }`.
3. Create `ShiftClaim` table with `companyId`, `shiftId`, `employeeId`, `status`, `decidedAt`, `decidedByUserId`, timestamps.
4. Unique constraint `(shiftId, employeeId)` — same employee cannot claim the same shift twice.
5. Indexes on `(companyId, status)` (drives the filter-panel badge count) and `(shiftId)` (drives the per-shift requester list inside the dialog).
6. FKs: `companyId → Company ON DELETE CASCADE`, `shiftId → Shift ON DELETE CASCADE`, `employeeId → User ON DELETE CASCADE`, `decidedByUserId → User ON DELETE SET NULL`.

**Testing**: Manual browser smoke.

**Target Platform**: Web.

**Project Type**: Single Next.js project. New files under
`src/lib/repositories/shiftClaim.ts`, `src/actions/openShifts/`,
`src/app/(dashboard)/quarts-a-combler/`. Existing files extended:
`prisma/schema.prisma`, `src/lib/repositories/shift.ts`,
`src/actions/shifts/{create,update}.ts`, `src/proxy.ts`,
`src/components/shell/SidebarNav.tsx`, schedules calendar
(`page.tsx`, `WeekGridDesktop.tsx`, `ShiftBlock.tsx`,
`ShiftDialog.tsx`), `FilterPanel.tsx` (badge count).

**Performance Goals**:
- `/quarts-a-combler` page renders < 300 ms for ≤ 50 open shifts.
- Claim creation / cancellation Server Action < 500 ms.
- `assignOpenShift` transaction (assign + decide all sibling claims) < 700 ms for ≤ 10 requesters per shift.

**Constraints**:
- All Phase 0–8 invariants carry over: tenant isolation, role gating, overlap detection, Phase 8 DRAFT/PUBLISHED filter.
- An EMPLOYEE who claims an open shift MUST not bypass the DRAFT filter — only PUBLISHED open shifts are visible to them.
- `assignOpenShift` must be transactional (FR-010 + SC-004): rollback any partial state.
- Overlap detection on the assignee at attribution time: if the chosen employee already has a shift overlapping the open shift's time window, the transaction MUST throw `ASSIGNEE_OVERLAP` and rollback.

**Scale/Scope**: ≤ 50 open shifts/week, ≤ 10 requesters per shift, ≤ 10 employees/company.

## Constitution Check

| Principle | How this plan satisfies it | Verdict |
|-----------|---------------------------|---------|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | `ShiftClaim` carries `companyId`. All repository functions filter on `companyId = ctx.companyId`. Cross-shift / cross-employee verifications live inside the transaction with the company filter. | ✅ PASS |
| **II. SDD** | This plan follows `/speckit-plan`. | ✅ PASS |
| **III. Simplicity First (YAGNI)** | One new table, one new enum, three Server Actions, one new page. The MANAGER UI reuses the existing shift dialog for the "assign" action. No auto-matching, no recommended-employee algorithm, no notifications. | ✅ PASS |
| **IV. Type Safety End-to-End** | `ClaimStatus`, `ShiftClaim`, and the now-nullable `Shift.employeeId` are Prisma-generated. The `WeekShift` type widens its `employeeId` to `string | null`. The dialog branches on the new `isOpenShift` boolean. | ✅ PASS |
| **V. Server-Authoritative Authorization** | `createClaim` and `cancelClaim` use `requireTenantContext` + actor-target check inside the repository. `assignOpenShift` uses `requireManagerContext`. The DRAFT/PUBLISHED visibility rule for EMPLOYEEs lives in the repository read function for the `/quarts-a-combler` page. | ✅ PASS |

**Gate verdict**: 5/5 PASS. Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/010-open-shifts/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/server-actions.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (delta against Phase 8 baseline)

```text
agendrix/
├── prisma/
│   ├── schema.prisma                                # ★ Shift.employeeId nullable + ClaimStatus + ShiftClaim
│   └── migrations/
│       └── <add_open_shifts_and_claims>/migration.sql
├── src/
│   ├── proxy.ts                                     # ★ adds "/quarts-a-combler"
│   ├── app/
│   │   └── (dashboard)/
│   │       ├── quarts-a-combler/                    # ★ NEW route
│   │       │   ├── page.tsx                         # Server Component, per-role fetch
│   │       │   └── _components/
│   │       │       ├── OpenShiftsList.tsx          # client wrapper
│   │       │       ├── OpenShiftCard.tsx           # one card with claim button + status badge
│   │       │       ├── ClaimShiftDialog.tsx        # confirmation
│   │       │       └── CancelClaimDialog.tsx       # confirmation
│   │       └── schedules/
│   │           ├── page.tsx                         # ★ fetches claimsByShift map
│   │           └── _components/
│   │               ├── ScheduleView.tsx
│   │               ├── ScheduleCalendar.tsx
│   │               ├── WeekGridDesktop.tsx          # ★ renders "Quarts à combler" row
│   │               ├── ShiftBlock.tsx              # ★ open-shift visual + claim count badge
│   │               ├── ShiftDialog.tsx              # ★ adds "Aucun employé" option + Assignee list
│   │               ├── AssignClaimDialog.tsx        # ★ NEW: chooses the winner and dispatches
│   │               └── FilterPanel.tsx              # ★ "Quarts à combler" badge count
│   ├── actions/
│   │   ├── shifts/
│   │   │   ├── create.ts                            # ★ accepts employeeId = null
│   │   │   └── update.ts                            # ★ accepts employeeId = null
│   │   └── openShifts/
│   │       ├── createClaim.ts                       # ★ NEW
│   │       ├── cancelClaim.ts                       # ★ NEW
│   │       └── assignOpenShift.ts                   # ★ NEW
│   ├── components/
│   │   └── shell/
│   │       └── SidebarNav.tsx                       # ★ adds "Quarts à combler" nav item (all roles)
│   ├── lib/
│   │   └── repositories/
│   │       ├── shift.ts                              # ★ extended: list with employeeId null filter
│   │       └── shiftClaim.ts                         # ★ NEW: 5 tenant-scoped fns
│   └── generated/prisma/                             # regenerated
```

**Structure Decision**: Open shifts are NOT a new entity — they are
`Shift` rows with `employeeId = NULL`. The data model is unchanged
except for the column nullability and the new `ShiftClaim` table.

The MANAGER calendar splits its existing `EmployeeGrid` to inject a
dedicated "Quarts à combler" row at the top (or bottom) containing
all shifts with `employeeId IS NULL` for the visible week. The same
`ShiftBlock` renders these with a distinct visual (icon `UserX` + a
discreet count of pending claims).

The `ShiftDialog` already accepts a `shift: WeekShift | null` for
edit mode. We add an "Aucun employé" option to the existing
employee `<select>` and a conditional "Demandes" section that
renders only when `shift?.employeeId === null` AND `shift?.status ===
"PUBLISHED"`.

The `/quarts-a-combler` page reads open PUBLISHED shifts plus the
session user's existing claims, and renders a card per shift with
either a "Je veux ce quart" button or a status badge (Demande
envoyée / Refusée).

## Complexity Tracking

No violations. Empty.

## Post-Design Re-Check

- Nullable `Shift.employeeId` is a small but real schema change. We rely on the existing FK + ORM to handle null gracefully (no joined `employee` relation on open shifts).
- `Shift.employeeId` going from required to optional requires an explicit `DROP NOT NULL` migration step.
- `assignOpenShift` is the only transactional path with non-trivial logic — it (a) re-verifies the chosen claim is on a still-open shift, (b) flips that claim to APPROVED, (c) flips peers to REJECTED with the same `decidedAt`/`decidedByUserId`, (d) sets `shift.employeeId`, (e) re-runs the assignee overlap check to prevent double-booking. All inside one `$transaction`.
- The schedules page gains `claimsByShift: Map<string, ClaimRow[]>` for the MANAGER (used in the dialog) and a single sum count for the filter-panel badge.
- The `/quarts-a-combler` page needs only the session user's own claims (the EMPLOYEE doesn't see others') → fetch `listClaimsForEmployee(ctx, ctx.userId, { status: PENDING })` and map onto the open-shifts list.
- The DRAFT/PUBLISHED filter (Phase 8) composes naturally: the open-shifts query for EMPLOYEEs adds `status: "PUBLISHED"` on top of `employeeId: null`.

Gate remains ✅ PASS.

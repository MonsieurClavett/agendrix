# Implementation Plan: Publish Workflow

**Branch**: `009-publish-workflow` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-publish-workflow/spec.md`

## Summary

Extend the existing `Shift` entity with a `status` enum (`DRAFT` |
`PUBLISHED`). New shifts default to `DRAFT`. EMPLOYEE-facing read
paths (already a single repository function) filter on
`status: "PUBLISHED"`. MANAGER read paths return all shifts. The
calendar shows `DRAFT` shifts with a "Brouillon" badge + dashed
border + reduced opacity. A new toolbar button "Publier la semaine"
opens a confirmation dialog and dispatches a Server Action that
flips every `DRAFT` shift in the visible week to `PUBLISHED` in a
single update. An unpublish path lives in the shift edit dialog,
visible only when the shift is `PUBLISHED`.

One Prisma migration (column + default + backfill all existing rows
to `PUBLISHED`). One new Server Action (`publishWeek`). One new
Server Action (`unpublishShift`). One toolbar entry. One badge.
Smallest UI surface of the three phases.

## Technical Context

**Language/Version**: TypeScript (strict) on Next.js 16 — carry-over.

**Primary Dependencies**: no new deps.

**Storage**: One new migration `add_shift_status`:
1. Define a Prisma enum `ShiftStatus { DRAFT PUBLISHED }`.
2. Add `status ShiftStatus NOT NULL DEFAULT 'DRAFT'` to `Shift`.
3. Backfill all existing rows to `PUBLISHED` (data-preserving — pre-Phase-8 shifts were already visible to employees).
4. Add a partial index `(companyId, status)` to make the EMPLOYEE filter and the publish-week query cheap.

**Testing**: Manual browser smoke.

**Project Type**: Single Next.js project. Files modified:
`prisma/schema.prisma`, `src/lib/repositories/shift.ts`,
`src/app/(dashboard)/schedules/page.tsx`,
`src/app/(dashboard)/schedules/_components/*` (toolbar + block).
New files: `src/actions/shifts/publishWeek.ts`,
`src/actions/shifts/unpublish.ts`.

**Performance Goals**:
- `publishWeek` Server Action < 500 ms for ≤ 50 shifts.
- EMPLOYEE schedule fetch < 200 ms (the extra `status` filter is on an indexed column).

**Constraints**:
- The status filter MUST be applied at the repository layer, not the page or component. Constitution Principle V plus FR-012 (the leak must be impossible even via a crafted URL).
- The transition `PUBLISHED → DRAFT` (unpublish) MUST require MANAGER role and tenant match — already guaranteed by `requireManagerContext`.
- Backfill MUST run inside the migration so the deployment is atomic.

**Scale/Scope**: ≤ 50 shifts/week, ≤ 10 employees/company.

## Constitution Check

| Principle | How this plan satisfies it | Verdict |
|-----------|---------------------------|---------|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | The new column is on the existing `Shift` table; every existing repository read already filters on `companyId`. The `publishWeek` repository function adds `status: "DRAFT"` to the same `where` clause. Cross-tenant leak impossible. | ✅ PASS |
| **II. Specification-Driven Development (NON-NEGOTIABLE)** | This plan follows `/speckit-plan`. | ✅ PASS |
| **III. Simplicity First (YAGNI)** | One new enum, one new column. No new table, no new page, no notifications. The publish UI is a single button in the existing toolbar. | ✅ PASS |
| **IV. Type Safety End-to-End** | `ShiftStatus` is Prisma-generated. Server Action inputs are Zod-validated. The `WeekShift` type gains a `status` field. | ✅ PASS |
| **V. Server-Authoritative Authorization** | `publishWeek` and `unpublishShift` use `requireManagerContext`. EMPLOYEE read paths filter on `status: "PUBLISHED"` inside the repository. | ✅ PASS |

**Gate verdict**: 5/5 PASS. Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/009-publish-workflow/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/server-actions.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (delta against Phase 7 baseline)

```text
agendrix/
├── prisma/
│   ├── schema.prisma                                # ★ adds ShiftStatus enum + Shift.status
│   └── migrations/
│       └── <add_shift_status>/migration.sql        # ★ new (includes backfill)
├── src/
│   ├── actions/
│   │   └── shifts/
│   │       ├── create.ts                            # ★ extended: default status: "DRAFT"
│   │       ├── update.ts                            # ★ extended: preserve existing status
│   │       ├── publishWeek.ts                       # ★ NEW
│   │       └── unpublish.ts                         # ★ NEW
│   ├── app/
│   │   └── (dashboard)/
│   │       └── schedules/
│   │           ├── page.tsx                         # ★ passes draftCount to ScheduleView
│   │           └── _components/
│   │               ├── ScheduleView.tsx             # ★ accepts draftCount; passes to toolbar
│   │               ├── ScheduleToolbar.tsx          # ★ adds "Publier la semaine" button
│   │               ├── PublishWeekDialog.tsx        # ★ NEW (confirmation dialog)
│   │               ├── ScheduleCalendar.tsx        # ★ passes draftCount up
│   │               ├── ShiftBlock.tsx              # ★ renders "Brouillon" badge + opacity when DRAFT
│   │               └── ShiftDialog.tsx              # ★ adds "Dépublier" button for PUBLISHED shifts
│   └── lib/
│       └── repositories/
│           └── shift.ts                              # ★ extended: list filters on status, new publishWeek + setStatus fns
```

**Structure Decision**: The status column is added to the existing
`Shift` table — no new entity. The EMPLOYEE read path already
flows through `listShiftsForUserWeek(ctx, userId, range)`, so the
filter `status: "PUBLISHED"` is added there. The MANAGER read path
`listShiftsForCompanyWeek(ctx, range)` is left unchanged (returns
all statuses). The new repository function `publishDraftsForWeek`
takes a `(ctx, range)` and runs `updateMany({ where: { companyId, status: "DRAFT", startsAt: { lt: end }, endsAt: { gt: start } }, data: { status: "PUBLISHED" } })`.

The toolbar's button uses `draftCount` to disable itself when
nothing is publishable. The confirmation dialog quotes the count
and the range explicitly to match FR-006.

The `ShiftBlock` styling for `DRAFT` uses `opacity-70` plus a
dashed border and a small `Badge` in the top-right corner that
reads "Brouillon".

## Complexity Tracking

No violations. Empty.

## Post-Design Re-Check

- The single new column on `Shift` is the minimum surface compatible with the spec.
- The backfill (`UPDATE "Shift" SET status = 'PUBLISHED'`) keeps the deployment atomic and preserves the visible behavior for current users.
- The new repository function `publishDraftsForWeek` is a one-shot `updateMany` — no transaction needed (atomic at the row level).
- `unpublishShift` is a tiny variant of `updateShift` but only flips status; it doesn't re-run overlap checks (status change doesn't change time).
- The schedules page gains one extra count fetch (`countDraftsForCompanyWeek`) for the disabled-state of the publish button. ≤ 50 rows scanned with an indexed `(companyId, status)` — negligible.
- Drag-and-drop is unchanged at the action level — the existing `updateShift` does NOT touch status.
- The Phase 6 and Phase 7 markers continue to fire on all shifts (MANAGER) or only on visible shifts (EMPLOYEE), which falls out naturally from filtering at the repository layer.

Gate remains ✅ PASS.

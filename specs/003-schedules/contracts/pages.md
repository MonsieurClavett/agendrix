# Page Contracts (Phase 2 additions)

**Feature**: Weekly Schedules
**Date**: 2026-05-28

| Path                                       | File                                                       | Auth required? | Role required?  | On no-session            | On wrong role | Server-side assertion                                                                          |
|--------------------------------------------|------------------------------------------------------------|----------------|-----------------|--------------------------|---------------|------------------------------------------------------------------------------------------------|
| `/schedules`                               | `src/app/(dashboard)/schedules/page.tsx`                  | YES            | any             | Redirect → `/login`      | n/a           | `await requireTenantContext()`; branches behavior on `ctx.role`.                              |
| `/schedules?week=YYYY-MM-DD`               | (same file)                                                | YES            | any             | Redirect → `/login`      | n/a           | `searchParams.week` parsed + snapped to the Monday of that week; bad input falls back to today's Monday. |

## proxy.ts matcher update

Add `/schedules/:path*`:

```text
matcher: ["/dashboard/:path*", "/team/:path*", "/schedules/:path*"]
```

## Page behavior summary

- `ctx = await requireTenantContext()`
- `week = parseWeekFromSearchParams(searchParams.week)` — `WeekRange { start: Monday-00:00, end: Sunday-23:59:59.999 }`
- if `ctx.role === "MANAGER"`:
  - `users = await listUsersInCompany(ctx)` (active, for the picker)
  - Also include the currently-assigned-but-deactivated users for edit dialogs, fetched on demand
  - `shifts = await listShiftsForCompanyWeek(ctx, week)`
  - Render: heading + WeekNav + WeekGrid (with edit/delete affordances per row) + "Add shift" button → opens ShiftDialog
- if `ctx.role === "EMPLOYEE"`:
  - `shifts = await listShiftsForUserWeek(ctx, ctx.userId, week)`
  - Render: heading + WeekNav + WeekGrid (no affordances) — read-only

## Dashboard layout nav update

`src/app/(dashboard)/layout.tsx` adds a nav link "Horaires" → `/schedules` for ALL authenticated users (no role gate this time).

## URL-to-user-story mapping

| Route                                                         | User story  | Acceptance criterion link                                  |
|---------------------------------------------------------------|-------------|------------------------------------------------------------|
| `/schedules` (MANAGER, current week)                          | US1, US2    | spec.md → US1/2                                            |
| `/schedules?week=2026-06-15` (MANAGER, future week)           | US2         | spec.md → US2 Acceptance Scenarios 2 + SC-005              |
| `/schedules` (EMPLOYEE)                                       | US3         | spec.md → US3 Acceptance Scenarios 1, 3                    |
| `/schedules` (EMPLOYEE) after manager deactivates them        | n/a (rejected at login boundary)| n/a — Auth.js authorize() denies before page render |

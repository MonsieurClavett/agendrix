# Phase 1 — Data Model (Phase 3)

**Feature**: Calendar UX Overhaul
**Date**: 2026-05-28

## Database entities

**No changes.** Phase 3 is presentation-layer only. `Company`, `User`,
and `Shift` carry over from Phase 2 unchanged. No migration in this
phase.

## Client-side transient state

### ThemePreference

A presentation preference stored in an HTTP cookie.

| Field   | Type                 | Notes                                                       |
|---------|----------------------|-------------------------------------------------------------|
| `value` | `"light" \| "dark"`  | Absent / unknown → fall back to OS `prefers-color-scheme`. |

- **Cookie name**: `agendrix-theme`
- **Cookie path**: `/`
- **Max-Age**: ~31,536,000 seconds (1 year)
- **HttpOnly**: false (the client needs to flip the class on toggle)
- **Secure**: true in production
- **SameSite**: `Lax`

Read on every server render by the root layout (via `next/headers`
`cookies()`) and applied as a `class="dark"` on `<html>` before the
body renders. Updated by the `ThemeToggle` client component via
`document.cookie` AND by the next-themes provider.

### Optimistic shift state (drag-and-drop)

A purely in-memory React state used by the schedule page to
immediately reflect a drag-and-drop while the Server Action settles.
Held in `useOptimistic` against the authoritative shift list returned
by the Server Component.

| State action                                            | Effect                                                                                  |
|---------------------------------------------------------|-----------------------------------------------------------------------------------------|
| `{ type: "move", shiftId, toDate, toEmployeeId }`       | Updates the matching shift's `startsAt` / `endsAt` (date part) and `employeeId`.        |
| (server settled)                                        | Optimistic state resets to match the new authoritative list from `router.refresh()`.    |
| `{ type: "rollback", shiftId }`                         | Explicit rollback handler if the server returned `OVERLAP` or another error.            |

No persistence, no DB. State lives only in the page component's React tree.

## Invariants

- All Phase 0 / 1 / 2 invariants carry over unchanged (tenant
  isolation, role gating, overlap rejection).
- The drag-and-drop reassignment MUST preserve the shift's time-of-day:
  the client computes a new `startsAt` by combining `toDate` with the
  shift's original local time (`getHours()` / `getMinutes()`), and
  `endsAt` = `startsAt + (originalEndsAt - originalStartsAt)`.
- The theme cookie value MUST be one of `"light"` or `"dark"`; any
  other value is treated as absent (system default).

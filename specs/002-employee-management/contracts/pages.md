# Page Contracts (Phase 1 additions)

**Feature**: Employee Management
**Date**: 2026-05-28

All paths build on Phase 0's route table. Only new or changed routes are
listed.

| Path            | File                                              | Auth required? | Role required? | On no-session            | On wrong role                       | Server-side assertion                       |
|-----------------|---------------------------------------------------|----------------|----------------|--------------------------|-------------------------------------|---------------------------------------------|
| `/team`         | `src/app/(dashboard)/team/page.tsx`               | YES            | **MANAGER**    | Redirect → `/login`      | Redirect → `/dashboard` (flash msg) | `await requireManagerContext()` at page top |
| `/dashboard`    | (Phase 0, unchanged)                              | YES            | any            | Redirect → `/login`      | n/a                                 | `await requireTenantContext()`              |
| `/login`        | (Phase 0)                                         | No             | n/a            | Renders normally         | n/a                                 | none                                        |
| `/signup`       | (Phase 0)                                         | No             | n/a            | Renders normally         | n/a                                 | none                                        |
| `/api/auth/...` | (Phase 0)                                         | mixed          | n/a            | handled by Auth.js       | n/a                                 | Auth.js handler                             |

## proxy.ts matcher update

Add `/team/:path*` to the protected prefixes alongside `/dashboard/:path*`:

```text
matcher: ["/dashboard/:path*", "/team/:path*"]
```

(Behavior: same redirect-to-login on no session.)

## Layout-level role gate

`src/app/(dashboard)/team/layout.tsx` is a new layout that calls
`requireManagerContext()`. On the `FORBIDDEN` throw it should `redirect("/dashboard?error=forbidden")` so the dashboard page can flash the
"vous n'avez pas accès" message.

(Implementation note: catching the `FORBIDDEN` throw cleanly is most
easily done by NOT throwing from `requireManagerContext()` inside the
layout — instead, the layout calls `requireTenantContext()`, inspects
the role, and redirects on mismatch. This keeps the throwing helper for
Server Actions where a thrown error is the right shape.)

## Dashboard flash message

`/dashboard` reads `?error=forbidden` from the URL and (if present)
renders a one-time banner like
"Vous n'avez pas accès à la gestion d'équipe.". The URL parameter is
client-readable and not security-sensitive (it carries no identifier).

## URL-to-user-story mapping

| Route                                              | User story | Acceptance criterion link                  |
|----------------------------------------------------|------------|--------------------------------------------|
| `/team` (MANAGER)                                  | US1/US2/US3| spec.md → US1/2/3                          |
| `/team` (EMPLOYEE, attempt)                        | US1 access | spec.md → FR-002 + Edge Case (employee navigates) |
| `/dashboard?error=forbidden`                       | US1 access | spec.md → FR-002                           |
| `/login` (deactivated user attempt)                | US3        | spec.md → US3 Acceptance Scenarios 2 + FR-014 |

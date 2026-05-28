# Page Contracts

**Feature**: Multi-Tenant Foundations
**Date**: 2026-05-28

All routes are App Router page components under `src/app/`. Every route
documents its auth requirement and the entry assertion it makes.

| Path        | File                                         | Auth required? | On no-session         | Server-side assertion           |
|-------------|----------------------------------------------|----------------|-----------------------|---------------------------------|
| `/`         | `src/app/page.tsx`                           | No             | Renders normally      | None — public landing.          |
| `/signup`   | `src/app/(auth)/signup/page.tsx`             | No             | Renders normally      | None.                           |
| `/login`    | `src/app/(auth)/login/page.tsx`              | No             | Renders normally      | None.                           |
| `/dashboard`| `src/app/(dashboard)/dashboard/page.tsx`     | YES            | Redirect `→ /login?callbackUrl=/dashboard` (via `src/proxy.ts`) | `await requireTenantContext()` — throws `UNAUTHENTICATED` if no verified session. |
| `/api/auth/[...nextauth]` | `src/app/api/auth/[...nextauth]/route.ts`| Mixed         | Handled by Auth.js     | Re-exports `GET`, `POST` from `@/auth`. |

## Layout-level guards

- `src/app/(dashboard)/layout.tsx` is a Server Component that calls
  `requireTenantContext()` and `getCurrentCompany(ctx)` before rendering its
  children. Any sub-route in the `(dashboard)` group is therefore
  double-guarded (proxy + layout).

## Middleware (proxy.ts)

Next 16 renamed `middleware.ts` → `proxy.ts`. Same export shape.

- **Matcher**: `/dashboard/:path*`
- **Behavior**: if `req.auth` is absent on a matched request, redirect to
  `/login?callbackUrl=<original-path>`. Otherwise pass through.

This is the first-line guard. The page-level `requireTenantContext()` is the
authoritative check (defense in depth).

## URL-to-user-story mapping

| Route                                         | User story | Acceptance criterion link                |
|-----------------------------------------------|------------|------------------------------------------|
| `/signup` → submit → `/dashboard`             | US1 (P1)   | spec.md → US1 Acceptance Scenarios 1     |
| `/login` → submit → `/dashboard`              | US2 (P2)   | spec.md → US2 Acceptance Scenarios 1     |
| `/dashboard` → "Sign out" → `/login`          | US2 (P2)   | spec.md → US2 Acceptance Scenarios 4     |
| `/dashboard` (no session) → `/login?callbackUrl=/dashboard` | US2/US3 | spec.md → US3 Acceptance Scenarios 2 + FR-014 |
| `/dashboard` (signed in) shows scoped data    | US3 (P3)   | spec.md → US3 Acceptance Scenarios 1, 2  |

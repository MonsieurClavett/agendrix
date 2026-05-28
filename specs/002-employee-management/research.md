# Phase 0 — Research & Stack Decisions (Phase 1 feature)

**Feature**: Employee Management
**Date**: 2026-05-28

The spec contained zero `NEEDS CLARIFICATION` markers. The stack carries
over from Phase 0 in full; only the additions specific to team management
are recorded below.

---

## Decision 1: Soft delete via `isActive` boolean (NOT `deletedAt` timestamp)

**Decision**: Add `isActive Boolean @default(true)` to `User`. Deactivation
sets it to `false`; reactivation sets it back to `true`. No timestamp
column.

**Rationale**:
- The spec asks for "active vs deactivated" as a binary state, not for
  "when was this deleted". A boolean is the smallest representation
  of that intent.
- Login filtering becomes `WHERE isActive = true` — trivial to read.
- A timestamp column would be needed if the product later wants "show
  recently deactivated users" or "auto-purge after 30 days" — both
  explicitly out of scope per the spec's Assumptions.

**Alternatives considered**:
- **`deletedAt DateTime?`** (Prisma's typical soft-delete pattern):
  carries more information but requires more thought everywhere (null
  vs not-null checks). YAGNI — not added until a feature demands it.
- **Separate `DeactivatedUser` archive table**: maximum separation but
  shatters joins and double-counts the entity. Bad fit.

---

## Decision 2: Temporary password format

**Decision**: 16-character base32 string derived from
`crypto.randomBytes(10)`. Crockford alphabet (no 0/O/I/L confusion). Hashed
with `bcryptjs.hash(plain, 10)` before persistence. Plaintext returned to
the inviting MANAGER's UI exactly once, never logged.

**Rationale**:
- 10 bytes of entropy = 80 bits, well above the brute-force threshold
  for a credential displayed once and copied to a colleague.
- Base32 (Crockford) is human-readable when dictated verbally or
  written down ("paste this for your new hire" workflows).
- Hashing with the same bcrypt cost as Phase 0 (`10`) keeps the
  authorization path uniform.

**Alternatives considered**:
- **UUID v4**: more entropy but harder to type. Wins only if the
  invitee receives it via clickable email (out of scope).
- **Random word phrases (BIP39)**: friendly but require an extra dep
  for a single throwaway flow.
- **Skip temp password entirely; send magic link email**: requires SMTP,
  which is explicitly out of scope per the spec's Assumptions.

---

## Decision 3: Where to enforce the "≥ 1 active MANAGER" invariant

**Decision**: Inside the repository functions that mutate the affecting
state (`setUserActiveStatus`, `updateUserById`), checked in the SAME
`db.$transaction` that performs the mutation.

**Rationale**:
- Single enforcement point → impossible to forget at a call site
  (Principle I: structural, not conventional).
- Transactional consistency → no race where two concurrent demotions
  both pass the "≥ 1 manager" check then both commit.
- Server Actions can rely on "if the repo function returned without
  throwing, the invariant holds" — no defensive double-checks at the
  Server Action layer.

**Alternatives considered**:
- **Application-level pre-check** (count managers, then mutate): trivially
  racy. Two concurrent demotes both see "2 managers", both commit, end
  state = 0 managers. Rejected.
- **Postgres CHECK constraint**: impossible to express "≥ 1 active MANAGER
  per company" as a CHECK on the `User` table. Would need a trigger,
  which Prisma doesn't manage natively. Heavy.
- **Application-level lock**: introduces global mutex state that's hard
  to reason about. Transaction-scoped query is simpler.

---

## Decision 4: Login-time rejection of deactivated users

**Decision**: Auth.js `authorize()` callback (in `src/auth.ts`) returns
`null` whenever the user row has `isActive: false`. Auth.js converts the
`null` into the same `CredentialsSignin` error that wrong-password and
no-such-email already produce — yielding the existing uniform error
message.

**Rationale**:
- Reuses the existing uniform-error machinery (Phase 0 FR-010) for free.
  No new code path produces a distinguishable message for "this account
  was deactivated".
- One-line change to `authorize()`. No middleware, no extra hook.

**Alternatives considered**:
- **Custom error code surfaced to UI**: bad — leaks the existence of a
  deactivated account, breaking SC-003.
- **Filter `isActive: false` out of the user lookup query**: equivalent
  in effect, but means the `authorize()` function never knows the row
  was inactive, which makes future logging / metrics harder. The
  `null`-from-`authorize()` path is more explicit.

---

## Decision 5: Where MANAGER-only role gating lives

**Decision**: Three layers of defense in depth, in order:
1. `src/proxy.ts` matcher adds `/team/:path*` to the protected prefixes
   (catches unauthenticated requests before any page code runs).
2. The `(team)` route group's layout calls
   `await requireManagerContext()`; an EMPLOYEE gets redirected back to
   `/dashboard` with a flash message (via a small server-side helper).
3. Every team-management Server Action begins with
   `await requireManagerContext()`.

**Rationale**:
- The middleware/proxy layer alone is not enough (a Server Action POST
  could conceivably bypass it; better safe than sorry).
- The layout-level guard is the place that produces a nice UX (redirect
  with message) rather than an error.
- The Server-Action-level check is the authoritative one — without it,
  an EMPLOYEE could in principle trigger a mutation by invoking the
  action directly with a crafted request.

**Alternatives considered**:
- **Only check at the page level**: fragile. Misses Server Action
  invocations.
- **Only check at the Server Action level**: works for mutations but
  means EMPLOYEEs see the team page render, then mutations fail. Bad UX.
- **Auth.js middleware-only**: too generic; doesn't know about "MANAGER
  only".

---

## Decision 6: Temp password disclosure path (one-time UI)

**Decision**: `inviteEmployeeAction` returns the plaintext temp password
in its `useActionState` result for the calling form. The page displays
it in a one-time card with "copy to clipboard" affordance. After the
form is reset / the page is navigated away from, the plaintext is gone
from React state. No write-to-disk, no logging.

**Rationale**:
- Server Action result lives in process memory only for the duration of
  the response.
- Client React state is per-render — closing the modal discards it.
- Avoids inventing a "show me this again" UI that would weaken SC-006.

**Alternatives considered**:
- **Persist plaintext temp passwords in a "pending invitations" table**:
  defeats the entire point of one-time disclosure.
- **Email the temp password to the invitee**: requires SMTP, out of
  scope per the spec.

---

## Decision 7: Confirmation UX for deactivation / role demotion

**Decision**: Use a shadcn `Dialog` modal asking the MANAGER to confirm
the destructive action. No "are you sure?" inline button — a deliberate
modal click ensures intent.

**Rationale**:
- Both actions are reversible (reactivate, re-promote) but produce
  immediate effects (the affected user loses access). Cheap to add an
  explicit confirmation; cheaper than dealing with accidental clicks.

**Alternatives considered**:
- **Inline button only**: fast, but error-prone for accidentally
  deactivating the wrong row.
- **Type the user's email to confirm**: too heavy for a team of < 50.

---

## Open Questions

None. The spec was complete and the stack carries over.

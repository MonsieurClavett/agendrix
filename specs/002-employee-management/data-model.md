# Phase 1 — Data Model (delta against Phase 0)

**Feature**: Employee Management
**Date**: 2026-05-28

## Entities

### Company

**Unchanged from Phase 0.** No new fields. Still the unit of tenant
isolation.

---

### User (extended)

The Phase 0 fields are unchanged. One new column is added.

| Field          | Type     | Constraints                                   | Notes                                                                |
|----------------|----------|-----------------------------------------------|----------------------------------------------------------------------|
| `id`           | `string` | PRIMARY KEY, default `cuid()`                 | unchanged                                                            |
| `email`        | `string` | UNIQUE GLOBAL, NOT NULL                       | unchanged                                                            |
| `passwordHash` | `string` | NOT NULL                                      | unchanged. For invited users, this is the hash of the temp password. |
| `name`         | `string?`| nullable; length ≥ 1 when set                 | unchanged. Editable by a MANAGER of the same company.                |
| `role`         | `Role`   | NOT NULL, default `EMPLOYEE`                  | unchanged. Editable by a MANAGER of the same company.                |
| `companyId`    | `string` | NOT NULL, FK → `Company.id`, CASCADE          | unchanged. Immutable in Phase 1.                                     |
| **`isActive`** | `boolean`| **NOT NULL, default `true`**                  | **NEW.** `false` = deactivated. Cannot sign in. Still listed in team page with a "deactivated" badge. |
| `createdAt`    | `DateTime`| NOT NULL, default `now()`                    | unchanged                                                            |
| `updatedAt`    | `DateTime`| NOT NULL, auto-updated                       | unchanged                                                            |

**New migration**: `<timestamp>_add_user_is_active`

```sql
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
```

Existing rows backfill to `true` (the safe default — pre-Phase-1 users
remain able to sign in).

**Validation rules at the application boundary** (in Server Actions and
repositories):
- Invite: `email` valid format + globally unique; `name` non-empty;
  `role ∈ {MANAGER, EMPLOYEE}`.
- Update: `name` non-empty; `role ∈ {MANAGER, EMPLOYEE}`. Role change
  to `EMPLOYEE` MUST NOT violate the "≥ 1 active MANAGER" invariant.
- Set active: `false` MUST NOT violate the "≥ 1 active MANAGER" invariant
  AND MUST NOT target the requesting MANAGER's own account (the latter
  is a UX safeguard; the former is the load-bearing invariant).

---

### Role (enum)

**Unchanged from Phase 0.** Values: `MANAGER`, `EMPLOYEE`.

---

### Session (JWT payload)

**Unchanged from Phase 0.** Continues to carry `id`, `email`, `name?`,
`companyId`, `role`. No `isActive` claim — login-time `authorize()`
rejects deactivated users before a session is ever issued, so by
construction every session belongs to an active user at the moment of
issue.

(Hard cut-off of an existing session of a user who is deactivated mid-
session is intentionally NOT in Phase 1 — see spec Assumptions.)

---

## Invariants

These invariants are enforced by the repository layer (`src/lib/repositories/user.ts`):

1. **Tenant isolation (carry-over Principle I)**: every read and write
   filters on `companyId = ctx.companyId`.
2. **At least one active MANAGER per company**: any operation that would
   reduce the count of active MANAGERs in a given company to 0 MUST be
   rejected within the same transaction that would perform the change.
3. **Email uniqueness is global**: enforced by the existing `User.email`
   UNIQUE constraint. Invite rejects duplicates via a pre-check that
   maps the violation to a friendly message; the DB constraint is the
   final line of defense for concurrent inserts.

---

## Relationship Diagram (Phase 1)

Unchanged from Phase 0 except for the new `User.isActive` field.

```
+-----------+      1   *      +--------------------+
|  Company  |─────────────────|       User         |
+-----------+                  +--------------------+
   id                            id
   name                          email     (UNIQUE GLOBAL)
   createdAt                     name
   updatedAt                     passwordHash
                                 role      (MANAGER | EMPLOYEE)
                                 isActive  ← NEW (default true)
                                 companyId (FK)
                                 createdAt
                                 updatedAt
```

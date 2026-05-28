# Phase 1 — Data Model

**Feature**: Multi-Tenant Foundations
**Date**: 2026-05-28

## Entities

### Company

A customer organization. The unit of tenant isolation.

| Field         | Type          | Constraints                         | Notes                                                        |
|---------------|---------------|-------------------------------------|--------------------------------------------------------------|
| `id`          | `string`      | PRIMARY KEY, default `cuid()`       |                                                              |
| `name`        | `string`      | NOT NULL, length ≥ 2                | Display name shown on the dashboard.                         |
| `createdAt`   | `DateTime`    | NOT NULL, default `now()`           |                                                              |
| `updatedAt`   | `DateTime`    | NOT NULL, auto-updated              |                                                              |

**Relationships**:
- `users: User[]` — one-to-many. A Company owns its Users.

**Lifecycle**:
- Created during signup in the same Prisma transaction as the first MANAGER User.
- Never deleted in Phase 0 (no "delete company" flow).

---

### User

An individual with login credentials, belonging to exactly one Company.

| Field          | Type     | Constraints                                   | Notes                                                                |
|----------------|----------|-----------------------------------------------|----------------------------------------------------------------------|
| `id`           | `string` | PRIMARY KEY, default `cuid()`                 |                                                                      |
| `email`        | `string` | UNIQUE GLOBAL, NOT NULL, valid email format   | Single global namespace per spec Assumptions.                        |
| `passwordHash` | `string` | NOT NULL                                      | Output of `bcryptjs.hash(plain, 10)`. Raw password never stored.     |
| `name`         | `string?`| nullable, length ≥ 1 when set                 | Display name. Optional in schema, required at signup form level.     |
| `role`         | `Role`   | NOT NULL, default `EMPLOYEE`                  | enum — see below.                                                    |
| `companyId`    | `string` | NOT NULL, FK → `Company.id`, ON DELETE CASCADE| Index on this column (every tenant query filters on it).             |
| `createdAt`    | `DateTime` | NOT NULL, default `now()`                   |                                                                      |
| `updatedAt`    | `DateTime` | NOT NULL, auto-updated                      |                                                                      |

**Relationships**:
- `company: Company` — many-to-one. ON DELETE CASCADE: if a Company were ever
  removed (not in Phase 0), its Users would be removed with it.

**Validation rules** (enforced at the application boundary, not just the DB):
- `email` must match a syntactically valid email regex before any DB lookup
  (spec FR-007, FR-015).
- `passwordHash` is produced from a plaintext that is ≥ 8 characters (spec
  FR-006). The DB only sees the hash.
- The signup pathway creates one Company and one User in the SAME
  `db.$transaction(...)` call — no partial state observable (spec FR-002,
  SC-006).

**Indexes**:
- `User.email` UNIQUE (enforces FR-003 duplicate-email rejection at the DB
  level, including under concurrent signup — spec Edge Case "concurrent
  signups with the same email").
- `User.companyId` (every tenant-scoped query filters on this).

---

### Role (enum)

```
enum Role {
  MANAGER
  EMPLOYEE
}
```

- `MANAGER`: founder role. Created automatically as the first User of a new
  Company during signup.
- `EMPLOYEE`: created by a MANAGER's invitation in a later phase (out of
  scope for Phase 0).

---

### Session (transient — JWT payload, NOT a DB table)

The Session is the verified envelope that every authenticated request
carries. In this implementation it is a JWT (issued by Auth.js v5), not a
row in any table. It is the SINGLE authoritative source of who the
requester is and which company they belong to.

| Claim         | Type     | Source                                           |
|---------------|----------|--------------------------------------------------|
| `id`          | `string` | `User.id` at sign-in time                        |
| `email`       | `string` | `User.email` at sign-in time                     |
| `name`        | `string?`| `User.name` at sign-in time                      |
| `companyId`   | `string` | `User.companyId` at sign-in time                 |
| `role`        | `Role`   | `User.role` at sign-in time                      |

**Lifecycle**:
- Issued on successful `signIn("credentials", ...)`.
- Re-validated by Auth.js on every protected request.
- Terminated by the `logout` Server Action (`signOut`).

**Invariant — Principle V**: `companyId` and `role` come from this verified
envelope ONLY. They MUST NOT be read from form data, headers, query strings,
or cookies that are not part of the Auth.js verified session.

---

## Relationship Diagram

```
+-----------+      1   *      +--------+
|  Company  |─────────────────|  User  |
+-----------+                  +--------+
   id                            id
   name                          email     (UNIQUE GLOBAL)
   createdAt                     name
   updatedAt                     passwordHash
                                 role      (MANAGER | EMPLOYEE)
                                 companyId (FK)
                                 createdAt
                                 updatedAt

(Session is NOT in the database — it is the verified JWT payload at runtime.)
```

## Migration Notes

- Initial migration creates `Company`, `User`, and the `Role` enum.
- The Prisma generator is configured with `output = "../src/generated/prisma"`
  so the generated client lives inside `src/` (gitignored) and is importable
  via `@/generated/prisma`.
- No seed data in Phase 0 (the first Company + User are created at first
  signup by the actual signup flow).

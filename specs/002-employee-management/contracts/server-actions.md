# Server Action Contracts (Phase 1)

**Feature**: Employee Management
**Date**: 2026-05-28

All Server Actions live under `src/actions/team/`. Every one of them
begins with `await requireManagerContext()` (which throws `FORBIDDEN` on
EMPLOYEE callers and `UNAUTHENTICATED` on no-session callers). All
mutations go through repository functions in `src/lib/repositories/user.ts`
which inject `where: { companyId: ctx.companyId }`.

---

## `inviteEmployeeAction`

**File**: `src/actions/team/invite.ts`

**Signature**:
```typescript
async function inviteEmployeeAction(
  prev: InviteState,
  formData: FormData,
): Promise<InviteState>
```

**Input (FormData fields)**:
| Field   | Type            | Validation                                     |
|---------|-----------------|------------------------------------------------|
| `email` | string          | valid email (Zod `.email()`)                   |
| `name`  | string          | non-empty (Zod `.min(1)`)                      |
| `role`  | `"MANAGER" \| "EMPLOYEE"` | Zod enum                            |

**Effect**:
1. `await requireManagerContext()` (throws on EMPLOYEE).
2. Zod parse; on failure → `{ fieldErrors }`.
3. Look up existing user by email; if found → `{ error: "Cet email est déjà utilisé." }` (no record created).
4. Generate temp password via `generateTempPassword()` (10 random bytes → 16-char base32, Crockford alphabet).
5. Hash via `bcryptjs.hash(temp, 10)`.
6. `await createInvitedUser(ctx, { email, name, role, passwordHash })` (repository function — inserts the User with `isActive: true`, `companyId: ctx.companyId`).
7. Return `{ success: { email, tempPassword } }` so the calling UI can flash the password once.

**Return type**:
```typescript
type InviteState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: { email: string; tempPassword: string };
};
```

**Spec traceability**: FR-001, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-016.

---

## `updateEmployeeAction`

**File**: `src/actions/team/update.ts`

**Signature**:
```typescript
async function updateEmployeeAction(
  prev: UpdateState,
  formData: FormData,
): Promise<UpdateState>
```

**Input (FormData fields)**:
| Field      | Type                          | Validation                  |
|------------|-------------------------------|-----------------------------|
| `userId`   | string                        | non-empty                   |
| `name`     | string                        | non-empty                   |
| `role`     | `"MANAGER" \| "EMPLOYEE"`     | Zod enum                    |

**Effect**:
1. `await requireManagerContext()`.
2. Zod parse; on failure → `{ fieldErrors }`.
3. `await updateUserById(ctx, userId, { name, role })` — the repository function:
   - Validates `userId` belongs to `ctx.companyId` (`UPDATE ... WHERE id = ? AND companyId = ?`). 0 rows updated → throws `NOT_FOUND`.
   - If `role` is changing from MANAGER to EMPLOYEE, counts the OTHER active MANAGERs of the company in the same transaction. If 0 → throws `LAST_MANAGER`.
4. Maps thrown errors to user-facing messages: `LAST_MANAGER` → "Une entreprise doit toujours avoir au moins un gestionnaire actif." `NOT_FOUND` → "Utilisateur introuvable."
5. Returns `{ success: true }` on success; the calling UI revalidates the team page.

**Return type**:
```typescript
type UpdateState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: true;
};
```

**Spec traceability**: FR-010, FR-011, FR-015, FR-016.

---

## `setUserActiveAction`

**File**: `src/actions/team/set-active.ts`

**Signature**:
```typescript
async function setUserActiveAction(
  prev: SetActiveState,
  formData: FormData,
): Promise<SetActiveState>
```

**Input (FormData fields)**:
| Field      | Type      | Validation                  |
|------------|-----------|-----------------------------|
| `userId`   | string    | non-empty                   |
| `isActive` | `"true" \| "false"` | Zod enum, coerced |

**Effect**:
1. `await requireManagerContext()`.
2. Zod parse.
3. If `isActive` is `false` AND `userId === ctx.userId` → `{ error: "Vous ne pouvez pas désactiver votre propre compte." }`.
4. `await setUserActiveStatus(ctx, userId, isActive)` — the repository function:
   - Validates `userId` belongs to `ctx.companyId`.
   - If setting to `false` and the target is currently a MANAGER, counts the OTHER active MANAGERs of the company in the same transaction. If 0 → throws `LAST_MANAGER`.
5. Maps errors as for `updateEmployeeAction`.
6. Returns `{ success: true }`.

**Return type**:
```typescript
type SetActiveState = {
  error?: string;
  success?: true;
};
```

**Spec traceability**: FR-012, FR-013, FR-015, FR-016. The login-side
enforcement of deactivation lives in `src/auth.ts` and is documented
separately in the next section.

---

## Login-side enforcement (no Server Action — auth callback edit)

**File**: `src/auth.ts` — `Credentials.authorize` callback.

**Change**:
After the existing `bcrypt.compare(...)` success branch, add a guard:

```typescript
if (!user.isActive) return null;
```

This causes Auth.js to surface the same `CredentialsSignin` error already
used for wrong-password and no-such-email, satisfying FR-014 and SC-003
with zero additional code paths.

**Spec traceability**: FR-014, SC-003, SC-005 (indirectly).

---

## Repository functions added in Phase 1

All live in `src/lib/repositories/user.ts` and accept a `TenantContext`.

### `listAllUsersInCompany(ctx)`

Returns ALL users (active + deactivated) of `ctx.companyId`. Distinct from
Phase 0's `listUsersInCompany` (which can be repurposed or renamed to make
"active only" explicit, depending on the implementation pass).

### `createInvitedUser(ctx, { email, name, role, passwordHash })`

Inserts a new User with `companyId: ctx.companyId, isActive: true`. Throws
on email uniqueness violation; the caller maps to the friendly message.

### `updateUserById(ctx, userId, { name, role })`

`UPDATE` scoped by `id` AND `companyId`. If `role` transitions
MANAGER → EMPLOYEE, runs the "≥ 1 active MANAGER" check in the same
transaction.

### `setUserActiveStatus(ctx, userId, isActive)`

`UPDATE` scoped by `id` AND `companyId`. If `isActive` transitions to
`false` on a MANAGER, runs the "≥ 1 active MANAGER" check in the same
transaction.

---

## Negative space — what is NOT in Phase 1

- No "send invitation email" — out of scope, defer to a phase that adds SMTP.
- No "password reset / change my password" — out of scope.
- No bulk invite — one-at-a-time.
- No hard delete — only deactivation.
- No "kick all sessions of user X" — out of scope.
- No audit log — out of scope.

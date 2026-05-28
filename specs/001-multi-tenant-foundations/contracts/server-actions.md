# Server Action Contracts

**Feature**: Multi-Tenant Foundations
**Date**: 2026-05-28

All Server Actions live under `src/actions/`. Inputs come from `FormData`
(React 19 `useActionState` pattern). All validation runs server-side via
Zod; client-side `required` / `minLength` are UX assists only.

---

## `signupAction`

**File**: `src/actions/signup.ts`

**Signature**:
```typescript
async function signupAction(
  prev: SignupState,
  formData: FormData,
): Promise<SignupState>
```

**Input (FormData fields)**:
| Field         | Type   | Validation                                     |
|---------------|--------|------------------------------------------------|
| `companyName` | string | non-empty, length ≥ 2 (Zod)                    |
| `name`        | string | non-empty (Zod)                                |
| `email`       | string | valid email format (Zod `.email()`)            |
| `password`    | string | length ≥ 8 (Zod)                               |

**Effect** (single Prisma transaction):
1. Zod parse → if fail, return `{ fieldErrors }`.
2. Lookup `db.user.findUnique({ where: { email } })` → if found, return
   `{ error: "Cet email est déjà utilisé." }`.
3. Hash password with `bcryptjs.hash(password, 10)`.
4. `db.$transaction([ company.create, user.create ])` — Company first,
   then User with `companyId = company.id` and `role: "MANAGER"`.
5. `signIn("credentials", { email, password, redirect: false })` to issue a
   session for the just-created user.
6. `redirect("/dashboard")`.

**Return type**:
```typescript
type SignupState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};
```

**Spec traceability**: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007.

---

## `loginAction`

**File**: `src/actions/login.ts`

**Signature**:
```typescript
async function loginAction(
  prev: LoginState,
  formData: FormData,
): Promise<LoginState>
```

**Input (FormData fields)**:
| Field      | Type   | Validation                                |
|------------|--------|-------------------------------------------|
| `email`    | string | required (server passes to Auth.js)       |
| `password` | string | required (server passes to Auth.js)       |

**Effect**:
1. `await signIn("credentials", { email, password, redirectTo: "/dashboard" })`.
2. On `AuthError` (CredentialsSignin), return
   `{ error: "Email ou mot de passe invalide." }` — uniform message
   regardless of whether the email exists (spec FR-010, SC-005).
3. On any other error, re-throw.

**Return type**:
```typescript
type LoginState = { error?: string };
```

**Spec traceability**: FR-008, FR-009, FR-010, FR-011.

---

## `logoutAction`

**File**: `src/actions/logout.ts`

**Signature**:
```typescript
async function logoutAction(): Promise<void>
```

**Input**: none (invoked from a `<form action={logoutAction}>`).

**Effect**:
1. `await signOut({ redirectTo: "/login" })`.

**Spec traceability**: FR-012.

---

## Server-side helpers consumed by actions and pages

### `requireTenantContext()`

**File**: `src/lib/session.ts`

```typescript
type TenantContext = {
  userId: string;
  companyId: string;
  role: Role; // "MANAGER" | "EMPLOYEE"
};

async function requireTenantContext(): Promise<TenantContext>
```

**Effect**:
1. `const session = await auth()`.
2. If `!session?.user`, `throw new Error("UNAUTHENTICATED")`.
3. Return `{ userId, companyId, role }` derived ONLY from
   `session.user.*`.

**Invariant**: callers MUST NOT pass a `companyId` from any other source.

### `getCurrentCompany(ctx)` / `listUsersInCompany(ctx)` / `getCurrentUser(ctx)`

**File**: `src/lib/repositories/{company,user}.ts`

Each accepts a `TenantContext` and runs a Prisma query that includes
`where: { companyId: ctx.companyId }` (for `User`) or `where: { id: ctx.companyId }`
(for `Company`). These functions are the ONLY place in the codebase where
`db.company.*` / `db.user.*` may be called for reads of tenant-scoped data.

**Spec traceability**: FR-015, FR-016, FR-017, FR-018, FR-019.

---

## Negative space — what is NOT in this contract

- No "create employee" / "invite user" Server Action — out of scope for
  Phase 0 (see spec Assumptions).
- No "change password" / "forgot password" Server Action — out of scope.
- No "edit company" Server Action — out of scope.
- No public REST or GraphQL API — Server Actions ARE the contract for Phase
  0; an external API will appear when an external consumer does.

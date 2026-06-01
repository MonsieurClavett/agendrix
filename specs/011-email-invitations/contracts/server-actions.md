# Server Action Contracts — 011-email-invitations

Phase 1 of `/speckit-plan`. Four Server Actions: three MANAGER-only,
one public.

## Repository: `src/lib/repositories/invitation.ts`

### `InvitationRow` type

```ts
type InvitationRow = {
  id: string;
  companyId: string;
  email: string;
  name: string;
  role: "MANAGER" | "EMPLOYEE";
  expiresAt: Date;
  status: "PENDING" | "ACCEPTED";
  acceptedAt: Date | null;
  invitedByUserId: string | null;
  invitedBy: { id: string; name: string | null } | null;
  createdAt: Date;
  // tokenHash is INTENTIONALLY omitted from this DTO — never leaked.
};
```

### `listInvitationsForCompany(ctx)` — MANAGER

Returns all `PENDING` and recently-`ACCEPTED` invitations of the
company, ordered by `createdAt desc`. Throws `FORBIDDEN` if
`ctx.role !== "MANAGER"`.

### `createInvitation(ctx, data, tokenHash, expiresAt)` — MANAGER

`data: { email: string; name: string; role: "MANAGER" | "EMPLOYEE" }`.

Transactional:
1. Normalize email (`trim().toLowerCase()`).
2. Reject if `db.user.findFirst({ where: { email } })` exists (any company).
3. Reject if `db.invitation.findFirst({ where: { companyId, email, status: "PENDING" } })` exists (the partial-unique index also enforces this at the DB layer).
4. Insert with `companyId`, `email`, `name`, `role`, `tokenHash`, `expiresAt`, `status: "PENDING"`, `invitedByUserId: ctx.userId`.

Throws `EMAIL_TAKEN` (existing user) or `ALREADY_PENDING`
(active invitation for that email in the same company).

### `findInvitationByTokenHash(tokenHash)` — public

Returns the row (without `tokenHash`) or `null`. NO tenant filter —
this is the path that bootstraps tenant context from the token.

### `acceptInvitation(tokenHash, { name, password })` — public

Transactional:
1. Fetch the invitation by `tokenHash`.
2. Reject if `status !== "PENDING"` → `ALREADY_USED`.
3. Reject if `expiresAt < now()` → `EXPIRED`.
4. Reject if `db.user.findFirst({ where: { email } })` exists → `EMAIL_TAKEN`.
5. Hash the password with bcrypt(10).
6. Create `User` with `companyId`, `email`, `name`, `role`, `passwordHash`, `isActive: true`.
7. Update invitation `status: "ACCEPTED"`, `acceptedAt: now`.

Returns `{ user: { id, email, name } }`.

### `resendInvitation(ctx, invitationId)` — MANAGER

Looks up by `(id, companyId)`. Returns the invitation row (no DB
mutation — caller is responsible for re-sending the email). Throws
`NOT_FOUND` or `EXPIRED`.

The token itself isn't stored, so the resend uses the SAME
`tokenHash` but the caller needs the cleartext token. To enable
this, **the Server Action that wraps this call MUST regenerate a
fresh token + hash on resend**, and `resendInvitation` accepts the
new `tokenHash` as a parameter and updates the row.

(Decision: re-sending replaces the token. This is more secure than
re-sending the original, and the MANAGER doesn't care — they see
"link sent". The old token in the original email becomes invalid.)

Updated signature:
```ts
resendInvitation(ctx, invitationId, { newTokenHash, newExpiresAt })
```

### `revokeInvitation(ctx, invitationId)` — MANAGER

Deletes the row by `(id, companyId)`. Throws `NOT_FOUND` if no row
was deleted. Status doesn't matter — both PENDING and ACCEPTED can
be revoked (though revoking an ACCEPTED is unusual and just removes
the audit row; the `User` it created stays).

## Token & Email helpers

### `src/lib/tokens.ts`

```ts
import { randomBytes, createHash } from "node:crypto";

export function generateInvitationToken(): { token: string; hash: string } {
  const buf = randomBytes(32);
  const token = buf.toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
```

### `src/lib/email.ts`

```ts
type InvitationEmailInput = {
  to: string;
  inviteeName: string;
  companyName: string;
  link: string;
  expiresAt: Date;
};

export async function sendInvitationEmail(
  input: InvitationEmailInput,
): Promise<{ delivered: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[invitation] dev fallback — link: ${input.link}`);
    return { delivered: false };
  }
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";
  await resend.emails.send({
    from,
    to: input.to,
    subject: `Invitation à rejoindre ${input.companyName} sur Agendrix`,
    html: renderInvitationHtml(input),
  });
  return { delivered: true };
}
```

`renderInvitationHtml` is a small inline template (no template
engine) returning the body string in French.

## Server Actions

### `createInvitationAction`

**Path**: `src/actions/invitations/create.ts`

`requireManagerContext()`. Input: `email`, `name`, `role`. Steps:
1. Zod-validate.
2. Generate token + hash.
3. Compute `expiresAt = now + 7 days`.
4. Call `createInvitation(ctx, …, hash, expiresAt)`.
5. Call `sendInvitationEmail({ to, name, company: ctx.companyName /* fetched */, link: APP_URL + /accept-invitation/ + token, expiresAt })`.
6. Return `{ success: true, link, delivered }`.

Error mapping: `EMAIL_TAKEN` → "Cet email est déjà associé à un compte.", `ALREADY_PENDING` → "Une invitation pour cet email est déjà en attente.".

The `link` is returned to the caller (the MANAGER's UI) on success
even when the email is delivered — handy as a backup for the
MANAGER to share manually if the inbox is unreachable.

### `resendInvitationAction`

**Path**: `src/actions/invitations/resend.ts`

`requireManagerContext()`. Input: `invitationId`. Generates a fresh
token + hash, updates the row, re-sends the email. Same return
shape (`{ success, link, delivered }`).

### `revokeInvitationAction`

**Path**: `src/actions/invitations/revoke.ts`

`requireManagerContext()`. Input: `invitationId`. Deletes the row.

### `acceptInvitationAction`

**Path**: `src/actions/invitations/accept.ts`

**No `requireTenantContext`** — public. Input: `token`, `name`,
`password`, `confirmPassword`. Steps:
1. Zod: `password.min(8)`, `confirmPassword === password`.
2. Compute `tokenHash = hashInvitationToken(token)`.
3. Call `acceptInvitation(tokenHash, { name, password })`.
4. `redirect("/login?welcome=1")` on success.

Error mapping: `ALREADY_USED`, `EXPIRED`, `EMAIL_TAKEN`, `INVALID_INPUT`.

## Page-level data fetch

### `/accept-invitation/[token]/page.tsx`

```ts
const tokenHash = hashInvitationToken(params.token);
const invitation = await findInvitationByTokenHash(tokenHash);
if (!invitation) return <NotFoundCard />;
if (invitation.status === "ACCEPTED") return <AlreadyUsedCard />;
if (invitation.expiresAt < new Date()) return <ExpiredCard />;
return <AcceptInvitationForm invitation={invitation} token={params.token} />;
```

### `/team/page.tsx` (delta)

```ts
const ctx = await requireManagerContext();
const [users, invitations] = await Promise.all([
  listAllUsersInCompany(ctx),
  listInvitationsForCompany(ctx),
]);
// render <TeamTable> + <PendingInvitationsList>
```

## Cross-action invariants

- Every MANAGER action calls `revalidatePath("/team")` on success.
- No token in clear is logged or persisted anywhere except in the email/console output and in transient action results.
- The `accept` action is the ONLY tenant-scoped Server Action without a `TenantContext` — its security boundary is the token validation.
- The Resend SDK is imported dynamically (`await import("resend")`) only when `RESEND_API_KEY` is set, so cold starts in dev don't pay the cost.

# Research — 011-email-invitations

Phase 0 of `/speckit-plan`. Six decisions, all small.

## Decision 1 — Token storage: hash, not plaintext

**Decision**: Generate 32 random bytes via Node `crypto.randomBytes(32)`. Encode as base64url for the URL. Store SHA-256 of the base64url string in `tokenHash`. Look up by `where: { tokenHash }`.

**Rationale**:
- Industry standard for one-shot tokens (password reset, email verify, magic links).
- A DB dump never reveals the in-flight tokens.
- 32 bytes = 256 bits of entropy — no brute force feasibility.
- SHA-256 is well-tested, fast, and built into Node.

**Alternatives**:
- *Store the token plaintext*: trivially leaks on any DB compromise.
- *Bcrypt the token*: overkill — bcrypt's slowness is meant for human passwords (~6–8 chars of entropy). Hashing 256-bit random is a no-op security-wise; SHA-256 is enough.
- *HMAC with a server secret*: would also work but couples token validity to the secret rotation — strictly extra complexity here.

## Decision 2 — Token TTL: 7 days

**Decision**: `expiresAt = createdAt + 7 days`. Stored at creation. Compared at acceptance via SQL filter (`expiresAt > now()`).

**Rationale**:
- Long enough to survive a vacation, an email in spam, or a forgotten weekend.
- Short enough that leaked tokens have a bounded window.
- Industry common ground (GitHub, Stripe, etc.).

**Alternatives**:
- *24 h*: too aggressive — invitees who forget for a day need a re-send.
- *30 d*: too lax — defeats the security argument.

## Decision 3 — Email service: Resend with dev fallback

**Decision**: Add the `resend` npm package. In `src/lib/email.ts`, check `process.env.RESEND_API_KEY`:
- If set: instantiate Resend and `await resend.emails.send({...})`.
- If unset: `console.log("[invitation] link: ${link}")` and return `{ delivered: false }`.

Either way, the Server Action returns the link to the caller, so the MANAGER can copy/paste in dev.

**Rationale**:
- Resend has the cleanest TS API and a generous free tier.
- The fallback means the feature is shippable and testable WITHOUT signing up for Resend — critical for the academic context.
- Returning the link unconditionally to the MANAGER (success case) makes dev work; in prod, the email is the primary channel and the link in the toast is a "in case the email is delayed" backup.

**Alternatives**:
- *SendGrid / Postmark*: similar capabilities, slightly heavier APIs.
- *Direct SMTP via `nodemailer`*: requires SMTP credentials and care around deliverability headers.
- *No email at all*: would require redesigning the spec (the title says "email invitations").

## Decision 4 — Invitation as separate entity (vs pre-created User)

**Decision**: Separate `Invitation` table. `User` is created only at acceptance.

**Rationale**:
- The `User` table is the source of truth for login (the auth library reads `email` uniqueness). Letting it hold "not yet active" rows would either require a status column on every join or special-case the auth path.
- The accept path needs the `name`, `role`, and `companyId` — all stored on `Invitation`. No extra denormalization.
- Revoking is just `DELETE FROM Invitation` — clean.

**Alternatives**:
- *Pre-create `User` with `passwordHash = ''`*: would force the auth path to check "is this user actually accepted?" everywhere. Bad.
- *Pre-create `User` with `passwordHash = '$INVITED$'` sentinel*: same problem, worse smell.

## Decision 5 — Email normalization

**Decision**: Lowercase + trim on both creation and lookup. Store the lowercased form.

**Rationale**:
- Emails are case-insensitive per RFC 5321 §2.4 (the local-part is technically case-sensitive but virtually no provider relies on that).
- Avoids "Bob@acme.test ≠ bob@acme.test" double accounts.

**Alternatives**:
- *Preserve original case*: causes user confusion later when the inviter and the invitee remember different casings.

## Decision 6 — Non-auto-login after acceptance

**Decision**: After acceptance, redirect to `/login?welcome=1`. Do NOT create a session automatically.

**Rationale**:
- The token is sent in the URL → it lives in the inviter's email and possibly proxies / clipboard history. Auto-login on click would mean a leaked email grants direct dashboard access.
- The extra "log in with your new password" step proves the invitee owns both the inbox AND the new password.
- One extra click is acceptable UX — `/login` shows a welcome banner so the transition is obvious.

**Alternatives**:
- *Auto-login*: simpler UX, larger blast radius.

## Open items

None.

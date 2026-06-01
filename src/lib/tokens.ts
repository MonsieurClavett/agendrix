import { createHash, randomBytes } from "node:crypto";

/**
 * 32 random bytes encoded as URL-safe base64 (≈ 43 characters, no
 * padding). The hash stored in the DB is SHA-256 hex of that string.
 * Caller MUST keep the cleartext token out of any persistent surface
 * other than the email body / dev console.
 */
export function generateInvitationToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  const hash = hashInvitationToken(token);
  return { token, hash };
}

/** Recompute the hash to look up an invitation by URL token. */
export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

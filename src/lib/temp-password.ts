import { randomBytes } from "node:crypto";

// Crockford base32 — no 0/O/I/L confusion.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * 16-character base32 (Crockford) string derived from 10 random bytes
 * (≈ 80 bits of entropy). Formatted as XXXX-XXXX-XXXX-XXXX for legibility.
 * Plaintext is returned to the caller exactly once and never persisted
 * (only its bcrypt hash is written to the DB).
 */
export function generateTempPassword(): string {
  const bytes = randomBytes(10);
  let bits = 0;
  let value = 0;
  let out = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(value >>> bits) & 0x1f];
    }
  }

  // 10 bytes = 80 bits → exactly 16 base32 chars, no leftover.
  return out.match(/.{4}/g)!.join("-");
}

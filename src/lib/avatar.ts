/**
 * Initials and deterministic-color helpers for the Avatar component.
 * No deps, no IO — pure functions.
 */

const AVATAR_PALETTE = [
  { bg: "oklch(0.86 0.10 25)", fg: "oklch(0.28 0.05 25)" },   // coral
  { bg: "oklch(0.86 0.10 80)", fg: "oklch(0.28 0.05 80)" },   // amber
  { bg: "oklch(0.86 0.10 145)", fg: "oklch(0.28 0.05 145)" }, // green
  { bg: "oklch(0.86 0.10 200)", fg: "oklch(0.28 0.05 200)" }, // teal
  { bg: "oklch(0.86 0.10 250)", fg: "oklch(0.28 0.05 250)" }, // blue
  { bg: "oklch(0.86 0.10 300)", fg: "oklch(0.28 0.05 300)" }, // purple
  { bg: "oklch(0.86 0.10 340)", fg: "oklch(0.28 0.05 340)" }, // magenta
  { bg: "oklch(0.86 0.10 10)", fg: "oklch(0.28 0.05 10)" },   // red
] as const;

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** djb2-style hash → stable color index. */
export function getAvatarColor(seed: string): { bg: string; fg: string } {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

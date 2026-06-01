/**
 * Client-only localStorage helpers for the command palette's "Récents"
 * group. Silently no-op when storage is unavailable (private mode, etc.).
 */

const KEY = "agendrix:command-palette:recent";
const MAX = 5;

export type RecentItem = { href: string; label: string };

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readRecents(): RecentItem[] {
  const ls = safeStorage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (it): it is RecentItem =>
          typeof it === "object" &&
          it !== null &&
          typeof (it as RecentItem).href === "string" &&
          typeof (it as RecentItem).label === "string",
      )
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function pushRecent(item: RecentItem): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    const current = readRecents();
    const without = current.filter((it) => it.href !== item.href);
    const next = [item, ...without].slice(0, MAX);
    ls.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore quota / serialization errors
  }
}

/**
 * Fixed color palette for the Position entity. Each key maps to a
 * pair of OKLCH values: a vivid `swatch` (used for color pickers and
 * legend dots), a slightly desaturated `accent` (used for shift card
 * left borders and tinted backgrounds). Keys are stored in the DB on
 * the Position.color column.
 */

export const POSITION_COLORS = {
  teal: {
    swatch: "oklch(0.70 0.13 195)",
    accent: "oklch(0.65 0.12 195)",
    bg: "oklch(0.94 0.04 195)",
    fg: "oklch(0.30 0.06 195)",
  },
  coral: {
    swatch: "oklch(0.72 0.16 25)",
    accent: "oklch(0.67 0.15 25)",
    bg: "oklch(0.94 0.05 25)",
    fg: "oklch(0.30 0.08 25)",
  },
  amber: {
    swatch: "oklch(0.78 0.16 80)",
    accent: "oklch(0.73 0.15 80)",
    bg: "oklch(0.94 0.06 80)",
    fg: "oklch(0.32 0.08 80)",
  },
  green: {
    swatch: "oklch(0.70 0.14 145)",
    accent: "oklch(0.65 0.13 145)",
    bg: "oklch(0.93 0.05 145)",
    fg: "oklch(0.28 0.07 145)",
  },
  blue: {
    swatch: "oklch(0.65 0.14 255)",
    accent: "oklch(0.62 0.13 255)",
    bg: "oklch(0.94 0.04 255)",
    fg: "oklch(0.28 0.07 255)",
  },
  purple: {
    swatch: "oklch(0.65 0.16 300)",
    accent: "oklch(0.62 0.15 300)",
    bg: "oklch(0.94 0.05 300)",
    fg: "oklch(0.30 0.08 300)",
  },
  magenta: {
    swatch: "oklch(0.68 0.18 340)",
    accent: "oklch(0.63 0.17 340)",
    bg: "oklch(0.94 0.06 340)",
    fg: "oklch(0.30 0.08 340)",
  },
  red: {
    swatch: "oklch(0.65 0.20 15)",
    accent: "oklch(0.60 0.18 15)",
    bg: "oklch(0.94 0.06 15)",
    fg: "oklch(0.30 0.09 15)",
  },
} as const;

export type PositionColorKey = keyof typeof POSITION_COLORS;

export const POSITION_COLOR_KEYS = Object.keys(POSITION_COLORS) as [
  PositionColorKey,
  ...PositionColorKey[],
];

const FALLBACK = {
  swatch: "oklch(0.7 0 0)",
  accent: "oklch(0.65 0 0)",
  bg: "oklch(0.94 0 0)",
  fg: "oklch(0.30 0 0)",
} as const;

export function getPositionColor(
  key: string | null | undefined,
): (typeof POSITION_COLORS)[PositionColorKey] | typeof FALLBACK {
  if (key && key in POSITION_COLORS) {
    return POSITION_COLORS[key as PositionColorKey];
  }
  return FALLBACK;
}

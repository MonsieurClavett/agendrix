# Component Contracts (Phase 4)

**Feature**: Agendrix-Style Shell
**Date**: 2026-05-28

Phase 4 is presentation-layer only — no new Server Action.

---

## Server-side helpers (existing, no changes)

- `requireTenantContext()` — unchanged.
- `requireManagerContext()` — unchanged.
- All repository functions and Server Actions — unchanged.

---

## New UI primitives (`src/components/ui/`)

### `<Sheet>` family (`sheet.tsx`)

Hand-rolled around `@radix-ui/react-dialog`. Exposes:
- `<Sheet>` (root, controlled or uncontrolled)
- `<SheetTrigger asChild>`
- `<SheetContent side="left" | "right">` — adds slide-in animations
- `<SheetHeader>`, `<SheetTitle>`, `<SheetDescription>`
- `<SheetClose>`

Used by `<MobileSidebar>`.

### `<Tooltip>` family (`tooltip.tsx`)

Wraps `@radix-ui/react-tooltip`. Exposes:
- `<TooltipProvider>` (mounted once near root; in our case inside the
  `<AppShell>` so all descendants can use Tooltip)
- `<Tooltip>`, `<TooltipTrigger asChild>`, `<TooltipContent>`

Used by the FilterPanel's disabled controls.

### `<Separator>` (`separator.tsx`)

A 1-px divider, horizontal or vertical, themed via `--border`.

### `<Avatar>` (`avatar.tsx`)

```typescript
<Avatar name={string} size={"sm" | "md" | "lg"} />
```

Renders a circular div with two-letter initials computed from `name`
(first letter of first word + first letter of last word, fallback to
two letters of the only word, fallback to "?"). Background and
foreground come from `getAvatarColor(name)` (see `src/lib/avatar.ts`).
Size variants: sm = 28 px, md = 36 px, lg = 48 px.

---

## Helper module (`src/lib/avatar.ts`)

Pure functions:

- `getInitials(name: string | null | undefined): string` — returns up
  to 2 uppercase letters; "?" for nullish.
- `getAvatarColor(seed: string): { bg: string; fg: string }` — hashes
  the seed string into a stable index into the OKLCH palette
  (see `data-model.md`).

---

## Shell components (`src/components/shell/`)

### `<AppShell>` (`AppShell.tsx`)

```typescript
type Props = {
  ctx: TenantContext;
  company: { id: string; name: string };
  children: React.ReactNode;
};
```

Root layout for every authenticated page. Renders:
- Mobile (< 768 px): hamburger button + content; sidebar lives in a
  `<Sheet>` opened on hamburger click.
- Tablet (768–1023 px): collapsed icon-only sidebar fixed left + content
  on the right.
- Desktop (≥ 1024 px): expanded sidebar (icons + labels) fixed left +
  content on the right.

Mounts `<TooltipProvider>` so descendants can use Tooltip.

The header bar at the top of the content area shows the company name
and an avatar for the current user.

### `<Sidebar>` (`Sidebar.tsx`)

Desktop / tablet sidebar. Renders the nav list (via `<SidebarNav>`),
the theme toggle, and a sign-out button.

### `<MobileSidebar>` (`MobileSidebar.tsx`)

`<Sheet>`-wrapped version of `<Sidebar>` for the mobile drawer.

### `<SidebarNav>` (`SidebarNav.tsx`)

Pure renderer of the nav-link list. Props: `{ ctx, collapsed }`. Each
nav link uses `usePathname()` to determine if it's active and applies
the active visual.

---

## Schedules-page components (`src/app/(dashboard)/schedules/_components/`)

### `<ScheduleToolbar>` (NEW)

```typescript
type Props = {
  range: WeekRange;
  today: Date;
  canMutate: boolean;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onCreateClick: () => void;
};
```

Top toolbar containing (in order, LTR):
- Primary "Créer" Button (only when canMutate) → calls `onCreateClick`
- Employee-search Input (controlled, "Rechercher un employé…")
- Spacer
- "Aujourd'hui" Link Button → `/schedules`
- Prev-week Link Button + date-range label + Next-week Link Button
- View Select with single option "Semaine"

### `<FilterPanel>` (NEW, placeholder)

A static left-aligned panel with three sections of disabled controls,
each wrapped in `<Tooltip>` ("Bientôt disponible"). No props beyond
maybe a `className` for layout.

### `<WeekGridDesktop>` (rewritten)

Renders the new compact-card roster grid. Props:
```typescript
{
  shifts: WeekShift[];
  range: WeekRange;
  employees: Employee[];
  canMutate: boolean;
  onShiftClick?: (s: WeekShift) => void;
  searchTerm: string;
}
```

Structure:
- A wrapping `<div>` with CSS Grid: `grid-template-columns: 220px repeat(7, 1fr) 88px`.
- Header row: empty corner cell + 7 day labels + "Total" label.
- One row per employee (filtered by `searchTerm`): avatar + name +
  total-hours summary on the left, then 7 `<DropCell>`s, then a
  per-row Total cell.
- Footer row "Total pour la succursale": label + 7 day-total cells +
  grand-total cell.

### `<DropCell>` (modified)

Removes the fixed-height + relative-positioned-children model.
Now: a flex column with `min-h-[60px]`, `gap-1.5`, padding. Children
(`<ShiftBlock>` cards) stack vertically.

### `<ShiftBlock>` (modified)

Removes the absolute-position + height-from-duration computation.
Now: a compact Card with rounded border, padding, two text rows:
- Top: bold time range "HH:mm–HH:mm" (with optional " (+1j)" suffix)
- Bottom: secondary text — the shift's `note` if present, else "Quart"

Drag handler unchanged; click handler unchanged.

### `<ScheduleCalendar>` (modified)

- Lifts `searchTerm` state.
- Computes totals via `useMemo` from `optimisticShifts`:
  - `totalsByEmployee: Map<employeeId, number>` (minutes)
  - `totalsByDay: number[]` (length 7)
  - `grandTotal: number` (minutes)
- Passes totals down to `<WeekGridDesktop>`.
- Continues to host the DnD context, dialogs, and optimistic state.

### `<WeekNav>` (DELETE)

Folded into `<ScheduleToolbar>`.

---

## Layout integration

### `src/app/(dashboard)/layout.tsx` (rewrite)

Was: a single header bar with links + LogoutButton + ThemeToggle.

Now: a thin Server Component that fetches `ctx` + `company` and returns
`<AppShell ctx={ctx} company={company}>{children}</AppShell>`. The
previous header markup is owned by AppShell now.

---

## CSS variables (`src/app/globals.css`)

Shift the `--primary` and `--ring` (and their dark counterparts) to
the teal palette. Other variables (background, card, border, etc.)
stay neutral. The constants:

```css
:root {
  --primary: oklch(0.62 0.10 195);
  --primary-foreground: oklch(0.985 0 0);
  --ring: oklch(0.62 0.06 195);
}

.dark {
  --primary: oklch(0.74 0.11 190);
  --primary-foreground: oklch(0.205 0 0);
  --ring: oklch(0.55 0.10 195);
}
```

(Exact values may be tuned during implementation for AA contrast.)

---

## Negative space — what is NOT in Phase 4

- No new Server Action.
- No new repository function.
- No new DB column or table.
- The filter panel controls are visually present but do NOT filter.
- No profile photos (only initials in avatars).
- No keyboard shortcuts for the sidebar / toolbar.

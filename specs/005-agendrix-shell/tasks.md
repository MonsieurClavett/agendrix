---
description: "Task list for the Agendrix-Style Shell feature (Phase 4)"
---

# Tasks: Agendrix-Style Shell

**Input**: Design documents from `/specs/005-agendrix-shell/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md. Phases 0–3 MUST be in place.

**Tests**: Manual browser smoke (carry-over per Constitution III).

**Organization**: Tasks grouped by user story.

## Format

`- [X] TXXX [P?] [USX?] Description with file path`

---

## Phase 1: Setup

- [X] T001 Install Phase 4 dep: `npm install @radix-ui/react-tooltip`. (Sheet, Avatar, Separator, Select are hand-rolled — no install.)

---

## Phase 2: Foundational

**Purpose**: UI primitives + helpers + teal accent. Shared by all three user stories.

### Primitives (all [P], different files)

- [X] T002 [P] Create `src/components/ui/sheet.tsx` — hand-rolled shadcn-style Sheet around `@radix-ui/react-dialog`. Exposes `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent` (with prop `side: "left" | "right"`), `SheetHeader`, `SheetTitle`, `SheetDescription`. Slide-in animations via `data-[state=open]:slide-in-from-left` Tailwind animate-css classes (already installed via tw-animate-css in Phase 0).
- [X] T003 [P] Create `src/components/ui/tooltip.tsx` — thin Radix Tooltip wrapper exposing `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent` with the project's typography defaults. `TooltipProvider` must support a `delayDuration` prop (default 200).
- [X] T004 [P] Create `src/components/ui/separator.tsx` — a 1-px `<div>` themed via `--border`. Props: `orientation: "horizontal" | "vertical"`, optional `className`. No Radix dep.
- [X] T005 [P] Create `src/components/ui/avatar.tsx` — circular `<div>` rendering two-letter initials from `name` on a deterministic background color from `getAvatarColor(name)`. Props: `{ name: string | null; size?: "sm" | "md" | "lg" }`. Sizes: sm = 28 px, md = 36 px, lg = 48 px.

### Helpers

- [X] T006 [P] Create `src/lib/avatar.ts` exporting:
  - `getInitials(name: string | null | undefined): string` — returns up to two uppercase letters (first letter of first word + first letter of last word; or first two letters of single word; or `?` for nullish).
  - `getAvatarColor(seed: string): { bg: string; fg: string }` — djb2-style hash of `seed` → index into an `AVATAR_PALETTE` constant (8 OKLCH `{bg, fg}` pairs, see data-model.md).

### Brand accent

- [X] T007 Update `src/app/globals.css`: change `:root --primary` to `oklch(0.62 0.10 195)`, `:root --primary-foreground` to `oklch(0.985 0 0)`, `:root --ring` to `oklch(0.62 0.06 195)`. Change `.dark --primary` to `oklch(0.74 0.11 190)`, `.dark --primary-foreground` to `oklch(0.205 0 0)`, `.dark --ring` to `oklch(0.55 0.10 195)`. Leave all other tokens unchanged. Verify by inspection that contrast on Buttons remains AA-acceptable in both themes (tune if obviously off).

**Checkpoint**: UI primitives ready, helpers ready, teal accent live across the existing pages (without layout change yet).

---

## Phase 3: User Story 1 - App shell with sidebar (Priority: P1) 🎯 MVP

**Goal**: Replace the current top-header dashboard layout with a left sidebar + content shell. Sidebar adapts: expanded ≥ 1024 px, collapsed icon-only at 768–1023 px, hamburger drawer < 768 px.

**Independent Test**: Sign in → land in a page that has the new left sidebar with three nav items (Accueil, Horaires, Équipe-for-MANAGER), theme toggle, sign-out. Active item highlighted. Responsive collapse works at the three breakpoints.

### Implementation for User Story 1

- [X] T008 [P] [US1] Create `src/components/shell/SidebarNav.tsx` (`"use client"`): renders the list of nav links. Props: `{ ctx: TenantContext; collapsed: boolean; onNavigate?: () => void }`. Hard-coded nav items array `[{ href: "/dashboard", label: "Accueil", icon: HomeIcon }, { href: "/schedules", label: "Horaires", icon: CalendarIcon }, { href: "/team", label: "Équipe", icon: UsersIcon, managerOnly: true }]`. Filter by `ctx.role` before render. Use `usePathname()` to determine active state; active link has `bg-accent text-accent-foreground` styling. When `collapsed`, hide labels and show icon only; wrap each nav link in `<Tooltip>` so the label appears on hover. The `onNavigate` callback fires after navigation — used by MobileSidebar to close the drawer.
- [X] T009 [P] [US1] Create `src/components/shell/Sidebar.tsx` (Server Component): renders the desktop sidebar — a `<aside>` element fixed-width 56px (collapsed) or 224px (expanded) controlled by Tailwind responsive classes (`md:w-14 lg:w-56`). Header at top: a small Agendrix wordmark / brand block. Then `<SidebarNav>` (`collapsed` prop driven by a CSS-only show/hide of labels — pass `collapsed={true}` always; the SidebarNav uses `md:hidden lg:inline` on labels so they appear only at lg+). Footer: `<ThemeToggle />` + `<LogoutButton />` stacked. Takes `{ ctx }` as a prop.
- [X] T010 [P] [US1] Create `src/components/shell/MobileSidebar.tsx` (`"use client"`): a `<Sheet>` with `side="left"`. The trigger is a hamburger Button (lucide `MenuIcon`). Content contains the same wordmark + `<SidebarNav collapsed={false} onNavigate={() => setOpen(false)} />` + footer (theme toggle + logout). Takes `{ ctx }` as a prop.
- [X] T011 [US1] Create `src/components/shell/AppShell.tsx`: takes `{ ctx, company, children }`. Renders:
  - On `md:flex` (≥ 768 px): a flex row layout. Left: `<Sidebar ctx={ctx} />` (hidden on `< md`). Right: a flex column containing a `<header>` with the company name on the left and a small user avatar (initials, `<Avatar name={ctx.email ?? ""} />`) on the right, then the `<main>` body with `{children}`.
  - On `< md`: stacks. A `<header>` at top with `<MobileSidebar ctx={ctx} />` (the trigger), company name, and avatar. Then `<main>{children}</main>`.
  - Mounts `<TooltipProvider delayDuration={200}>` at the root so all descendants (including `SidebarNav` collapsed icons and `FilterPanel` tooltips) work.
- [X] T012 [US1] Rewrite `src/app/(dashboard)/layout.tsx`: keep `requireTenantContext()` + `getCurrentCompany()` calls, then return `<AppShell ctx={ctx} company={company}>{children}</AppShell>`. Drop the previous header markup entirely (it's owned by AppShell now).
- [ ] T013 [US1] Manual smoke per quickstart.md US1: sign in → confirm sidebar renders with three items for MANAGER, two for EMPLOYEE; active highlight follows the current pathname; theme toggle and logout still work; window resizing collapses / hides the sidebar at the right breakpoints; teal accent visible on Buttons + active nav.

**Checkpoint**: US1 functional. The whole app looks more "product-like".

---

## Phase 4: User Story 2 - Schedule toolbar + compact-card grid + totals (Priority: P2)

**Goal**: Redesign the /schedules page interior: new toolbar, compact stacked shift cards (replace 24h axis blocks), per-row + per-day + grand totals, employee avatar + name + week-total on the left.

**Independent Test**: A MANAGER opens `/schedules` and sees the toolbar (Créer + search + nav + view selector), avatar-rich employee rows with totals, compact stacked shift cards in cells, and the totals row + column. Drag-and-drop still works on the new cards. See `quickstart.md` US2.

### Implementation for User Story 2

- [X] T014 [US2] Create `src/app/(dashboard)/schedules/_components/ScheduleToolbar.tsx` (`"use client"`): controlled component. Props: `{ range, today, canMutate, searchTerm, onSearchChange, onCreateClick }`. Layout (flex wrap): primary "Créer" Button (only when `canMutate`, leftmost), employee-search `<Input placeholder="Rechercher un employé…">` (controlled by `searchTerm`/`onSearchChange`, width ~280 px on desktop, full on mobile), spacer (`flex-1`), "Aujourd'hui" `<Button asChild variant="outline" size="sm"><Link href="/schedules">…</Link></Button>`, prev-week Link Button with `chevron-left` icon, date-range label like "25-31 mai 2026" (computed from `range` using `formatLongDate` short variant or a new helper), next-week Link Button with `chevron-right` icon, view `<select>` with single option "Semaine".
- [X] T015 [US2] Rewrite `src/app/(dashboard)/schedules/_components/ShiftBlock.tsx`: drop the absolute positioning and the hour-height math. Render a compact card: `<div>` with rounded border (`rounded-md border`), padding (`px-2 py-1.5`), background `bg-card`, hover `hover:bg-accent/40` when `canDrag`. Two text rows: bold `text-sm` time range "HH:mm–HH:mm" (with optional `(+1j)` suffix) on top; secondary `text-xs text-muted-foreground` below showing `shift.note` if set, else "Quart". `useDraggable` wiring stays exactly as in Phase 3 (registered only when `canDrag`). `onClick` opens the edit dialog (existing). When dragging, apply transform + opacity 0.5.
- [X] T016 [US2] Rewrite `src/app/(dashboard)/schedules/_components/DropCell.tsx`: drop the fixed-height + relative positioning. Render as `<div>` with `flex flex-col gap-1.5 p-1 min-h-[64px]`. The `useDroppable` wiring stays. `isOver` adds `bg-accent/40` highlight. Children (ShiftBlocks) just stack naturally.
- [X] T017 [US2] Rewrite `src/app/(dashboard)/schedules/_components/WeekGridDesktop.tsx`: new structure.
  - Wrap in a `<div>` with `bg-card border rounded-md overflow-x-auto`.
  - Inside, a `<div>` with `min-w-[900px]`.
  - CSS Grid `grid-template-columns: 220px repeat(7, minmax(0, 1fr)) 88px`.
  - Header row: empty `<div>` (top-left corner) + 7 day-labels (`<div className="border-l p-2 text-center text-xs font-medium uppercase">` showing "Lun. 25" style with day abbreviation + date) + "TOTAL" header.
  - Body: one row per visible employee (filtered by `searchTerm`). The left cell shows `<Avatar name={emp.name} size="md" />` + the name + a small line `Xh` summarising the per-employee total. The 7 day-cells each render a `<DropCell>` containing matching `<ShiftBlock>`s. The right cell shows the per-employee week total in bold (e.g., "16h30").
  - Footer: a row with label "Total pour la succursale" in the leftmost cell, then 7 daily-total cells, then the grand-total cell.
  - Time totals are passed in as props (`employeeTotals: Map<string, number>`, `dayTotals: number[]`, `grandTotal: number`) so the parent (`ScheduleCalendar`) computes them via `useMemo`. Format minutes as `Xh` or `XhYY` (e.g., 90 → "1h30").
- [X] T018 [P] [US2] Update `src/app/(dashboard)/schedules/_components/WeekStackedMobile.tsx`: keep its layout but bump the typography (day headers larger, spacing more generous) so the mobile experience matches the desktop's polish.
- [X] T019 [US2] Update `src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx`: add `searchTerm` state, compute three totals via `useMemo` from `optimisticShifts`:
  - `employeeTotalsMinutes: Map<string, number>` — per `employeeId`.
  - `dayTotalsMinutes: number[]` (length 7) — sum per day of week.
  - `grandTotalMinutes: number`.
  - Define a tiny `formatHoursMinutes(min)` helper inline that returns "Xh" or "XhYY" (zero-pad minutes).
  - Pass totals down to `<WeekGridDesktop>`. Pass `searchTerm` for row filtering.
  - Render the `<ScheduleToolbar>` ABOVE the grid (the page-level "Ajouter un shift" Button + WeekNav from Phase 3 are now inside the toolbar, so they leave the page-level header).
- [X] T020 [US2] Update `src/app/(dashboard)/schedules/page.tsx`: drop the standalone heading + WeekNav. Render only `<ScheduleCalendar />` (which now contains the toolbar internally). Keep the role-aware page heading INSIDE ScheduleCalendar by passing role-derived strings if needed (or move them to ScheduleCalendar's toolbar area). The page itself becomes a thin wrapper that just fetches data and passes it down.
- [X] T021 [US2] Delete `src/app/(dashboard)/schedules/_components/WeekNav.tsx` (replaced by ScheduleToolbar).
- [ ] T022 [US2] Manual smoke per quickstart.md US2: load `/schedules` as MANAGER on desktop. Confirm toolbar with all controls, avatars and per-row totals, compact cards stacked in cells, Total column on the right, "Total pour la succursale" footer row with day + grand totals. Type "ali" in search → only matching rows. Drag a shift to another cell → toast + persistence + totals re-compute. Resize to mobile → stacked view still works.

**Checkpoint**: US1 + US2 work. The schedules page now genuinely feels like a workforce-scheduling tool.

---

## Phase 5: User Story 3 - Filter panel placeholder (Priority: P3)

**Goal**: Add a left-aligned filter panel (~240 px) with three sections of disabled controls + "Bientôt" tooltips.

**Independent Test**: A MANAGER on desktop sees the filter panel left of the calendar; all controls are disabled with a "Bientôt disponible" tooltip on hover. The panel hides on < 1024 px.

### Implementation for User Story 3

- [X] T023 [US3] Create `src/app/(dashboard)/schedules/_components/FilterPanel.tsx` (`"use client"`): a `<aside>` with `w-60 shrink-0 hidden lg:block border-r p-4 space-y-6` containing three sections:
  - **Gérer par**: a 2-Button segmented control. "Employé" is the active variant (default). "Position" is `disabled` and wrapped in `<Tooltip>` with content "Bientôt disponible".
  - **Positions** (with section header "Filtres"): a list of 3+ disabled `<input type="checkbox">` with labels like "Bar", "Cuisine", "Service", each wrapped in a `<Tooltip>`. Includes a muted caption "Bientôt disponible" below the list.
  - **Affichage**: a list of 3+ disabled checkboxes: "Masquer les quarts en arrière-plan", "Masquer les quarts à combler", "Grouper par position". Same Tooltip + caption pattern.
- [X] T024 [US3] Wire the FilterPanel into `src/app/(dashboard)/schedules/page.tsx`: wrap the page content in a flex row — `<FilterPanel />` + the existing `<ScheduleCalendar />`. The FilterPanel has its own `hidden lg:block` so it disappears below 1024 px automatically.
- [ ] T025 [US3] Manual smoke per quickstart.md US3: confirm the panel renders on a wide screen; tooltips appear on hover over disabled controls; panel disappears at narrow widths.

**Checkpoint**: All three user stories complete. Phase 4 feature done.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T026 [P] Run `npx tsc --noEmit`. Fix any TypeScript errors.
- [X] T027 [P] Run `npm run dev`. Visit `/`, `/login`, `/signup`, `/dashboard`, `/team`, `/schedules` as MANAGER and EMPLOYEE in both light + dark themes. Confirm no runtime errors. Compare visual against the Agendrix screenshot — note any obvious style drift (spacings, colors, density) and tweak.
- [ ] T028 Walk every smoke step in `quickstart.md` end-to-end.
- [X] T029 Commit Phase 4 in five SDD-narrative commits on the `005-agendrix-shell` branch:
   - `[Spec Kit] Add specification` — spec.md + checklist
   - `[Spec Kit] Add implementation plan` — plan.md + research.md + data-model.md + contracts/ + quickstart.md + CLAUDE.md
   - `[Spec Kit] Add tasks` — tasks.md
   - `[Spec Kit] Implementation progress` — all `src/` changes + package.json
   - `[Spec Kit] Mark T030 complete (branch pushed)` — after push
- [ ] T030 Push: `git push -u origin 005-agendrix-shell`.

---

## Dependencies & Execution Order

- Setup (Phase 1) → Foundational (Phase 2) → US1 → US2 → US3 → Polish.
- Within Phase 2: T002–T006 are [P]; T007 is independent and can also run [P]. (Total: 6 tasks all parallel-safe.)
- Within US1: T008/T009/T010 are [P] (different files); T011 depends on all three; T012 depends on T011.
- Within US2: T015/T016/T018 are [P] (different files); T017 depends on T015 + T016; T019 depends on T017; T020 depends on T019; T014 is [P] with T015/16/17.
- US3 (T023/T024) depends on T002 (Tooltip exists) — which is Phase 2.

## Implementation Strategy

### MVP First (US1 only)
1. Setup + Foundational → primitives ready.
2. US1 → the WHOLE APP now looks more product-y just from the sidebar. Demoable.

### Incremental Delivery
1. + US2 → the schedules page is fully redesigned.
2. + US3 → filter panel scaffolding visible.
3. + Polish → typecheck + smoke + commits + push.

### Solo Dev (this project)
Sequential, batch [P] tasks into one edit pass per file.

---

## Notes

- `[P]` = different files, no dependency on incomplete tasks.
- `[Story]` maps tasks to a user story.
- No new Server Action, no new repo function — Phase 4 reuses everything backend-side. The constitutional grep ("no `db.shift.*` outside repositories") still holds because no new query is added.
- Carry-over: dark mode + toasts + drag-and-drop all keep working in the new layout. Any regression on those is a bug, not a feature.

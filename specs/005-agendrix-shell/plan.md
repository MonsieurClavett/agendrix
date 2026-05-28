# Implementation Plan: Agendrix-Style Shell

**Branch**: `005-agendrix-shell` | **Date**: 2026-05-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-agendrix-shell/spec.md`

## Summary

Replace the current top-header layout with a left sidebar + content
shell. Redesign `/schedules` with a toolbar, a left filter-panel
placeholder, a compact-card grid (no more 24h-axis), per-employee +
per-day totals, and avatars with deterministic colors. Shift the brand
accent from neutral to teal across light + dark themes. Zero backend
change — pure presentation refresh on top of Phases 0–3.

One new dependency: `@radix-ui/react-tooltip` for the "Bientôt"
hover tooltips on the filter-panel placeholders. The Sheet primitive
(used for the mobile sidebar drawer) is hand-rolled around the
already-installed `@radix-ui/react-dialog`. Avatar, Separator, and
Select are simple enough to author without Radix wrappers.

## Technical Context

**Language/Version**: TypeScript (strict) on Next.js 16 (App Router), Node.js 24 — carry-over.

**Primary Dependencies**: existing stack + 1 new client lib:
- `@radix-ui/react-tooltip` — for the disabled-control tooltips in the filter panel.

Everything else (Sheet, Avatar, Separator, Select) is built from
existing primitives (Radix Dialog already installed, plain `<div>` and
native `<select>` for the rest).

**Storage**: No DB change.

**Testing**: Manual browser smoke (carry-over per Constitution III).

**Target Platform**: Web — modern desktop, tablet, and mobile browsers.

**Project Type**: Same single Next.js project. New shell components
under `src/components/shell/`. New schedules toolbar + filter-panel
under `src/app/(dashboard)/schedules/_components/`. Existing schedule
components rewritten in place (kept file names where possible).

**Performance Goals**:
- Sidebar collapse / expand animation < 200 ms.
- Toolbar search filter response perceptually instant (≤ 16 ms per
  keystroke for ≤ 50 employees).
- Totals recomputation < 5 ms per render for ≤ 50 shifts.

**Constraints**:
- All Phase 0–3 invariants carry over: tenant isolation, role gating,
  overlap detection, theme persistence, drag-and-drop semantics.
- The CSS variable refactor MUST keep both themes (light + dark) readable.
- The three-pane layout (sidebar | filter panel | calendar) must
  degrade gracefully through tablet (no filter panel) and mobile
  (no sidebar; hamburger).

**Scale/Scope**: MVP — ≤ 50 employees / week.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.0.0 (unchanged).

| Principle | How this plan satisfies it | Verdict |
|-----------|---------------------------|---------|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | No server-side changes. Same Server Actions, same repository layer, same `requireTenantContext` / `requireManagerContext`. | ✅ PASS |
| **II. Specification-Driven Development (NON-NEGOTIABLE)** | This plan follows `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` pipeline. | ✅ PASS |
| **III. Simplicity First (YAGNI)** | One new dependency (`@radix-ui/react-tooltip`); everything else is hand-rolled on existing primitives. No new entity, no new Server Action, no new repository function. The filter-panel placeholder controls do NOTHING — they are visual scaffolding for Phase 5+. | ✅ PASS |
| **IV. Type Safety End-to-End** | All new components typed. The `getAvatarColor(name)` helper has explicit input/output types. Totals computation is a typed reducer over the existing `WeekShift[]`. No `any`. | ✅ PASS |
| **V. Server-Authoritative Authorization** | EMPLOYEE nav items are server-rendered (the sidebar is a Server Component that reads `ctx.role`). "Créer" button server-rendered (hidden when not MANAGER). Drag handlers on cards still only register for MANAGER. | ✅ PASS |

**Gate verdict**: All five principles pass. Complexity Tracking section remains empty.

## Project Structure

### Documentation (this feature)

```text
specs/005-agendrix-shell/
├── spec.md
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── components.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 of /speckit pipeline (not here)
```

### Source Code (delta against Phase 3 baseline)

```text
agendrix/
├── src/
│   ├── app/
│   │   ├── globals.css                              # ★ teal accent palette
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                            # ★ rewritten — uses AppShell
│   │   │   ├── dashboard/page.tsx                    # carry-over (renders inside AppShell)
│   │   │   ├── team/                                 # carry-over
│   │   │   └── schedules/
│   │   │       ├── page.tsx                          # ★ adds FilterPanel + ScheduleToolbar
│   │   │       └── _components/
│   │   │           ├── ScheduleCalendar.tsx          # ★ minor adjustments
│   │   │           ├── WeekGridDesktop.tsx           # ★ rewritten as roster table with totals
│   │   │           ├── ShiftBlock.tsx                # ★ compact card style (no axis math)
│   │   │           ├── DropCell.tsx                  # ★ stacks children instead of positioning
│   │   │           ├── WeekStackedMobile.tsx         # carry-over with minor type touch-up
│   │   │           ├── EmptyWeekCard.tsx             # carry-over
│   │   │           ├── ShiftDialog.tsx               # carry-over
│   │   │           ├── DeleteShiftDialog.tsx         # carry-over
│   │   │           ├── ScheduleToolbar.tsx           # ★ NEW (replaces WeekNav)
│   │   │           ├── FilterPanel.tsx               # ★ NEW (placeholder)
│   │   │           └── WeekNav.tsx                   # ★ DELETE (folded into ScheduleToolbar)
│   ├── components/
│   │   ├── shell/
│   │   │   ├── AppShell.tsx                          # ★ NEW orchestrator (sidebar + content)
│   │   │   ├── Sidebar.tsx                           # ★ NEW desktop sidebar
│   │   │   ├── SidebarNav.tsx                        # ★ NEW nav-link list
│   │   │   └── MobileSidebar.tsx                     # ★ NEW Sheet-wrapped drawer
│   │   ├── ui/
│   │   │   ├── sheet.tsx                             # ★ NEW (Radix Dialog → side drawer)
│   │   │   ├── tooltip.tsx                           # ★ NEW (Radix Tooltip wrapper)
│   │   │   ├── separator.tsx                         # ★ NEW (1-px divider)
│   │   │   ├── avatar.tsx                            # ★ NEW (initials + deterministic color)
│   │   │   └── ... (existing components untouched)
│   │   └── theme/                                    # carry-over
│   └── lib/
│       ├── avatar.ts                                  # ★ NEW (getAvatarColor + initials)
│       └── ... (existing untouched)
```

**Structure Decision**: The AppShell becomes the layout for every
authenticated page. The `(dashboard)/layout.tsx` (carry-over folder
name from Phase 0) becomes a thin wrapper that fetches the
`TenantContext` server-side and renders `<AppShell ctx={ctx} company={company}>{children}</AppShell>`.

The Sidebar is split into:
- `Sidebar.tsx` — desktop / tablet (≥ 768 px); CSS responds to width
  via Tailwind classes (`hidden md:flex`, `lg:w-56`, `md:w-16` etc.) to
  toggle between icon-only and icon+label.
- `MobileSidebar.tsx` — wraps `<Sheet>` (our new hand-rolled Radix
  Dialog drawer); the hamburger trigger lives in the AppShell header.
- `SidebarNav.tsx` — pure rendering of the nav-item list, shared by
  both Sidebar and MobileSidebar.

The schedule view layout becomes a 3-column flex on desktop:
`[FilterPanel: 240px] [Calendar: 1fr]` with the AppShell already
providing the outer sidebar column. Below 1024 px, the FilterPanel
hides; below 768 px, the AppShell sidebar hides too.

The WeekGridDesktop is now a real `<table>`-style component (using
CSS Grid still, but conceptually a roster): one header row with day
labels + Total column, employee rows, and a footer row "Total pour
la succursale". Each (day, employee) cell is a vertical stack of
compact ShiftBlock cards. No more 24h time axis.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Empty.

## Post-Design Re-Check

After Phase 1 design:

- The shell components are pure presentation. They take a `ctx` prop
  with `role` and render conditional nav items based on that — same
  server-authoritative gating as Phase 3.
- The filter panel is intentionally inert (all controls `disabled`).
  No risk of confusion with future Phase-5+ filter logic because the
  controls do not even mount any state handlers.
- The avatar color helper is a pure function over the user's name.
  Two distinct users with the same name share an avatar color — this
  is acceptable per the spec's Edge Cases section.
- Totals computation is a single pass over the optimistic shifts
  array (derived state via `useMemo`). It updates immediately when
  drag-and-drop moves a shift, satisfying SC-007.
- `quickstart.md` includes an adversarial role check: EMPLOYEE
  navigates to the sidebar's "Équipe" item via direct URL — the
  page-level guard (Phase 1's `requireManagerContext`) still
  redirects them; the sidebar simply doesn't surface the link.

Gate remains: ✅ PASS.

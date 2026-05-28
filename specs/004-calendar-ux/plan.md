# Implementation Plan: Calendar UX Overhaul

**Branch**: `004-calendar-ux` | **Date**: 2026-05-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-calendar-ux/spec.md`

## Summary

Replace `/schedules`'s list rendering with a visual grid (7 day-columns ×
employee-rows on desktop, vertical stack on mobile). Add drag-and-drop
shift reassignment that reuses the existing `updateShiftAction`. Add
toast feedback (sonner) for every shift mutation. Add dark mode toggle
(next-themes) with FOUC-free SSR hydration. Replace empty weeks with
an inline-SVG empty-state card. All changes are presentation-layer only
— no schema change, no new repository function, no new Server Action.

Three new dependencies: `sonner` (toasts), `next-themes` (theme
management + FOUC prevention), `@dnd-kit/core` (accessible drag-and-drop
primitive). All small, well-maintained, no transitive bloat.

## Technical Context

**Language/Version**: TypeScript (strict) on Next.js 16 (App Router), Node.js 24 — carry-over.

**Primary Dependencies**: existing stack + 3 new client libs:
- `sonner` (^2.x) — toast primitive, ~5 KB gzipped, single component `<Toaster />`
- `next-themes` (^0.4.x) — wraps `<ThemeProvider>` + `<html data-theme>`, supports cookie persistence and server-render-aware FOUC suppression
- `@dnd-kit/core` (^6.x) — accessible drag-and-drop primitive, keyboard support, ~10 KB gzipped, no external state requirements

**Storage**: No DB change. Theme preference stored in an httpOnly-free cookie (`theme=light|dark`), readable from both server and client.

**Testing**: Manual browser smoke (carry-over). Spec did not request automated tests.

**Target Platform**: Web — modern desktop AND mobile browsers (both first-class in this phase).

**Project Type**: Same single Next.js project. Mostly new client components under `src/app/(dashboard)/schedules/_components/`, new theme components under `src/components/theme/`, one root-layout-level `<Toaster />` mount, one root-layout-level `<ThemeProvider>` wrapper.

**Performance Goals**:
- Grid render < 100 ms for a week with up to 50 shifts (SC-001-adjacent).
- Drag drop response < 500 ms end-to-end on rejection (SC-003).
- Zero theme FOUC (SC-006).

**Constraints**:
- Tenant isolation and role gating from Phases 0–2 MUST remain intact (FR-021/22/23). The server-side Server Actions are unchanged; the only change is that the same action is now invoked from a drag handler in addition to the form submit.
- Drag-and-drop MUST be keyboard accessible (dnd-kit's `KeyboardSensor` provides this by default).
- Theme MUST apply BEFORE first paint on every navigation (next-themes' SSR-aware mode + cookie reading does this).
- Mobile (< 768 px) MUST NOT register drag handlers (per spec FR-012).

**Scale/Scope**: MVP — same scale targets as Phase 2 (≤ 50 shifts/week, ≤ 20 employees). Grid layout uses CSS Grid (one row per employee + a header row) and absolutely-positioned shift blocks within each cell.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.0.0 (unchanged).

| Principle | How this plan satisfies it | Verdict |
|-----------|---------------------------|---------|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | No server-side changes. The repository layer, the Server Actions, and the tenant context helper are unchanged. Drag-and-drop ultimately calls the same `updateShiftAction` that the edit dialog calls — the same `requireManagerContext()` + same repo function + same overlap check inside the same transaction. Zero new code path that could leak across tenants. | ✅ PASS |
| **II. Specification-Driven Development (NON-NEGOTIABLE)** | This plan is the output of `/speckit-plan` operating on `/speckit-specify`. Implementation will be driven by `/speckit-tasks` → `/speckit-implement`. | ✅ PASS |
| **III. Simplicity First (YAGNI)** | Three small dependencies justified by use: toasts, theme persistence, accessible drag-and-drop are each non-trivial to hand-roll well. No additional schema, no new tables, no new Server Action. No celebratory animations or theatrical transitions. No drag-to-resize, no undo stack — both deferred. | ✅ PASS |
| **IV. Type Safety End-to-End** | All new components are typed (`<Toaster />` props from sonner, `<ThemeProvider>` from next-themes, `DndContext` typed children). The optimistic-update reducer types its action union explicitly. No `any`. | ✅ PASS |
| **V. Server-Authoritative Authorization** | Drag handlers are wired only on MANAGER renders (page-level role check). EMPLOYEE renders simply do not include the Draggable component. Crafted requests still hit `updateShiftAction` → `requireManagerContext()` → throw. Theme toggle is non-sensitive (cookie-only, no auth required). | ✅ PASS |

**Gate verdict**: All five principles pass. Complexity Tracking section remains empty.

## Project Structure

### Documentation (this feature)

```text
specs/004-calendar-ux/
├── spec.md
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── components.md    # UI component contracts (no new Server Action)
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 of /speckit pipeline (not here)
```

### Source Code (delta against Phase 2 baseline)

```text
agendrix/
├── src/
│   ├── app/
│   │   ├── layout.tsx                              # ★ wraps in ThemeProvider + mounts <Toaster />
│   │   └── (dashboard)/
│   │       ├── layout.tsx                          # ★ adds <ThemeToggle /> to header
│   │       └── schedules/
│   │           ├── page.tsx                        # ★ replaces WeekGrid with role-aware Calendar
│   │           └── _components/
│   │               ├── ScheduleCalendar.tsx        # ★ new — orchestrator: grid + mobile stack + DnD context
│   │               ├── WeekGridDesktop.tsx         # ★ new — CSS Grid 7×N with positioned shift blocks
│   │               ├── WeekStackedMobile.tsx       # ★ new — vertical day list for < 768 px
│   │               ├── ShiftBlock.tsx              # ★ new — draggable block component
│   │               ├── DropCell.tsx                # ★ new — droppable (day, employee) cell
│   │               ├── EmptyWeekCard.tsx           # ★ new — inline SVG empty state
│   │               ├── ShiftDialog.tsx             # carried — now also dispatches toast on success
│   │               ├── DeleteShiftDialog.tsx       # carried — toast on success
│   │               └── WeekNav.tsx                 # carried unchanged
│   ├── actions/
│   │   ├── shifts/
│   │   │   ├── create.ts                            # carried unchanged
│   │   │   ├── update.ts                            # carried unchanged
│   │   │   └── delete.ts                            # carried unchanged
│   │   └── theme/
│   │       └── set-theme.ts                         # ★ new — cookie-writing Server Action
│   ├── components/
│   │   ├── theme/
│   │   │   ├── ThemeProvider.tsx                    # ★ next-themes wrapper
│   │   │   └── ThemeToggle.tsx                      # ★ sun/moon Button
│   │   └── ui/
│   │       └── ... (carried unchanged)
│   └── ... (everything else unchanged)
```

**Structure Decision**: All new code is presentation-layer. The
`ScheduleCalendar` orchestrator decides — based on a CSS media query
(via Tailwind responsive classes) and on `role` — which sub-view to
render. The desktop grid uses CSS Grid (one cell per (day, employee))
with shift blocks rendered via absolute positioning relative to their
cell. The mobile stack is a list-of-days indistinguishable in semantics
from Phase 2's WeekGrid but with refreshed typography.

Drag-and-drop uses `@dnd-kit`'s `<DndContext>` wrapping ONLY the desktop
grid. The `ShiftBlock` becomes a `<Draggable>` (only when role is
MANAGER and viewport ≥ 768 px — handled by a small `useIsDesktop()` hook
or, simpler, by conditionally rendering `<ShiftBlock>` vs a plain
`<button>`). Cells are `<Droppable>` keyed by `${dayISO}|${employeeId}`.
On drop, the client computes the new `startsAt` / `endsAt` (preserving
the original time, only the date changes) and fires `updateShiftAction`
with the new `employeeId` + `date`. Optimistic UI uses React 19
`useOptimistic` to immediately move the block; the server response
either confirms or causes a visual rollback + error toast.

Toasts are emitted from client components (`toast.success(...)` /
`toast.error(...)`) after the action settles. The Server Action does
NOT call toast itself — it remains pure UI-agnostic.

Theme: `<ThemeProvider attribute="class" defaultTheme="system" enableSystem
storageKey="agendrix-theme">` at the root layout. The theme class is
written to `<html>` server-side using the cookie value (next-themes'
SSR script handles FOUC). The `<ThemeToggle>` flips the class via the
provider's `setTheme()` and persists via cookie writer.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Empty.

## Post-Design Re-Check

After Phase 1 design:

- The drag-and-drop path REUSES `updateShiftAction` — no new
  Server Action introduced. Principle I + V remain enforced at the
  exact same boundary as Phase 2.
- The optimistic UI is purely client-side. The server is the source
  of truth; client state is reset to match the server response after
  every settle.
- The cookie storing theme is non-auth, non-tenant-scoped, no PII.
  Reading it before the body renders is what eliminates FOUC.
- Mobile users get the EXACT same data via the stacked-day view —
  no feature regression, just a layout difference.
- `quickstart.md` includes an adversarial test: EMPLOYEE attempts to
  trigger a drag programmatically via DevTools (e.g., dispatching
  pointer events) — MUST NOT succeed because the Draggable handler is
  not rendered for their role.

Gate remains: ✅ PASS.

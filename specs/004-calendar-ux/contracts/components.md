# Component Contracts (Phase 3)

**Feature**: Calendar UX Overhaul
**Date**: 2026-05-28

Phase 3 is presentation-layer only — no new Server Action or repository
function. The drag-and-drop path reuses `updateShiftAction`
(`src/actions/shifts/update.ts`) by submitting a synthetic FormData
with the new `date` + `employeeId` (and the unchanged `start`/`end`).

---

## Server-side helpers (existing, no changes)

- `requireTenantContext()` — unchanged.
- `requireManagerContext()` — unchanged.
- `listShiftsForCompanyWeek(ctx, range)` — unchanged.
- `listShiftsForUserWeek(ctx, userId, range)` — unchanged.
- `createShiftAction` / `updateShiftAction` / `deleteShiftAction` —
  unchanged signatures; clients now also surface toasts on their
  return values.

---

## New client components

### `<ThemeProvider>`

**File**: `src/components/theme/ThemeProvider.tsx`

Wraps the `next-themes` `ThemeProvider` with the project's defaults:

```typescript
<NextThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  storageKey="agendrix-theme"
  disableTransitionOnChange
>
  {children}
</NextThemeProvider>
```

Mounted once in `src/app/layout.tsx` between `<body>` and the rest of
the tree. The root `<html>` MUST have `suppressHydrationWarning` to
let next-themes apply the class before React hydrates.

### `<ThemeToggle>`

**File**: `src/components/theme/ThemeToggle.tsx`

Client Component. Uses `useTheme()` from next-themes. Renders a Button
icon (sun in light mode, moon in dark mode) that calls `setTheme()`
on click. Defends against the SSR-vs-client mismatch by rendering a
placeholder until mounted (the canonical next-themes pattern).

Inserted into `src/app/(dashboard)/layout.tsx`'s header, after the
nav links and before the LogoutButton.

### `<Toaster>` mount

**File**: `src/app/layout.tsx`

Imported from `sonner`; placed near `<body>` so it's available
on every page. Configured for top-right position, default close
button on errors, ~4 s success duration.

### Schedule page components

#### `<ScheduleCalendar>`

**File**: `src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx`

Orchestrator client component. Props:
- `shifts: WeekShift[]`
- `range: WeekRange`
- `employees: { id, name }[]` (full active list; for MANAGER only)
- `canMutate: boolean` (true for MANAGER, false for EMPLOYEE)
- `currentUserId: string`

Renders:
- `<WeekGridDesktop>` (hidden on `md:` viewport-down via Tailwind's
  responsive classes)
- `<WeekStackedMobile>` (hidden on `md:` viewport-up)
- Both fed by the same data; they're sibling renders, not conditionally
  mounted, so the responsive class controls visibility.

When `canMutate`, wraps the desktop grid in `<DndContext>` with
`PointerSensor` + `KeyboardSensor` and an `onDragEnd` handler that
optimistically moves the shift and fires `updateShiftAction`.

Holds the `useOptimistic` state for drag-and-drop.

#### `<WeekGridDesktop>`

**File**: `src/app/(dashboard)/schedules/_components/WeekGridDesktop.tsx`

The CSS Grid 7 × N layout. One row per employee, one column per day.
Renders a header row with day labels and dates. Each cell is a
`<DropCell>` keyed by `${dayISO}|${employeeId}`. Inside each cell,
the matching shifts are rendered as `<ShiftBlock>` instances.

Time axis: 00:00–24:00, 64 px per hour (CSS variable `--hour-height`).

#### `<WeekStackedMobile>`

**File**: `src/app/(dashboard)/schedules/_components/WeekStackedMobile.tsx`

Sibling of the desktop grid. Same data, vertical stacked rendering
(matches Phase 2's WeekGrid for layout but with refreshed typography
and spacing). Click-to-edit affordances rendered when `canMutate`.

#### `<ShiftBlock>`

**File**: `src/app/(dashboard)/schedules/_components/ShiftBlock.tsx`

A single shift's visual block. Receives the shift + `canDrag` flag.
When `canDrag`, registers as a `<Draggable>` via `useDraggable`. Click
opens the edit dialog (handled by parent). Renders time, name (if
not implied by row), and note (truncated).

#### `<DropCell>`

**File**: `src/app/(dashboard)/schedules/_components/DropCell.tsx`

A single (day, employee) cell. Registers as `<Droppable>`. Visually
highlights when a draggable is hovering over it.

#### `<EmptyWeekCard>`

**File**: `src/app/(dashboard)/schedules/_components/EmptyWeekCard.tsx`

Centered card with an inline SVG calendar illustration, "Aucun shift
cette semaine.", and (for MANAGER) a Button that opens the create-shift
dialog.

#### `<ShiftDialog>` (carried, lightly modified)

Same component as Phase 2. After a successful action, calls
`toast.success("Shift créé.")` / `toast.success("Shift mis à jour.")`.
On error, calls `toast.error(state.error)`.

#### `<DeleteShiftDialog>` (carried, lightly modified)

Same. On success → `toast.success("Shift supprimé.")`.

---

## Cookie reader

### `getThemeCookie()`

**File**: `src/lib/theme.ts`

Server-side helper that reads `cookies().get("agendrix-theme")` and
returns `"light" | "dark" | null`. Used by `src/app/layout.tsx` to
apply the initial class on `<html>` before the body renders, eliminating
FOUC.

---

## Drag-and-drop semantics (client-side flow)

1. User picks up a `<ShiftBlock>` → dnd-kit emits `onDragStart`.
2. User drops on a `<DropCell>` → dnd-kit emits `onDragEnd` with
   `{ active.id: shiftId, over.id: "YYYY-MM-DD|employeeId" }`.
3. Parse the drop cell key. If same as source → no-op.
4. Dispatch `optimistic.dispatch({ type: "move", shiftId, toDate, toEmployeeId })`.
5. Build a FormData with `shiftId`, `employeeId=toEmployeeId`, `date=toDate`, `start=originalStart`, `end=originalEnd`, `note=originalNote`.
6. `await updateShiftAction(state, formData)`.
7. If `state.success` → `toast.success("Shift déplacé.")`. The
   Server Action already calls `revalidatePath("/schedules")` so
   the next render shows the authoritative data; the optimistic
   state then resets.
8. If `state.error` → `optimistic.dispatch({ type: "rollback", shiftId })` and `toast.error(state.error)`.

If the drop is outside any cell, dnd-kit's `over` is `null` — no
optimistic dispatch, no Server Action call.

---

## Negative space — what is NOT in Phase 3

- No new Server Action.
- No new repository function.
- No new database column or table.
- No drag-to-resize.
- No undo for drag-and-drop.
- No multi-select drag.
- No customizable colors per shift / per employee.
- No drag on mobile (< 768 px).

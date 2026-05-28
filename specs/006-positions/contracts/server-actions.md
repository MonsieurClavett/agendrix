# Server Action Contracts (Phase 5)

**Feature**: Positions
**Date**: 2026-05-28

All position Server Actions begin with `await requireManagerContext()`.
Shift-action extensions reuse the same pattern. All writes go through
the new `src/lib/repositories/position.ts` or the extended
`src/lib/repositories/shift.ts` so the central tenant check applies.

---

## `createPositionAction`

**File**: `src/actions/positions/create.ts`

**Input (FormData fields)**:
| Field   | Type   | Validation                                                |
|---------|--------|-----------------------------------------------------------|
| `name`  | string | non-empty, ≤ 40 chars (Zod)                               |
| `color` | string | one of `POSITION_COLOR_KEYS` (Zod enum from positions.ts) |

**Effect**:
1. `requireManagerContext()`.
2. Zod parse.
3. `await createPosition(ctx, { name, color })` — repository:
   - Lowercases the trimmed name; checks for an existing position in
     the same company with the same lowercase name → throws `DUPLICATE`
     if found.
   - Inserts a Position with `companyId: ctx.companyId`.
   - Catches Prisma P2002 (unique constraint) as the same `DUPLICATE`
     for the rare concurrent-insert race.
4. Maps `DUPLICATE` → "Une position avec ce nom existe déjà."
5. `revalidatePath("/positions")` and `revalidatePath("/schedules")`.

**Return**:
```typescript
type CreatePositionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: true;
};
```

**Spec traceability**: FR-001, FR-002, FR-003.

---

## `updatePositionAction`

**File**: `src/actions/positions/update.ts`

**Input**:
| Field        | Type   | Validation                                             |
|--------------|--------|--------------------------------------------------------|
| `positionId` | string | non-empty                                              |
| `name`       | string | non-empty, ≤ 40 chars                                  |
| `color`      | string | one of `POSITION_COLOR_KEYS`                           |

**Effect**:
1. `requireManagerContext()`.
2. Zod parse.
3. `await updatePosition(ctx, positionId, { name, color })` — repository:
   - Tenant-scoped lookup; throws `NOT_FOUND` on miss.
   - Lowercase-name uniqueness check against OTHER positions of the
     same company (excluding self); throws `DUPLICATE` on collision.
   - Updates the row.
4. Maps `NOT_FOUND` and `DUPLICATE` to French messages.
5. `revalidatePath("/positions")` and `revalidatePath("/schedules")`.

**Spec traceability**: FR-004.

---

## `deletePositionAction`

**File**: `src/actions/positions/delete.ts`

**Input**:
| Field        | Type   | Validation |
|--------------|--------|------------|
| `positionId` | string | non-empty  |

**Effect**:
1. `requireManagerContext()`.
2. Zod parse.
3. `await deletePosition(ctx, positionId)` — repository:
   - `deleteMany({ where: { id, companyId: ctx.companyId } })`.
   - If `count === 0` → throw `NOT_FOUND`.
   - Affected shifts have their `positionId` automatically set to null
     by the FK's `ON DELETE: SET NULL`.
4. Maps `NOT_FOUND` to "Position introuvable."
5. `revalidatePath("/positions")` and `revalidatePath("/schedules")`.

**Spec traceability**: FR-005, FR-006.

---

## Extension to `createShiftAction` and `updateShiftAction`

**Files**: `src/actions/shifts/create.ts`, `src/actions/shifts/update.ts`.

**Input addition**:
| Field        | Type   | Validation                                          |
|--------------|--------|-----------------------------------------------------|
| `positionId` | string | optional; `""` or absent → null; otherwise non-empty |

**Effect**:
1. The Zod schema is extended with `positionId: z.string().optional()`.
2. Before calling the repository, the action converts `""` or `undefined` to `null`.
3. The repository function (`createShift` / `updateShift`) gains a new
   `positionId: string | null` parameter. Inside its existing
   transaction:
   - If `positionId !== null`: `tx.position.findFirst({ where: { id: positionId, companyId: ctx.companyId } })` → throws `POSITION_NOT_FOUND` on miss.
   - Persists `positionId` on the create / update.
4. Maps `POSITION_NOT_FOUND` to "Position introuvable."

**Spec traceability**: FR-008, FR-009.

---

## Repository changes (`src/lib/repositories/shift.ts`)

- `listShiftsForCompanyWeek(ctx, range)` and `listShiftsForUserWeek(ctx, userId, range)` extend their `select` clause to include `position: { select: { id: true, name: true, color: true } }`.
- `createShift(ctx, data)` and `updateShift(ctx, shiftId, data)` accept `positionId: string | null` and apply the validation + assignment as above.

---

## Position picker on existing forms

The `ShiftDialog` gets a position `<select>` with:
- First option `value=""` labelled "Aucune".
- One `<option>` per company position, labelled with the name (a small
  color swatch is rendered next to the label via a styled wrapper —
  not part of the option text per native-select limitations).

When the user picks "Aucune" the form submits `positionId=""`; the
Server Action coerces it to `null`.

---

## Negative space — what is NOT in Phase 5

- No bulk-edit of shifts to assign a position.
- No "default position for new shifts" preference.
- No per-employee position restrictions.
- No multi-tag (a shift with multiple positions).
- No published / draft state on positions.
- No reorder UI for the positions list.

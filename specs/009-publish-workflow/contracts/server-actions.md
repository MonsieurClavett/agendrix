# Server Action Contracts — 009-publish-workflow

Phase 1 of `/speckit-plan`. Defines the two new Server Actions plus
the changes to the existing shift action / repository.

All actions:

- Start with `await requireManagerContext()`.
- Validate inputs with Zod.
- Dispatch to a repository function.
- Return `{ success: true; count?: number } | { error: string }`.
- Call `revalidatePath("/schedules")` after success.

## Repository changes (`src/lib/repositories/shift.ts`)

### Extended `ShiftRow` type

```ts
type ShiftRow = {
  // …existing fields…
  status: "DRAFT" | "PUBLISHED";
};
```

### Updated `listShiftsForUserWeek(ctx, userId, range)`

Adds `status: "PUBLISHED"` to the `where` clause. EMPLOYEE callers
only ever see published shifts.

### Unchanged `listShiftsForCompanyWeek(ctx, range)`

Returns all statuses. The MANAGER read path is unchanged.

### Unchanged `createShift(ctx, data)`

The `status` defaults at the DB level. No code change needed.

### Unchanged `updateShift(ctx, shiftId, data)`

Does NOT touch `status`. A status change has its own dedicated path.

### New `countDraftsForCompanyWeek(ctx, range): Promise<number>`

`db.shift.count({ where: { companyId, status: "DRAFT", startsAt: { lt: end }, endsAt: { gt: start } } })`. Used to drive the disabled state of the publish button.

### New `publishDraftsForWeek(ctx, range): Promise<{ count: number }>`

```ts
const result = await db.shift.updateMany({
  where: {
    companyId: ctx.companyId,
    status: "DRAFT",
    startsAt: { lt: range.end },
    endsAt: { gt: range.start },
  },
  data: { status: "PUBLISHED" },
});
return { count: result.count };
```

### New `unpublishShift(ctx, shiftId)`

Transactional, mostly for the `NOT_FOUND` error surface:

```ts
const result = await db.shift.updateMany({
  where: { id: shiftId, companyId: ctx.companyId, status: "PUBLISHED" },
  data: { status: "DRAFT" },
});
if (result.count === 0) throw new Error("NOT_FOUND_OR_NOT_PUBLISHED");
```

## Server Action: `publishWeekAction`

**Path**: `src/actions/shifts/publishWeek.ts`

### Input (FormData)

| Field        | Type     | Constraints                       |
|--------------|----------|-----------------------------------|
| `weekStart`  | `string` | `YYYY-MM-DD` (any day of the week)|

The action derives the `WeekRange` via the existing
`parseWeekParam(weekStart, new Date())` helper.

### Output

`{ success: true; count: number } | { error: "INVALID_INPUT" }`

## Server Action: `unpublishShiftAction`

**Path**: `src/actions/shifts/unpublish.ts`

### Input (FormData)

| Field      | Type     | Constraints       |
|------------|----------|-------------------|
| `shiftId`  | `string` | `cuid()` shape    |

### Output

`{ success: true } | { error: "NOT_FOUND" | "INVALID_INPUT" }`

## Cross-action invariants

- Both new actions call `revalidatePath("/schedules")` on success.
- Neither action accepts a `companyId` from the form.
- Neither action provides a way to set `status` to an arbitrary value — only the transitions `DRAFT → PUBLISHED` (week-scoped) and `PUBLISHED → DRAFT` (single).

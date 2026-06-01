# Server Action Contracts — 010-open-shifts

Phase 1 of `/speckit-plan`. Defines the three new Server Actions, the
two extended Shift Server Actions, and the repository surface.

All actions:

- Start with `await requireTenantContext()` (or `requireManagerContext()` where stated).
- Validate inputs with Zod.
- Dispatch to a repository function.
- Return `{ success: true } | { error: string }` (consistent with other phases).
- Call `revalidatePath` for `/quarts-a-combler` and `/schedules` after success.

## Repository changes (`src/lib/repositories/shift.ts`)

### Extended `ShiftRow` type

```ts
type ShiftRow = {
  id: string;
  employeeId: string | null;          // ← was string
  employee: { id: string; name: string | null; isActive: boolean } | null; // ← was non-null
  // …
};
```

### Updated `createShift(ctx, data)`

`data.employeeId` becomes `string | null`. The transactional employee
existence check is skipped when null. Insert with `employeeId: null`.

### Updated `updateShift(ctx, shiftId, data)`

Same nullability. Allows transitioning a shift to/from open.

### Updated `listShiftsForCompanyWeek(ctx, range)` and `listShiftsForUserWeek`

Returns open shifts naturally. EMPLOYEE read still filters
`employeeId: ctx.userId AND status: "PUBLISHED"` — open shifts have
`employeeId === null`, so they DON'T appear in the EMPLOYEE schedule
view. They appear only on `/quarts-a-combler`.

### New `listOpenShiftsForCompanyWeek(ctx, range)`

Returns shifts with `employeeId: null AND status: "PUBLISHED"`, all
statuses for MANAGER read. Used by `/quarts-a-combler`.

```ts
const where = {
  companyId: ctx.companyId,
  employeeId: null,
  startsAt: { lt: range.end },
  endsAt: { gt: range.start },
  ...(ctx.role !== "MANAGER" ? { status: "PUBLISHED" } : {}),
};
```

## Repository functions (`src/lib/repositories/shiftClaim.ts`)

### `ClaimRow` type

```ts
type ClaimRow = {
  id: string;
  companyId: string;
  shiftId: string;
  employeeId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decidedAt: Date | null;
  decidedByUserId: string | null;
  employee: { id: string; name: string | null };
  decidedBy: { id: string; name: string | null } | null;
};
```

### `listClaimsForEmployee(ctx, targetEmployeeId, opts?)`

Returns the employee's own claims. EMPLOYEE callers MUST be the
target. Optional `opts.statusIn` filter.

### `listClaimsForShift(ctx, shiftId)`

MANAGER-only. Returns all claims for the shift. Used by the assign
dialog.

### `countPendingClaimsForCompany(ctx): Promise<number>`

MANAGER-only. Drives the filter-panel badge.

### `createClaim(ctx, shiftId)`

Transactional:
1. Verify the shift exists, belongs to `ctx.companyId`, `employeeId IS NULL`, `status = "PUBLISHED"` → throw `SHIFT_NOT_AVAILABLE` otherwise.
2. Check no existing claim of `(shiftId, ctx.userId)` → throw `DUPLICATE_CLAIM` otherwise (unique index also catches this race).
3. Insert with `companyId: ctx.companyId`, `employeeId: ctx.userId`, `status: "PENDING"`.

### `cancelClaim(ctx, claimId)`

Transactional:
1. Lookup with `(id, companyId)` → `NOT_FOUND`.
2. Auth: MANAGER OK; EMPLOYEE iff `existing.employeeId === ctx.userId` AND `existing.status === "PENDING"`.
3. Delete.

### `assignOpenShift(ctx, shiftId, chosenClaimId)`

MANAGER-only. Transactional:
1. Lookup shift with `(id, companyId)` → `NOT_FOUND`.
2. Verify `shift.employeeId IS NULL` → throw `NOT_OPEN` otherwise.
3. Lookup the chosen claim with `(id, shiftId, companyId, status: "PENDING")` → throw `CLAIM_NOT_FOUND` otherwise.
4. Overlap probe: any shift of the chosen employee that overlaps `[shift.startsAt, shift.endsAt)` → throw `ASSIGNEE_OVERLAP` otherwise.
5. Update `shift.employeeId = chosenClaim.employeeId`.
6. `updateMany` peer claims (`shiftId, id: { not: chosenClaimId }, status: "PENDING"`) to `REJECTED` with `decidedAt: now, decidedByUserId: ctx.userId`.
7. Update chosen claim → `APPROVED` with same metadata.

## Server Actions

### `createClaimAction`

**Path**: `src/actions/openShifts/createClaim.ts`

Input: `shiftId: string`.

Output: `{ success: true } | { error: "SHIFT_NOT_AVAILABLE" | "DUPLICATE_CLAIM" | "INVALID_INPUT" }`.

### `cancelClaimAction`

**Path**: `src/actions/openShifts/cancelClaim.ts`

Input: `claimId: string`.

Output: `{ success: true } | { error: "NOT_FOUND" | "FORBIDDEN" }`.

### `assignOpenShiftAction`

**Path**: `src/actions/openShifts/assignOpenShift.ts`

`requireManagerContext()`. Inputs: `shiftId: string`, `claimId: string`.

Output: `{ success: true } | { error: "NOT_FOUND" | "NOT_OPEN" | "CLAIM_NOT_FOUND" | "ASSIGNEE_OVERLAP" | "INVALID_INPUT" }`.

## Existing Shift Actions (extensions)

### `createShiftAction`

`employeeId` becomes optional in the Zod input (empty string ↔ null).
Treat empty string as `null` before passing to the repository.

### `updateShiftAction`

Same change.

## Page-level data fetch

### `/quarts-a-combler/page.tsx`

```ts
const ctx = await requireTenantContext();
const today = new Date();
const range = parseWeekParam(params.week, today);
const [openShifts, myClaims] = await Promise.all([
  listOpenShiftsForCompanyWeek(ctx, range),
  listClaimsForEmployee(ctx, ctx.userId),
]);
// build a Map<shiftId, ClaimRow> for the current user; pass both down
```

### `/schedules/page.tsx` (delta)

```ts
// MANAGER branch additionally:
const claimsByShift = isManager
  ? groupBy(await listClaimsForCompanyOpenShifts(ctx, range), "shiftId")
  : new Map();
const pendingClaimsCount = isManager
  ? await countPendingClaimsForCompany(ctx)
  : 0;
```

(or run a single batch via `listClaimsForShift` per open shift if the
list is short — current scale supports either).

## Cross-action invariants

- Every action calls `revalidatePath("/quarts-a-combler")` and `revalidatePath("/schedules")` on success.
- No action calls `db.shiftClaim.*` or `db.shift.*` directly.
- No action accepts a `companyId` from the form.
- `assignOpenShiftAction` is the ONLY path that changes `shift.employeeId` from null to non-null at the same time as touching claims — it's the only atomic site.

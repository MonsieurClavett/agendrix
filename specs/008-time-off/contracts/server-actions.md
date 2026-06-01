# Server Action Contracts — 008-time-off

Phase 1 of `/speckit-plan`. Defines the three Server Actions plus
the repository surface they sit on top of.

All actions:

- Start with `await requireTenantContext()`.
- Validate inputs with Zod; reject malformed input with a typed
  error result, not a 500.
- Dispatch to a repository function — no `db.timeOffRequest.*` from
  inside the action.
- Return `{ success: true } | { error: string }` (Phase 2–6 shape,
  fed into `useActionState`).
- Call `revalidatePath` for `/conges` and `/schedules` after
  success.

## Repository functions (`src/lib/repositories/timeOff.ts`)

### `TimeOffRequestRow` type

```ts
type TimeOffRequestRow = {
  id: string;
  companyId: string;
  employeeId: string;
  employee: { id: string; name: string | null };
  startDate: Date;
  endDate: Date;
  type: TimeOffType;
  reason: string | null;
  status: TimeOffStatus;
  decidedAt: Date | null;
  decidedByUserId: string | null;
  decidedBy: { id: string; name: string | null } | null;
};
```

### `listTimeOffForEmployee(ctx, targetEmployeeId)`

Returns all requests of `targetEmployeeId` ordered by `startDate`
descending. Enforces tenant + actor (EMPLOYEE only on self).
Throws `EMPLOYEE_NOT_FOUND` for cross-tenant ids, `FORBIDDEN`
otherwise.

### `listTimeOffForCompany(ctx, { statusIn })`

MANAGER-only. Returns every request of the company whose `status`
is in the given array, ordered by `startDate` descending. Used for
both MANAGER tabs:
- `{ statusIn: ["PENDING"] }` → "À approuver"
- `{ statusIn: ["APPROVED", "REJECTED"] }` → "Historique"

Throws `FORBIDDEN` for non-MANAGER actors.

### `listTimeOffOverlappingWeek(ctx, range)`

Returns every request of the company whose `[startDate, endDate]`
intersects the given week range AND whose `status` is `PENDING` or
`APPROVED`. Drives the calendar overlay. MANAGER reads all; EMPLOYEE
reads only their own subset (enforced server-side by adding
`employeeId: ctx.userId` to the where clause when
`ctx.role !== "MANAGER"`).

### `createTimeOff(ctx, targetEmployeeId, data)`

`data: { startDate: Date; endDate: Date; type: TimeOffType; reason: string | null }`.
Transactional:
1. Employee lookup by `(id, companyId)` → `EMPLOYEE_NOT_FOUND`.
2. Actor check: `targetEmployeeId === ctx.userId || ctx.role === "MANAGER"` → `FORBIDDEN`.
3. Validate `endDate >= startDate` → `INVALID_INPUT`.
4. Overlap probe: any row of `targetEmployeeId` with `status IN (PENDING, APPROVED)` and `startDate <= data.endDate AND endDate >= data.startDate` → `OVERLAP`.
5. Insert with `companyId: ctx.companyId`, `employeeId: targetEmployeeId`, `status: "PENDING"`.

### `decideTimeOff(ctx, requestId, decision)`

`decision: "APPROVED" | "REJECTED"`. MANAGER-only. Transactional:
1. Row lookup by `(id, companyId)` → `NOT_FOUND`.
2. `ctx.role === "MANAGER"` → `FORBIDDEN`.
3. Current status MUST be `"PENDING"` → `ALREADY_DECIDED` if not.
4. If `decision === "APPROVED"`: re-run the overlap probe (between this row and OTHER PENDING/APPROVED of the same employee — exclude self via `id: { not: requestId }`). If conflict → `OVERLAP` (rare: e.g., the MANAGER approved a different request in parallel that now overlaps).
5. Update: `status: decision`, `decidedAt: new Date()`, `decidedByUserId: ctx.userId`.

### `deleteTimeOff(ctx, requestId)`

Transactional:
1. Row lookup by `(id, companyId)` → `NOT_FOUND`.
2. Authorization:
   - MANAGER: always allowed.
   - EMPLOYEE: allowed iff `existing.employeeId === ctx.userId` AND `existing.status === "PENDING"`.
   - Otherwise: `FORBIDDEN`.
3. Delete.

## Server Action: `createTimeOffAction`

**Path**: `src/actions/timeOff/create.ts`

### Input (FormData)

| Field              | Type     | Constraints                                       |
|--------------------|----------|---------------------------------------------------|
| `targetEmployeeId` | `string` | `cuid()` shape, non-empty                         |
| `startDate`        | `string` | `YYYY-MM-DD`                                      |
| `endDate`          | `string` | `YYYY-MM-DD`, must parse and be >= `startDate`    |
| `type`             | `string` | one of `PAID`, `UNPAID`, `SICK`                   |
| `reason`           | `string` | optional, ≤ 280 chars                             |

### Output

`{ success: true } | { error: "OVERLAP" | "EMPLOYEE_NOT_FOUND" | "FORBIDDEN" | "INVALID_INPUT" }`

### Error mapping

| Repository throw     | Action `error` value     | User-facing French message                                              |
|----------------------|--------------------------|-------------------------------------------------------------------------|
| `OVERLAP`            | `"OVERLAP"`              | « Cette demande chevauche une autre demande en attente ou approuvée. » |
| `EMPLOYEE_NOT_FOUND` | `"EMPLOYEE_NOT_FOUND"`   | « Employé introuvable. »                                               |
| `FORBIDDEN`          | `"FORBIDDEN"`            | « Vous n'avez pas le droit de créer cette demande. »                  |
| Zod failure          | `"INVALID_INPUT"`        | « Veuillez vérifier les dates et le type. »                            |

## Server Action: `decideTimeOffAction`

**Path**: `src/actions/timeOff/decide.ts`

### Input (FormData)

| Field        | Type     | Constraints                          |
|--------------|----------|--------------------------------------|
| `requestId`  | `string` | `cuid()` shape                       |
| `decision`   | `string` | one of `APPROVED`, `REJECTED`        |

### Output

`{ success: true } | { error: "NOT_FOUND" | "FORBIDDEN" | "ALREADY_DECIDED" | "OVERLAP" | "INVALID_INPUT" }`

## Server Action: `deleteTimeOffAction`

**Path**: `src/actions/timeOff/delete.ts`

### Input (FormData)

| Field        | Type     | Constraints       |
|--------------|----------|-------------------|
| `requestId`  | `string` | `cuid()` shape    |

### Output

`{ success: true } | { error: "NOT_FOUND" | "FORBIDDEN" }`

## Page-level data fetch

### `/conges/page.tsx`

```ts
const ctx = await requireTenantContext();
if (ctx.role === "MANAGER") {
  const [pending, decided] = await Promise.all([
    listTimeOffForCompany(ctx, { statusIn: ["PENDING"] }),
    listTimeOffForCompany(ctx, { statusIn: ["APPROVED", "REJECTED"] }),
  ]);
  // render <TimeOffPageClient role="MANAGER" pending={pending} decided={decided} />
} else {
  const mine = await listTimeOffForEmployee(ctx, ctx.userId);
  // render <TimeOffPageClient role="EMPLOYEE" mine={mine} />
}
```

### `/schedules/page.tsx` (delta)

```ts
// existing fetches…
const timeOffRows = await listTimeOffOverlappingWeek(ctx, range);
const timeOffByEmployee = buildTimeOffMaps(timeOffRows, range);
// pass timeOffByEmployee to ScheduleView
```

## Cross-action invariants

- Every action calls `revalidatePath("/conges")` and `revalidatePath("/schedules")` on success.
- No action calls `db.timeOffRequest.*` directly.
- No action accepts a `companyId` from the form — it always comes from `ctx`.
- No action accepts an `employeeId` query parameter that bypasses the company check.
- `decideTimeOffAction` never sets `decidedByUserId` from anything other than `ctx.userId`.

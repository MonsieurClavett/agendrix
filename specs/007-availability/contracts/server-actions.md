# Server Action Contracts — 007-availability

Phase 1 of `/speckit-plan`. Defines the three Server Actions added by
this feature, plus the read-only repository surface they sit on top
of.

All actions:

- Start with `await requireTenantContext()` to obtain `{ userId, companyId, role }`.
- Validate inputs with Zod; reject malformed input with a typed error result, not a 500.
- Dispatch to a repository function — no `db.availability.*` from inside the action.
- Return `{ success: true } | { error: string }` shaped object (same shape as Phase 2–5 actions, fed into `useActionState`).
- Call `revalidatePath` for `/disponibilites`, `/team`, and `/schedules` after success.

The repository surface enforces the authorization-and-tenant invariants
described in `data-model.md`.

## Repository functions (`src/lib/repositories/availability.ts`)

### `listAvailabilitiesForEmployee(ctx, targetEmployeeId)`

Returns the ranges of `targetEmployeeId`, ordered by `dayOfWeek`,
`startMinute`. Throws `EMPLOYEE_NOT_FOUND` for cross-tenant ids and
`FORBIDDEN` when an EMPLOYEE asks for someone else's ranges.

### `listAvailabilitiesForCompany(ctx)`

Returns every range of the company. MANAGER-only (throws `FORBIDDEN`
otherwise). Used by the schedules page to build the per-employee map.

### `createAvailability(ctx, targetEmployeeId, data)`

`data: { dayOfWeek: number; startMinute: number; endMinute: number }`.
Inside a single `$transaction`:
1. Verifies `target.companyId === ctx.companyId`. Throws `EMPLOYEE_NOT_FOUND` otherwise.
2. Verifies `targetEmployeeId === ctx.userId` OR `ctx.role === "MANAGER"`. Throws `FORBIDDEN` otherwise.
3. Verifies no overlap with any existing range of the same employee on the same `dayOfWeek`. Throws `OVERLAP` otherwise.
4. Inserts the row with `companyId = ctx.companyId`, `employeeId = targetEmployeeId`.

### `updateAvailability(ctx, availabilityId, data)`

`data` same as above. Inside `$transaction`:
1. Fetches the existing row with `where: { id: availabilityId, companyId: ctx.companyId }`. Throws `NOT_FOUND` if missing.
2. Verifies `existing.employeeId === ctx.userId` OR `ctx.role === "MANAGER"`. Throws `FORBIDDEN` otherwise.
3. Overlap check excludes the row being updated itself (`id: { not: availabilityId }`). Throws `OVERLAP` otherwise.
4. Updates the row.

### `deleteAvailability(ctx, availabilityId)`

Inside `$transaction`:
1. Fetches with `where: { id, companyId }`. Throws `NOT_FOUND` if missing.
2. Verifies `existing.employeeId === ctx.userId` OR `ctx.role === "MANAGER"`. Throws `FORBIDDEN` otherwise.
3. Deletes the row.

## Server Action: `createAvailabilityAction`

**Path**: `src/actions/availability/create.ts`

### Input (FormData)

| Field            | Type        | Constraints                                       |
|------------------|-------------|---------------------------------------------------|
| `targetEmployeeId` | `string`  | `cuid()` shape, non-empty                         |
| `dayOfWeek`      | `string`    | parses to int 0–6                                 |
| `startTime`      | `string`    | `HH:MM` 24h, 00:00–23:59                          |
| `endTime`        | `string`    | `HH:MM` 24h, 00:01–24:00 (24:00 stored as 1440)   |

The action parses `startTime` / `endTime` to minutes via the existing
`parseHHMMToMinutes` helper in `src/lib/availability.ts`, then asserts
`endMinute > startMinute` via Zod refinement.

### Output

`{ success: true } | { error: "OVERLAP" | "EMPLOYEE_NOT_FOUND" | "FORBIDDEN" | "INVALID_INPUT" }`

### Error mapping

| Repository throw   | Action `error` value     | User-facing French message                                 |
|--------------------|--------------------------|------------------------------------------------------------|
| `OVERLAP`          | `"OVERLAP"`              | « Cette plage chevauche une plage existante de ce jour. » |
| `EMPLOYEE_NOT_FOUND` | `"EMPLOYEE_NOT_FOUND"` | « Employé introuvable. »                                   |
| `FORBIDDEN`        | `"FORBIDDEN"`            | « Vous n'avez pas le droit de modifier ces disponibilités. » |
| Zod failure        | `"INVALID_INPUT"`        | « Veuillez vérifier les heures (format HH:MM, fin > début). » |

## Server Action: `updateAvailabilityAction`

**Path**: `src/actions/availability/update.ts`

### Input (FormData)

| Field              | Type     | Constraints                          |
|--------------------|----------|--------------------------------------|
| `availabilityId`   | `string` | `cuid()` shape                       |
| `dayOfWeek`        | `string` | parses to int 0–6                    |
| `startTime`        | `string` | `HH:MM`                              |
| `endTime`          | `string` | `HH:MM`, > start                     |

### Output

`{ success: true } | { error: "NOT_FOUND" | "OVERLAP" | "FORBIDDEN" | "INVALID_INPUT" }`

## Server Action: `deleteAvailabilityAction`

**Path**: `src/actions/availability/delete.ts`

### Input (FormData)

| Field            | Type     | Constraints       |
|------------------|----------|-------------------|
| `availabilityId` | `string` | `cuid()` shape    |

### Output

`{ success: true } | { error: "NOT_FOUND" | "FORBIDDEN" }`

## Page-level data fetch

### `/disponibilites/page.tsx`

```ts
const ctx = await requireTenantContext();
const ranges = await listAvailabilitiesForEmployee(ctx, ctx.userId);
// render AvailabilityWeekView with canEdit=true, targetEmployeeId=ctx.userId
```

### `/team/_components/EmployeeAvailabilityDialog.tsx` mount

```ts
const ctx = await requireTenantContext();      // already in scope on the page
const ranges = await listAvailabilitiesForEmployee(ctx, targetEmployeeId);
// render AvailabilityWeekView with canEdit=(ctx.role === "MANAGER"), targetEmployeeId
```

### `/schedules/page.tsx` (delta)

```ts
const ctx = await requireTenantContext();
// existing fetches: shifts, employees, positions…
const allRanges = isManager(ctx)
  ? await listAvailabilitiesForCompany(ctx)
  : await listAvailabilitiesForEmployee(ctx, ctx.userId);
const availabilitiesByEmployee = groupBy(allRanges, "employeeId");
// pass availabilitiesByEmployee down to ScheduleView
```

EMPLOYEE only ever sees their own ranges, so the per-employee map for
that role contains exactly one entry (their own). The warning on shifts
of other employees does not fire for them — which is correct: they
should not be making decisions based on others' availability.

## Cross-action invariants

- Every action calls `revalidatePath("/disponibilites")`, `revalidatePath("/team")`, `revalidatePath("/schedules")` on success.
- No action calls `db.availability.*` directly.
- No action accepts a `companyId` from the form — it always comes from `ctx`.
- No action accepts an `employeeId` query parameter that bypasses the company check (only `targetEmployeeId` validated inside the repository).

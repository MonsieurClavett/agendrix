# Server Action Contracts (Phase 2)

**Feature**: Weekly Schedules
**Date**: 2026-05-28

All Server Actions under `src/actions/shifts/` start with
`await requireManagerContext()`. All mutations route through repository
functions in `src/lib/repositories/shift.ts` which inject
`where: { companyId: ctx.companyId }` and run overlap detection inside
a `db.$transaction`.

---

## `createShiftAction`

**File**: `src/actions/shifts/create.ts`

**Signature**:
```typescript
async function createShiftAction(
  prev: CreateState,
  formData: FormData,
): Promise<CreateState>
```

**Input (FormData fields)**:
| Field        | Type   | Validation                                                                |
|--------------|--------|---------------------------------------------------------------------------|
| `employeeId` | string | non-empty                                                                 |
| `date`       | string | ISO date `YYYY-MM-DD`                                                     |
| `start`      | string | `HH:mm`                                                                   |
| `end`        | string | `HH:mm`, MUST NOT equal `start`                                           |
| `note`       | string | optional; trimmed; length ≤ 280                                           |

**Effect**:
1. `await requireManagerContext()`.
2. Zod parse; on failure → `{ fieldErrors }`.
3. Combine `date` + `start` → `startsAt` (local-time interpretation). Combine `date` + `end` → `endsAt`. If `endsAt ≤ startsAt`, add 24 hours to `endsAt` (midnight-crossing shift).
4. `await createShift(ctx, { employeeId, startsAt, endsAt, note })` — the repository function:
   - Verifies `employeeId` belongs to `ctx.companyId`; otherwise throws `EMPLOYEE_NOT_FOUND`.
   - Runs overlap check in transaction; throws `OVERLAP` if any conflict for the same employee.
   - Inserts with `companyId = ctx.companyId`.
5. Map thrown errors → user-facing messages.
6. `revalidatePath("/schedules")`. Return `{ success: true }`.

**Return type**:
```typescript
type CreateState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: true;
};
```

**Spec traceability**: FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-015.

---

## `updateShiftAction`

**File**: `src/actions/shifts/update.ts`

**Signature**:
```typescript
async function updateShiftAction(
  prev: UpdateState,
  formData: FormData,
): Promise<UpdateState>
```

**Input (FormData fields)**:
| Field        | Type   | Validation                                              |
|--------------|--------|---------------------------------------------------------|
| `shiftId`    | string | non-empty                                               |
| `employeeId` | string | non-empty                                               |
| `date`       | string | ISO date                                                |
| `start`      | string | `HH:mm`                                                 |
| `end`        | string | `HH:mm`, MUST NOT equal `start`                         |
| `note`       | string | optional; ≤ 280                                         |

**Effect**:
1. `await requireManagerContext()`.
2. Zod parse.
3. Compute `startsAt` / `endsAt` (same midnight-crossing rule as create).
4. `await updateShift(ctx, shiftId, { employeeId, startsAt, endsAt, note })` — repository function verifies `shiftId` belongs to `ctx.companyId` (throws `NOT_FOUND` if not), verifies `employeeId` belongs to `ctx.companyId`, runs overlap check inside transaction (excluding the shift being updated), then performs the update.
5. Map errors.
6. `revalidatePath("/schedules")`. Return `{ success: true }`.

**Spec traceability**: FR-002, FR-008, FR-015.

---

## `deleteShiftAction`

**File**: `src/actions/shifts/delete.ts`

**Signature**:
```typescript
async function deleteShiftAction(
  prev: DeleteState,
  formData: FormData,
): Promise<DeleteState>
```

**Input (FormData fields)**:
| Field     | Type   | Validation |
|-----------|--------|------------|
| `shiftId` | string | non-empty  |

**Effect**:
1. `await requireManagerContext()`.
2. Zod parse.
3. `await deleteShift(ctx, shiftId)` — repo function scoped by `id AND companyId`; if `Prisma` returns 0 affected rows → throw `NOT_FOUND`.
4. Map errors.
5. `revalidatePath("/schedules")`. Return `{ success: true }`.

**Spec traceability**: FR-002, FR-009, FR-015.

---

## Repository functions (`src/lib/repositories/shift.ts`)

All accept a `TenantContext`. Read functions ALSO accept a `WeekRange`.

### `listShiftsForCompanyWeek(ctx, range)`

```typescript
return db.shift.findMany({
  where: {
    companyId: ctx.companyId,
    startsAt: { lt: range.end },
    endsAt: { gt: range.start },
  },
  select: { id, employeeId, startsAt, endsAt, note,
            employee: { select: { id, name, isActive } } },
  orderBy: [{ startsAt: "asc" }, { employee: { name: "asc" } }],
});
```

Note `select` includes `employee.isActive` so the UI can render a badge
next to deactivated assignees (FR-014).

### `listShiftsForUserWeek(ctx, userId, range)`

Same as above but with `employeeId: userId` added to the `where` clause.
A defensive `userId === ctx.userId` check sits at the Server Component
level for the EMPLOYEE case (the only consumer in Phase 2).

### `createShift(ctx, { employeeId, startsAt, endsAt, note })`

```typescript
return db.$transaction(async (tx) => {
  const employee = await tx.user.findFirst({
    where: { id: employeeId, companyId: ctx.companyId },
    select: { id: true },
  });
  if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");

  const overlap = await tx.shift.findFirst({
    where: {
      employeeId,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  });
  if (overlap) throw new Error("OVERLAP");

  return tx.shift.create({
    data: { companyId: ctx.companyId, employeeId, startsAt, endsAt, note },
  });
});
```

### `updateShift(ctx, shiftId, data)`

Same shape, plus a pre-existing-shift lookup scoped by `id AND companyId`
(throws `NOT_FOUND`), plus the overlap check excludes the shift being
updated (`id: { not: shiftId }`).

### `deleteShift(ctx, shiftId)`

```typescript
const result = await db.shift.deleteMany({
  where: { id: shiftId, companyId: ctx.companyId },
});
if (result.count === 0) throw new Error("NOT_FOUND");
```

`deleteMany` (not `delete`) so we can scope by `companyId` in the WHERE
clause and get a count back.

---

## Error → message mapping (used by all three actions)

| Thrown code             | User-facing message                                                                       |
|-------------------------|-------------------------------------------------------------------------------------------|
| `EMPLOYEE_NOT_FOUND`    | "Employé introuvable."                                                                    |
| `OVERLAP`               | "Un autre shift de cet employé chevauche déjà cette plage horaire."                       |
| `NOT_FOUND`             | "Shift introuvable."                                                                      |

Any other thrown error is re-raised (will surface as a 500 in dev).

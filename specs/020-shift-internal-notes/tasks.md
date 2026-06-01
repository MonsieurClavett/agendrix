# Tasks: Notes internes sur shift

**Feature**: 020-shift-internal-notes

## Phase 1 — Schema

- [ ] T001 Ajouter `internalNote String?` au modèle `Shift` dans [prisma/schema.prisma](prisma/schema.prisma).
- [ ] T002 `npx prisma migrate dev --name add_shift_internal_note`.

## Phase 2 — Repository

- [ ] T003 Modifier `shiftSelect` (MANAGER) dans [src/lib/repositories/shift.ts](src/lib/repositories/shift.ts) pour inclure `internalNote`.
- [ ] T004 Modifier `ShiftRow` type pour ajouter `internalNote: string | null`.
- [ ] T005 Modifier `createShift` et `updateShift` pour accepter `internalNote`.
- [ ] T006 Vérifier que `listShiftsForUserWeek` n'inclut PAS `internalNote`.

## Phase 3 — Server Actions

- [ ] T007 Modifier [src/actions/shifts/create.ts](src/actions/shifts/create.ts) — Zod + passthrough.
- [ ] T008 Modifier [src/actions/shifts/update.ts](src/actions/shifts/update.ts) — Zod + passthrough.

## Phase 4 — UI

- [ ] T009 Ajouter `internalNote: string | null` au type `WeekShift` ([src/app/(dashboard)/schedules/_components/types.ts](src/app/(dashboard)/schedules/_components/types.ts)).
- [ ] T010 Modifier [ShiftDialog.tsx](src/app/(dashboard)/schedules/_components/ShiftDialog.tsx) : ajouter un textarea « Note interne » dans le form.
- [ ] T011 Modifier [ShiftBlock.tsx](src/app/(dashboard)/schedules/_components/ShiftBlock.tsx) : afficher un icône `StickyNote` si `shift.internalNote` non-null.

## Phase 5 — Polish

- [ ] T012 CLAUDE.md pointeur → 020.
- [ ] T013 `npx tsc --noEmit` + `npm run build`.

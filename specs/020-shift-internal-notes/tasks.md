# Tasks: Notes internes sur shift

**Feature**: 020-shift-internal-notes

## Phase 1 — Schema

- [X] T001 Ajouter `internalNote String?` au modèle `Shift` dans [prisma/schema.prisma](prisma/schema.prisma).
- [X] T002 `npx prisma migrate dev --name add_shift_internal_note`.

## Phase 2 — Repository

- [X] T003 Modifier `shiftSelect` (MANAGER) dans [src/lib/repositories/shift.ts](src/lib/repositories/shift.ts) pour inclure `internalNote`.
- [X] T004 Modifier `ShiftRow` type pour ajouter `internalNote: string | null`.
- [X] T005 Modifier `createShift` et `updateShift` pour accepter `internalNote`.
- [X] T006 Vérifier que `listShiftsForUserWeek` n'inclut PAS `internalNote`.

## Phase 3 — Server Actions

- [X] T007 Modifier [src/actions/shifts/create.ts](src/actions/shifts/create.ts) — Zod + passthrough.
- [X] T008 Modifier [src/actions/shifts/update.ts](src/actions/shifts/update.ts) — Zod + passthrough.

## Phase 4 — UI

- [X] T009 Ajouter `internalNote: string | null` au type `WeekShift` ([src/app/(dashboard)/schedules/_components/types.ts](src/app/(dashboard)/schedules/_components/types.ts)).
- [X] T010 Modifier [ShiftDialog.tsx](src/app/(dashboard)/schedules/_components/ShiftDialog.tsx) : ajouter un textarea « Note interne » dans le form.
- [X] T011 Modifier [ShiftBlock.tsx](src/app/(dashboard)/schedules/_components/ShiftBlock.tsx) : afficher un icône `StickyNote` si `shift.internalNote` non-null.

## Phase 5 — Polish

- [X] T012 CLAUDE.md pointeur → 020.
- [X] T013 `npx tsc --noEmit` + `npm run build`.

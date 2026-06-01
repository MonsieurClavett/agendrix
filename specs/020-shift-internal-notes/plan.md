# Implementation Plan: Notes internes sur shift

**Feature**: 020-shift-internal-notes

## Architecture

### Migration

Ajouter colonne `internalNote: String?` au modèle `Shift`. Pas de back-fill nécessaire (toutes les valeurs existantes seront `null`).

### Repository

- `listShiftsForCompanyWeek` (MANAGER) : `select` étendu pour inclure `internalNote`.
- `listShiftsForUserWeek` (EMPLOYEE) : INCHANGÉ — n'inclut PAS `internalNote`.
- `createShift` et `updateShift` : accepter `internalNote` dans l'input.
- Le type `ShiftRow` (MANAGER) inclut `internalNote: string | null`.

### Server Actions

- `createShiftAction` et `updateShiftAction` : ajouter `internalNote` au Zod schema (optional max 500). Déjà MANAGER-only.

### UI

- `ShiftDialog` : ajouter un `<textarea>` « Note interne » entre note et position, visible uniquement quand `canMutate` (le dialog est déjà MANAGER-only de facto).
- `ShiftBlock` : nouvelle prop `internalNote?: string | null`, si présente et non-null, affiche un petit icône `StickyNote` à droite (à côté du badge AlertTriangle) avec `title` natif pour le tooltip.
- Le type `WeekShift` (côté UI) gagne `internalNote: string | null` — mais le repo EMPLOYEE met toujours `null`.

## Risks

- **R1 : Fuite côté EMPLOYEE** — mitigation : le `select` Prisma de `listShiftsForUserWeek` ne demande pas la colonne. Le champ n'arrive jamais au client EMPLOYEE.

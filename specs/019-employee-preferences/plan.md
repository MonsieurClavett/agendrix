# Implementation Plan: Préférences employé

**Feature**: 019-employee-preferences

## Architecture

### Entité

`EmployeePreference` : `id`, `companyId`, `employeeId` (unique), `minHoursPerWeek` (Int?), `maxHoursPerWeek` (Int?), `preferredDays` (Int[] Postgres), `notes` (String?), `createdAt`, `updatedAt`.

### Repository (`src/lib/repositories/employeePreference.ts`)

- `getOwnPreferences(ctx)` — retourne préférences de `ctx.userId`.
- `getPreferencesForEmployee(ctx, employeeId)` — MANAGER ou self ; vérifie que `employeeId` appartient à la company.
- `upsertOwnPreferences(ctx, input)` — toujours upsert sur `employeeId = ctx.userId`.

### Server Action (`src/actions/preferences/save.ts`)

Une seule action `savePreferencesAction` — l'utilisateur ne peut modifier que ses propres préférences (`requireTenantContext`, pas requireManager).

### UI

- **`/preferences` page** (EMPLOYEE et MANAGER) : formulaire complet. Le MANAGER ne voit QUE ses propres préférences sur cette page (pour gérer celles des autres → popover sur `/team`).
- **`/team` page** : ajouter un bouton « Préférences » à côté de chaque ligne employé, ouvre un `PreferencesPopover` en lecture.

## Schema choices

- Postgres `Int[]` natif — Prisma support direct.
- Unique constraint sur `employeeId` pour garantir 1 ligne par employé.

## Risks

- **R1 : Validation min ≤ max** : zod refine.
- **R2 : `preferredDays` doublons** : `Array.from(new Set(...))` côté action.

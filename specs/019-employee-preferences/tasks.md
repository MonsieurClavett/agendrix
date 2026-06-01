# Tasks: Préférences employé

**Feature**: 019-employee-preferences

## Phase 1 — Schema

- [X] T001 Ajouter `model EmployeePreference` à [prisma/schema.prisma](prisma/schema.prisma) + back-relations.
- [X] T002 `npx prisma migrate dev --name add_employee_preferences`.

## Phase 2 — Repository

- [X] T003 Créer [src/lib/repositories/employeePreference.ts](src/lib/repositories/employeePreference.ts) avec `getOwn`, `getForEmployee`, `upsertOwn`, types.
- [X] T004 Pour MANAGER : `listAllForCompany(ctx)` (optionnel, mais utile pour `/team`).

## Phase 3 — Server Actions

- [X] T005 Créer [src/actions/preferences/save.ts](src/actions/preferences/save.ts).

## Phase 4 — UI

- [X] T006 Créer [src/app/(dashboard)/preferences/page.tsx](src/app/(dashboard)/preferences/page.tsx).
- [X] T007 Créer [src/app/(dashboard)/preferences/_components/PreferencesForm.tsx](src/app/(dashboard)/preferences/_components/PreferencesForm.tsx).
- [X] T008 Créer [src/app/(dashboard)/team/_components/PreferencesPopover.tsx](src/app/(dashboard)/team/_components/PreferencesPopover.tsx).
- [X] T009 Modifier [src/app/(dashboard)/team/page.tsx](src/app/(dashboard)/team/page.tsx) + composants pour intégrer le popover sur chaque ligne.

## Phase 5 — Integration

- [X] T010 Modifier [src/proxy.ts](src/proxy.ts) : `/preferences` protégé.
- [X] T011 Modifier [src/components/shell/SidebarNav.tsx](src/components/shell/SidebarNav.tsx) : ajouter « Préférences » (icône Settings/SlidersHorizontal).

## Phase 6 — Polish

- [X] T012 CLAUDE.md pointeur → 019.
- [X] T013 `npx tsc --noEmit` + `npm run build`.

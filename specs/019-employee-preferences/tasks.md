# Tasks: Préférences employé

**Feature**: 019-employee-preferences

## Phase 1 — Schema

- [ ] T001 Ajouter `model EmployeePreference` à [prisma/schema.prisma](prisma/schema.prisma) + back-relations.
- [ ] T002 `npx prisma migrate dev --name add_employee_preferences`.

## Phase 2 — Repository

- [ ] T003 Créer [src/lib/repositories/employeePreference.ts](src/lib/repositories/employeePreference.ts) avec `getOwn`, `getForEmployee`, `upsertOwn`, types.
- [ ] T004 Pour MANAGER : `listAllForCompany(ctx)` (optionnel, mais utile pour `/team`).

## Phase 3 — Server Actions

- [ ] T005 Créer [src/actions/preferences/save.ts](src/actions/preferences/save.ts).

## Phase 4 — UI

- [ ] T006 Créer [src/app/(dashboard)/preferences/page.tsx](src/app/(dashboard)/preferences/page.tsx).
- [ ] T007 Créer [src/app/(dashboard)/preferences/_components/PreferencesForm.tsx](src/app/(dashboard)/preferences/_components/PreferencesForm.tsx).
- [ ] T008 Créer [src/app/(dashboard)/team/_components/PreferencesPopover.tsx](src/app/(dashboard)/team/_components/PreferencesPopover.tsx).
- [ ] T009 Modifier [src/app/(dashboard)/team/page.tsx](src/app/(dashboard)/team/page.tsx) + composants pour intégrer le popover sur chaque ligne.

## Phase 5 — Integration

- [ ] T010 Modifier [src/proxy.ts](src/proxy.ts) : `/preferences` protégé.
- [ ] T011 Modifier [src/components/shell/SidebarNav.tsx](src/components/shell/SidebarNav.tsx) : ajouter « Préférences » (icône Settings/SlidersHorizontal).

## Phase 6 — Polish

- [ ] T012 CLAUDE.md pointeur → 019.
- [ ] T013 `npx tsc --noEmit` + `npm run build`.

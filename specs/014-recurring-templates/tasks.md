# Tasks: Modèles d'horaire récurrents

**Feature**: 014-recurring-templates
**Plan**: [plan.md](./plan.md)

## Phase 1 — Setup & Schema

- [X] T001 Ajouter `model ScheduleTemplate` et `model ScheduleTemplateShift` à [prisma/schema.prisma](prisma/schema.prisma), avec back-relations sur Company, User (`templatesCreated`), Position et User (`templateShifts`).
- [X] T002 Générer la migration `add_schedule_templates` via `npx prisma migrate dev --name add_schedule_templates`.
- [X] T003 Lancer `npx prisma generate` et vérifier que les types sont disponibles.

## Phase 2 — Foundational (repository)

- [X] T004 Créer [src/lib/repositories/scheduleTemplate.ts](src/lib/repositories/scheduleTemplate.ts) avec les types `TemplateRow`, `TemplateDetail`, et l'export `templateSelect`.
- [X] T005 [US1] Implémenter `createTemplateFromWeek(ctx, { name, weekStart })` transactionnel : count shifts, throw `EMPTY_WEEK` si 0, throw `NAME_TAKEN` sur P2002, dump tous les `ScheduleTemplateShift` (dayOfWeek 1–7 ISO, startHour/endHour en minutes locales, endDayOffset).
- [X] T006 [US2] Implémenter `applyTemplate(ctx, { templateId, weekStart })` transactionnel : load template (404 si autre company), construit `startsAt`/`endsAt`, fallback null pour employeeId/positionId disparus, `createMany` les Shifts DRAFT.
- [X] T007 [US3] Implémenter `listTemplates(ctx)` (avec count `_count.shifts`) et `renameTemplate`, `deleteTemplate`.

## Phase 3 — User Story 1 (Save template) (P1)

- [X] T008 [P] [US1] Créer [src/actions/scheduleTemplates/save.ts](src/actions/scheduleTemplates/save.ts) avec `saveAsTemplateAction(state, fd)` (Zod: `name`, `weekStart`).
- [X] T009 [US1] Créer [src/app/(dashboard)/schedules/_components/SaveTemplateDialog.tsx](src/app/(dashboard)/schedules/_components/SaveTemplateDialog.tsx) (input nom + submit).
- [X] T010 [US1] Modifier [src/app/(dashboard)/schedules/_components/ScheduleToolbar.tsx](src/app/(dashboard)/schedules/_components/ScheduleToolbar.tsx) : ajouter bouton « Sauvegarder comme modèle » MANAGER-only qui ouvre `SaveTemplateDialog`.

## Phase 4 — User Story 2 (Apply template) (P1)

- [X] T011 [P] [US2] Créer [src/actions/scheduleTemplates/apply.ts](src/actions/scheduleTemplates/apply.ts) avec `applyTemplateAction(state, fd)` (Zod: `templateId`, `weekStart`).
- [X] T012 [US2] Créer [src/app/(dashboard)/schedules/_components/ApplyTemplateDialog.tsx](src/app/(dashboard)/schedules/_components/ApplyTemplateDialog.tsx) (props `templates` chargés depuis le serveur via la page).
- [X] T013 [US2] Modifier [src/app/(dashboard)/schedules/page.tsx](src/app/(dashboard)/schedules/page.tsx) : ajouter `listTemplates(ctx)` au `Promise.all`, passer `templates` à `ScheduleView`.
- [X] T014 [US2] Modifier [src/app/(dashboard)/schedules/_components/ScheduleView.tsx](src/app/(dashboard)/schedules/_components/ScheduleView.tsx) : forwarder `templates` à `ScheduleCalendar`.
- [X] T015 [US2] Modifier [src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx](src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx) : forwarder `templates` à `ScheduleToolbar`.
- [X] T016 [US2] Modifier `ScheduleToolbar.tsx` : ajouter bouton « Appliquer un modèle » MANAGER-only qui ouvre `ApplyTemplateDialog`.

## Phase 5 — User Story 3 (Manage templates) (P2)

- [X] T017 [P] [US3] Créer [src/actions/scheduleTemplates/rename.ts](src/actions/scheduleTemplates/rename.ts).
- [X] T018 [P] [US3] Créer [src/actions/scheduleTemplates/delete.ts](src/actions/scheduleTemplates/delete.ts).
- [X] T019 [US3] Créer [src/app/(dashboard)/templates/page.tsx](src/app/(dashboard)/templates/page.tsx) (Server Component MANAGER-only via `requireManagerContext`).
- [X] T020 [US3] Créer [src/app/(dashboard)/templates/_components/TemplatesList.tsx](src/app/(dashboard)/templates/_components/TemplatesList.tsx).
- [X] T021 [P] [US3] Créer [src/app/(dashboard)/templates/_components/RenameTemplateDialog.tsx](src/app/(dashboard)/templates/_components/RenameTemplateDialog.tsx).
- [X] T022 [P] [US3] Créer [src/app/(dashboard)/templates/_components/DeleteTemplateDialog.tsx](src/app/(dashboard)/templates/_components/DeleteTemplateDialog.tsx).
- [X] T023 [US3] Modifier [src/proxy.ts](src/proxy.ts) : ajouter `/templates` aux `PROTECTED_PREFIXES` et au `matcher`.
- [X] T024 [US3] Modifier [src/components/shell/SidebarNav.tsx](src/components/shell/SidebarNav.tsx) : ajouter l'entrée « Modèles » MANAGER-only (icône `LayoutTemplate`).

## Phase 6 — Polish

- [X] T025 Mettre à jour CLAUDE.md (pointeur de phase active → 014).
- [X] T026 `npx tsc --noEmit` ; corriger toute erreur.
- [X] T027 `npm run build` ; vérifier la présence des routes `/templates`.

## Dependencies

- T001 → T002 → T003 (schéma → migration → générer)
- T004 → T005, T006, T007 (repo skeleton avant les fonctions)
- T005 → T008, T009, T010 (US1)
- T006 → T011 à T016 (US2)
- T007 → T017 à T024 (US3)
- T025 → T026 → T027 (polish séquentiel)

## Parallel Opportunities

- T008, T011, T017, T018 (4 server actions indépendantes) — [P]
- T009, T012, T020, T021, T022 (5 composants UI indépendants une fois leurs actions prêtes) — [P]

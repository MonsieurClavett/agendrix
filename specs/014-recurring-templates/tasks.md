# Tasks: Modèles d'horaire récurrents

**Feature**: 014-recurring-templates
**Plan**: [plan.md](./plan.md)

## Phase 1 — Setup & Schema

- [ ] T001 Ajouter `model ScheduleTemplate` et `model ScheduleTemplateShift` à [prisma/schema.prisma](prisma/schema.prisma), avec back-relations sur Company, User (`templatesCreated`), Position et User (`templateShifts`).
- [ ] T002 Générer la migration `add_schedule_templates` via `npx prisma migrate dev --name add_schedule_templates`.
- [ ] T003 Lancer `npx prisma generate` et vérifier que les types sont disponibles.

## Phase 2 — Foundational (repository)

- [ ] T004 Créer [src/lib/repositories/scheduleTemplate.ts](src/lib/repositories/scheduleTemplate.ts) avec les types `TemplateRow`, `TemplateDetail`, et l'export `templateSelect`.
- [ ] T005 [US1] Implémenter `createTemplateFromWeek(ctx, { name, weekStart })` transactionnel : count shifts, throw `EMPTY_WEEK` si 0, throw `NAME_TAKEN` sur P2002, dump tous les `ScheduleTemplateShift` (dayOfWeek 1–7 ISO, startHour/endHour en minutes locales, endDayOffset).
- [ ] T006 [US2] Implémenter `applyTemplate(ctx, { templateId, weekStart })` transactionnel : load template (404 si autre company), construit `startsAt`/`endsAt`, fallback null pour employeeId/positionId disparus, `createMany` les Shifts DRAFT.
- [ ] T007 [US3] Implémenter `listTemplates(ctx)` (avec count `_count.shifts`) et `renameTemplate`, `deleteTemplate`.

## Phase 3 — User Story 1 (Save template) (P1)

- [ ] T008 [P] [US1] Créer [src/actions/scheduleTemplates/save.ts](src/actions/scheduleTemplates/save.ts) avec `saveAsTemplateAction(state, fd)` (Zod: `name`, `weekStart`).
- [ ] T009 [US1] Créer [src/app/(dashboard)/schedules/_components/SaveTemplateDialog.tsx](src/app/(dashboard)/schedules/_components/SaveTemplateDialog.tsx) (input nom + submit).
- [ ] T010 [US1] Modifier [src/app/(dashboard)/schedules/_components/ScheduleToolbar.tsx](src/app/(dashboard)/schedules/_components/ScheduleToolbar.tsx) : ajouter bouton « Sauvegarder comme modèle » MANAGER-only qui ouvre `SaveTemplateDialog`.

## Phase 4 — User Story 2 (Apply template) (P1)

- [ ] T011 [P] [US2] Créer [src/actions/scheduleTemplates/apply.ts](src/actions/scheduleTemplates/apply.ts) avec `applyTemplateAction(state, fd)` (Zod: `templateId`, `weekStart`).
- [ ] T012 [US2] Créer [src/app/(dashboard)/schedules/_components/ApplyTemplateDialog.tsx](src/app/(dashboard)/schedules/_components/ApplyTemplateDialog.tsx) (props `templates` chargés depuis le serveur via la page).
- [ ] T013 [US2] Modifier [src/app/(dashboard)/schedules/page.tsx](src/app/(dashboard)/schedules/page.tsx) : ajouter `listTemplates(ctx)` au `Promise.all`, passer `templates` à `ScheduleView`.
- [ ] T014 [US2] Modifier [src/app/(dashboard)/schedules/_components/ScheduleView.tsx](src/app/(dashboard)/schedules/_components/ScheduleView.tsx) : forwarder `templates` à `ScheduleCalendar`.
- [ ] T015 [US2] Modifier [src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx](src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx) : forwarder `templates` à `ScheduleToolbar`.
- [ ] T016 [US2] Modifier `ScheduleToolbar.tsx` : ajouter bouton « Appliquer un modèle » MANAGER-only qui ouvre `ApplyTemplateDialog`.

## Phase 5 — User Story 3 (Manage templates) (P2)

- [ ] T017 [P] [US3] Créer [src/actions/scheduleTemplates/rename.ts](src/actions/scheduleTemplates/rename.ts).
- [ ] T018 [P] [US3] Créer [src/actions/scheduleTemplates/delete.ts](src/actions/scheduleTemplates/delete.ts).
- [ ] T019 [US3] Créer [src/app/(dashboard)/templates/page.tsx](src/app/(dashboard)/templates/page.tsx) (Server Component MANAGER-only via `requireManagerContext`).
- [ ] T020 [US3] Créer [src/app/(dashboard)/templates/_components/TemplatesList.tsx](src/app/(dashboard)/templates/_components/TemplatesList.tsx).
- [ ] T021 [P] [US3] Créer [src/app/(dashboard)/templates/_components/RenameTemplateDialog.tsx](src/app/(dashboard)/templates/_components/RenameTemplateDialog.tsx).
- [ ] T022 [P] [US3] Créer [src/app/(dashboard)/templates/_components/DeleteTemplateDialog.tsx](src/app/(dashboard)/templates/_components/DeleteTemplateDialog.tsx).
- [ ] T023 [US3] Modifier [src/proxy.ts](src/proxy.ts) : ajouter `/templates` aux `PROTECTED_PREFIXES` et au `matcher`.
- [ ] T024 [US3] Modifier [src/components/shell/SidebarNav.tsx](src/components/shell/SidebarNav.tsx) : ajouter l'entrée « Modèles » MANAGER-only (icône `LayoutTemplate`).

## Phase 6 — Polish

- [ ] T025 Mettre à jour CLAUDE.md (pointeur de phase active → 014).
- [ ] T026 `npx tsc --noEmit` ; corriger toute erreur.
- [ ] T027 `npm run build` ; vérifier la présence des routes `/templates`.

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

# Tasks: Approbation hiérarchique des heures

**Feature**: 028-timesheet-approval

## Phase 1 — Schema & migration

- [X] T001 Étendre [prisma/schema.prisma](prisma/schema.prisma) avec l'enum `TimesheetApprovalStatus { PENDING, APPROVED, REJECTED }`, le modèle `TimesheetApproval` (champs + unique + index) et la nouvelle valeur `TIMESHEET_DECIDED` sur l'enum `NotificationType`.
- [X] T002 Lancer `npx prisma migrate dev --name add_timesheet_approval` pour générer la migration dans [prisma/migrations](prisma/migrations).
- [X] T003 Régénérer le client Prisma via `npx prisma generate` (re-build de [src/generated/prisma](src/generated/prisma)).

## Phase 2 — Notifications

- [X] T004 Étendre l'union Zod discriminée dans [src/lib/notifications.ts](src/lib/notifications.ts) avec le payload `TIMESHEET_DECIDED { weekStart, status, managerNote? }`.
- [X] T005 Ajouter les branches `TIMESHEET_DECIDED` à `renderNotificationLabel`, `renderNotificationHref` et `renderNotificationEmailSubject` dans [src/lib/notifications.ts](src/lib/notifications.ts).

## Phase 3 — Repository (P1)

- [X] T006 Créer [src/lib/repositories/timesheetApproval.ts](src/lib/repositories/timesheetApproval.ts) avec le helper interne `normalizeWeekStart(date)` (rejette si pas un lundi 00:00 local).
- [X] T007 Implémenter `listForWeek(ctx, weekStart)` dans [src/lib/repositories/timesheetApproval.ts](src/lib/repositories/timesheetApproval.ts) — réutilise `getReportForRange()` restreint à 7 jours et compose avec les approbations existantes.
- [X] T008 Implémenter `decideForEmployee(ctx, { weekStart, employeeId, status, managerNote })` dans [src/lib/repositories/timesheetApproval.ts](src/lib/repositories/timesheetApproval.ts) — upsert + snapshot + `createNotificationsInTx` + email post-commit avec try/catch.
- [X] T009 Implémenter `decideForAllPendingInWeek(ctx, { weekStart, status })` dans [src/lib/repositories/timesheetApproval.ts](src/lib/repositories/timesheetApproval.ts) — `$transaction` unique sur tous les employés sans approbation ou `PENDING` + N notifications.
- [X] T010 Implémenter `getApprovalStatus(ctx, { weekStart, employeeId })` et `listApprovedEmployeeIdsForRange(ctx, { startDate, endDate })` dans [src/lib/repositories/timesheetApproval.ts](src/lib/repositories/timesheetApproval.ts).

## Phase 4 — Server Actions (P1)

- [X] T011 Créer [src/actions/timesheetApproval/decideOne.ts](src/actions/timesheetApproval/decideOne.ts) avec schéma Zod et mapping des erreurs vers messages FR (`useActionState` pattern).
- [X] T012 Créer [src/actions/timesheetApproval/decideAll.ts](src/actions/timesheetApproval/decideAll.ts) — revalide `/approbation`.

## Phase 5 — UI page approbation (P1)

- [X] T013 Créer [src/app/(dashboard)/approbation/page.tsx](src/app/(dashboard)/approbation/page.tsx) — Server Component, `requireManagerContext()`, parse `?weekStart`, fallback semaine précédente.
- [X] T014 Créer [src/app/(dashboard)/approbation/_components/ApprovalGrid.tsx](src/app/(dashboard)/approbation/_components/ApprovalGrid.tsx) — `PageHeader` + table + `EmptyState`.
- [X] T015 Créer [src/app/(dashboard)/approbation/_components/WeekPicker.tsx](src/app/(dashboard)/approbation/_components/WeekPicker.tsx) — Client Component qui pousse `?weekStart` dans l'URL.
- [X] T016 Créer [src/app/(dashboard)/approbation/_components/ApprovalRow.tsx](src/app/(dashboard)/approbation/_components/ApprovalRow.tsx) — affiche prévu / travaillé / écart coloré / badge statut + boutons « Approuver » / « Refuser ».
- [X] T017 Créer [src/app/(dashboard)/approbation/_components/RejectDialog.tsx](src/app/(dashboard)/approbation/_components/RejectDialog.tsx) — dialog avec `Textarea managerNote` (max 500).
- [X] T018 Créer [src/app/(dashboard)/approbation/_components/ApproveAllButton.tsx](src/app/(dashboard)/approbation/_components/ApproveAllButton.tsx) — dialog de confirmation + invocation de `decideAll`.

## Phase 6 — CSV integration (P2)

- [X] T019 Modifier [src/app/api/reports/csv/route.ts](src/app/api/reports/csv/route.ts) pour accepter `?onlyApproved=true`, filtrer via `listApprovedEmployeeIdsForRange`, et ajouter la colonne « Statut approbation ».
- [X] T020 Modifier [src/lib/csv.ts](src/lib/csv.ts) si nécessaire pour supporter une colonne optionnelle dans `buildCsv()`.

## Phase 7 — Integration

- [X] T021 Modifier [src/proxy.ts](src/proxy.ts) : protéger `/approbation` (MANAGER-only).
- [X] T022 Modifier [src/components/shell/SidebarNav.tsx](src/components/shell/SidebarNav.tsx) : ajouter l'entrée « Approbation » (icône `BadgeCheck`, MANAGER only).

## Phase 8 — Polish

- [X] T023 Mettre à jour [CLAUDE.md](CLAUDE.md) pour pointer vers `028-timesheet-approval` (Active feature + Plan).
- [X] T024 Lancer `npx tsc --noEmit` et `npm run build` pour valider l'absence de régression TS.
- [X] T025 Smoke test manuel selon `quickstart.md` (à créer si applicable) : MANAGER approuve une ligne, refuse une autre, approuve tout, exporte CSV `onlyApproved=true`.

## Dependencies

- T002 dépend de T001.
- T003 dépend de T002.
- T004–T005 dépendent de T003 (enum `TIMESHEET_DECIDED` doit être généré).
- T006–T010 dépendent de T003 et T005.
- T011–T012 dépendent de T006–T010.
- T013–T018 dépendent de T011–T012.
- T019–T020 dépendent de T010.
- T021–T022 dépendent de T013.
- T023–T025 dépendent de tout ce qui précède.

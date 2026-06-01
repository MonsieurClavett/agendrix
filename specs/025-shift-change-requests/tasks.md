# Tasks: Demandes de modification de shift

**Feature**: 025-shift-change-requests

## Phase 1 — Setup & Schema

- [ ] T001 Ajouter `enum ShiftChangeRequestStatus`, étendre `enum NotificationType` (+ `SHIFT_CHANGE_REQUESTED`, `SHIFT_CHANGE_DECIDED`), ajouter `model ShiftChangeRequest` + back-relations dans [prisma/schema.prisma](prisma/schema.prisma).
- [ ] T002 `npx prisma migrate dev --name add_shift_change_requests`.
- [ ] T003 Éditer le fichier `migration.sql` généré pour ajouter le partial unique `CREATE UNIQUE INDEX "ShiftChangeRequest_shiftId_pending_unique" ON "ShiftChangeRequest"("shiftId") WHERE "status" = 'PENDING';` puis relancer la migration ([prisma/migrations/](prisma/migrations)).

## Phase 2 — Notifications & Email plumbing

- [ ] T004 Étendre la Zod discriminated union et les helpers `renderNotificationLabel`, `renderNotificationHref` dans [src/lib/notifications.ts](src/lib/notifications.ts) avec les 2 nouveaux types (href → `/modifications`).
- [ ] T005 Ajouter les branches `subject` + `body` pour `SHIFT_CHANGE_REQUESTED` et `SHIFT_CHANGE_DECIDED` (APPROVED / REJECTED) dans [src/lib/email.ts](src/lib/email.ts).

## Phase 3 — Repository (P1)

- [ ] T006 Créer [src/lib/repositories/shiftChangeRequest.ts](src/lib/repositories/shiftChangeRequest.ts) avec `listPendingForCompany`, `listRecentDecidedForCompany`, `listMyRequests`, `createRequest`, `approveRequest`, `rejectRequest`, `cancelRequest`. Toutes les fonctions filtrent sur `companyId`, émettent notifications via `createNotificationsInTx`, throw codes d'erreur normalisés.

## Phase 4 — Server Actions (P1)

- [ ] T007 [P] Créer [src/actions/shiftChangeRequests/create.ts](src/actions/shiftChangeRequests/create.ts) — Zod schema, validation start<end + duration 15min-24h, appelle `createRequest`, envoie emails post-commit (try/catch swallow).
- [ ] T008 [P] Créer [src/actions/shiftChangeRequests/approve.ts](src/actions/shiftChangeRequests/approve.ts) — `requireManagerContext`, appelle `approveRequest`, post-commit email.
- [ ] T009 [P] Créer [src/actions/shiftChangeRequests/reject.ts](src/actions/shiftChangeRequests/reject.ts) — `requireManagerContext`, Zod `managerNote.max(280).optional()`, post-commit email.
- [ ] T010 [P] Créer [src/actions/shiftChangeRequests/cancel.ts](src/actions/shiftChangeRequests/cancel.ts) — `requireTenantContext`, appelle `cancelRequest` (pas d'email).

## Phase 5 — UI page /modifications (P1)

- [ ] T011 Créer [src/app/(dashboard)/modifications/page.tsx](src/app/(dashboard)/modifications/page.tsx) (Server Component, branche `ctx.role`, charge les listes via `Promise.all`).
- [ ] T012 [P] Créer [src/app/(dashboard)/modifications/_components/PendingRequestsList.tsx](src/app/(dashboard)/modifications/_components/PendingRequestsList.tsx) — table MANAGER + boutons.
- [ ] T013 [P] Créer [src/app/(dashboard)/modifications/_components/DecidedHistoryList.tsx](src/app/(dashboard)/modifications/_components/DecidedHistoryList.tsx) — historique read-only.
- [ ] T014 [P] Créer [src/app/(dashboard)/modifications/_components/MyRequestsList.tsx](src/app/(dashboard)/modifications/_components/MyRequestsList.tsx) — EMPLOYEE + bouton Annuler.
- [ ] T015 [P] Créer [src/app/(dashboard)/modifications/_components/ApproveDialog.tsx](src/app/(dashboard)/modifications/_components/ApproveDialog.tsx) (confirmation simple, `useActionState`).
- [ ] T016 [P] Créer [src/app/(dashboard)/modifications/_components/RejectDialog.tsx](src/app/(dashboard)/modifications/_components/RejectDialog.tsx) (textarea note + confirm).
- [ ] T017 [P] Créer [src/app/(dashboard)/modifications/_components/CancelRequestDialog.tsx](src/app/(dashboard)/modifications/_components/CancelRequestDialog.tsx) (confirmation).

## Phase 6 — Intégration ShiftDialog (P1)

- [ ] T018 Modifier [src/app/(dashboard)/schedules/page.tsx](src/app/(dashboard)/schedules/page.tsx) — ajouter un `findMany` sélectionnant `shiftId` des `ShiftChangeRequest` PENDING de la company, construire `Set<string> pendingChangeRequestShiftIds`, le passer au `ScheduleView`.
- [ ] T019 Modifier [src/app/(dashboard)/schedules/_components/ShiftDialog.tsx](src/app/(dashboard)/schedules/_components/ShiftDialog.tsx) — ajouter entrée « Demander un changement d'horaire » gated sur `shift.employeeId === ctx.userId && shift.status === "PUBLISHED" && !pendingChangeRequestShiftIds.has(shift.id)`.
- [ ] T020 Créer [src/app/(dashboard)/schedules/_components/ChangeRequestDialog.tsx](src/app/(dashboard)/schedules/_components/ChangeRequestDialog.tsx) — Client Component, 2 datetime inputs pré-remplis + textarea raison + submit `useActionState(createAction)`.

## Phase 7 — Intégration globale

- [ ] T021 Modifier [src/proxy.ts](src/proxy.ts) — ajouter `/modifications` aux `PROTECTED_PREFIXES` et au `matcher`.
- [ ] T022 Modifier [src/components/shell/SidebarNav.tsx](src/components/shell/SidebarNav.tsx) — ajouter « Modifications » → `/modifications` (TOUS, icône `Edit`).

## Phase 8 — Polish

- [ ] T023 Mettre à jour le pointeur « Active feature » dans [CLAUDE.md](CLAUDE.md) → 25-shift-change-requests.
- [ ] T024 `npx tsc --noEmit` + `npm run build`.

## Dependencies

- T001 → T002 → T003 (schéma + migration + partial unique éditée)
- T002 (Prisma generate) → T004, T005, T006 (besoin des types générés)
- T004 → T006 (le repo importe les payloads de `notifications.ts`)
- T005 → T007, T008, T009 (les actions envoient des emails post-commit)
- T006 → T007, T008, T009, T010 (les actions consomment le repo)
- T006 → T018 (la page schedules consomme le repo pour fetch PENDING)
- T011 → T012, T013, T014 (la page monte les listes)
- T015, T016 → T012 (les dialogs sont consommés par PendingRequestsList)
- T017 → T014
- T020 → T019 (le ShiftDialog importe ChangeRequestDialog)
- T021, T022 séquentiel après les pages
- T023 → T024

## Parallel Opportunities

- T007 / T008 / T009 / T010 (4 actions indépendantes) — [P]
- T012 / T013 / T014 / T015 / T016 / T017 (composants UI indépendants après page squelette T011) — [P]

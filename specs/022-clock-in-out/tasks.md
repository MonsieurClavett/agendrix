# Tasks: Pointage QR (clock in/out)

**Feature**: 022-clock-in-out

## Phase 1 — Setup & Schema

- [X] T001 `npm install qrcode @types/qrcode`.
- [X] T002 Ajouter `model PunchLocation`, `model Punch`, `enum PunchType` à [prisma/schema.prisma](prisma/schema.prisma) + back-relations Company, User.
- [X] T003 `npx prisma migrate dev --name add_clock_in_out`.

## Phase 2 — Foundational

- [X] T004 Créer [src/lib/qrcode.ts](src/lib/qrcode.ts) avec helper `generateQrDataUrl(url)`.
- [X] T005 Créer [src/lib/repositories/punchLocation.ts](src/lib/repositories/punchLocation.ts) : `listLocations`, `getLocationByToken`, `createLocation` (génère token random), `updateLocation`, `deleteLocation`.

## Phase 3 — Repository punches (P1)

- [X] T006 Créer [src/lib/repositories/punch.ts](src/lib/repositories/punch.ts) : `getLastPunchOfDay`, `listPunchesForDay`, `listPunchesForUser`, `recordPunch` (détermine type IN/OUT, lookup shift le plus proche pour écart).

## Phase 4 — Server Actions (P1)

- [X] T007 [P] Créer [src/actions/punchLocations/create.ts](src/actions/punchLocations/create.ts).
- [X] T008 [P] Créer [src/actions/punchLocations/update.ts](src/actions/punchLocations/update.ts) (rename + activate/deactivate).
- [X] T009 [P] Créer [src/actions/punchLocations/delete.ts](src/actions/punchLocations/delete.ts).
- [X] T010 [P] Créer [src/actions/punches/record.ts](src/actions/punches/record.ts).

## Phase 5 — Page publique de pointage (P1)

- [X] T011 Créer [src/app/punch/[token]/page.tsx](src/app/punch/[token]/page.tsx) (Server Component, auth required).
- [X] T012 Créer [src/app/punch/[token]/_components/PunchButton.tsx](src/app/punch/[token]/_components/PunchButton.tsx) (Client Component avec useActionState).

## Phase 6 — MANAGER /punch-locations (P1)

- [X] T013 Créer [src/app/(dashboard)/punch-locations/page.tsx](src/app/(dashboard)/punch-locations/page.tsx).
- [X] T014 Créer [src/app/(dashboard)/punch-locations/_components/PunchLocationsList.tsx](src/app/(dashboard)/punch-locations/_components/PunchLocationsList.tsx) (table + QR inline).
- [X] T015 Créer [src/app/(dashboard)/punch-locations/_components/NewLocationDialog.tsx](src/app/(dashboard)/punch-locations/_components/NewLocationDialog.tsx).
- [X] T016 Créer [src/app/(dashboard)/punch-locations/_components/RenameLocationDialog.tsx](src/app/(dashboard)/punch-locations/_components/RenameLocationDialog.tsx).
- [X] T017 Créer [src/app/(dashboard)/punch-locations/_components/DeleteLocationDialog.tsx](src/app/(dashboard)/punch-locations/_components/DeleteLocationDialog.tsx).
- [X] T018 Créer [src/app/(dashboard)/punch-locations/_components/QrModal.tsx](src/app/(dashboard)/punch-locations/_components/QrModal.tsx) (QR plein écran + bouton imprimer).

## Phase 7 — MANAGER /pointage (P1)

- [X] T019 Créer [src/app/(dashboard)/pointage/page.tsx](src/app/(dashboard)/pointage/page.tsx) (sélecteur date + table pointages + counters).
- [X] T020 Créer [src/app/(dashboard)/pointage/_components/PunchesTable.tsx](src/app/(dashboard)/pointage/_components/PunchesTable.tsx).

## Phase 8 — EMPLOYEE /me/pointage (P2)

- [X] T021 Créer [src/app/(dashboard)/me/pointage/page.tsx](src/app/(dashboard)/me/pointage/page.tsx) (historique 30j + apparies IN/OUT).
- [X] T022 Créer [src/app/(dashboard)/me/pointage/_components/MyPunchesList.tsx](src/app/(dashboard)/me/pointage/_components/MyPunchesList.tsx).

## Phase 9 — Integration

- [X] T023 Modifier [src/proxy.ts](src/proxy.ts) : ajouter `/punch`, `/punch-locations`, `/pointage`, `/me/pointage` aux PROTECTED_PREFIXES et matcher.
- [X] T024 Modifier [src/components/shell/SidebarNav.tsx](src/components/shell/SidebarNav.tsx) : ajouter « Pointage » (MANAGER), « Postes » (MANAGER), « Mes pointages » (TOUS).

## Phase 10 — Polish

- [X] T025 CLAUDE.md pointeur → 022.
- [X] T026 `npx tsc --noEmit` + `npm run build`.

## Dependencies

- T001 → T002 → T003 (setup d'abord)
- T004 → T011, T013, T018 (qrcode helper avant pages QR)
- T005 → T007, T008, T009, T010, T011, T013 (repo locations)
- T006 → T010, T011, T019, T021 (repo punches)
- T023, T024 séquentiel après pages
- T025 → T026

## Parallel Opportunities

- T007 / T008 / T009 / T010 (4 actions indépendantes) — [P]
- T015 / T016 / T017 / T018 (4 dialogs/modals indépendants) — [P]

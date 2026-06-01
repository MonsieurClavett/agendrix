# Tasks: Audit log — historique des mutations sensibles

**Feature**: 026-audit-log

## Phase 1 — Setup & Schema

- [X] T001 Ajouter `model AuditLog` à [prisma/schema.prisma](prisma/schema.prisma) avec les 3 index `(companyId, createdAt desc)`, `(companyId, action)`, `(companyId, entityType, entityId)` + back-relations dans `Company` et `User`.
- [X] T002 `npx prisma migrate dev --name add_audit_log`.

## Phase 2 — Foundational

- [X] T003 Créer [src/lib/auditMeta.ts](src/lib/auditMeta.ts) avec `readAuditMeta()` lisant `x-forwarded-for` et `user-agent` depuis `next/headers`.
- [X] T004 Créer [src/lib/repositories/auditLog.ts](src/lib/repositories/auditLog.ts) : `writeAuditEventInTx(tx, input)`, `writeAuditEvent(ctx, input)`, `listForCompany(ctx, opts)`. NE PAS exposer `update` ni `delete`.
- [X] T005 Créer constantes typées `AUDIT_ACTIONS` et `AUDIT_ENTITY_TYPES` dans [src/lib/repositories/auditLog.ts](src/lib/repositories/auditLog.ts) pour autocomplétion des callsites.

## Phase 3 — Instrumentation Shifts (P1)

- [X] T006 Modifier [src/lib/repositories/shift.ts](src/lib/repositories/shift.ts) : ajouter `writeAuditEventInTx` dans `createShift`, `updateShift`, `deleteShift` (3 callsites, chacun à l'intérieur de la `$transaction`).
- [X] T007 Modifier [src/actions/shifts/publishWeek.ts](src/actions/shifts/publishWeek.ts) : ajouter `writeAuditEventInTx` avec `action='shift.published'`, `payload={ weekStart, shiftCount }`.

## Phase 4 — Instrumentation Announcements / TimeOff / Claims / Swaps (P1)

- [X] T008 [P] Modifier [src/lib/repositories/announcement.ts](src/lib/repositories/announcement.ts) : `writeAuditEventInTx` dans `createAnnouncement` et `deleteAnnouncement`.
- [X] T009 [P] Modifier [src/lib/repositories/timeOff.ts](src/lib/repositories/timeOff.ts) : `writeAuditEventInTx` dans `decideRequest` avec `payload={ requestId, status }`.
- [X] T010 [P] Modifier [src/lib/repositories/shiftClaim.ts](src/lib/repositories/shiftClaim.ts) : `writeAuditEventInTx` dans `decideClaim`.
- [X] T011 [P] Modifier [src/lib/repositories/shiftSwap.ts](src/lib/repositories/shiftSwap.ts) : `writeAuditEventInTx` dans `managerDecide`, `peerAccept`, `peerReject` avec `payload={ swapId, decision }`.

## Phase 5 — Instrumentation Punch Locations & Team (P1)

- [X] T012 [P] Modifier [src/lib/repositories/punchLocation.ts](src/lib/repositories/punchLocation.ts) : `writeAuditEventInTx` dans `createLocation` et `deleteLocation`.
- [X] T013 [P] Modifier [src/actions/invitations/accept.ts](src/actions/invitations/accept.ts) : `writeAuditEventInTx` avec `action='employee.invited'`, `payload={ userId, email, role }`.
- [X] T014 Vérifier [src/actions/team/setActive.ts](src/actions/team/setActive.ts) — si présent, ajouter `writeAuditEventInTx` (`employee.deactivated`). Sinon documenter le gap dans la PR.
- [X] T015 Vérifier [src/actions/team/setRole.ts](src/actions/team/setRole.ts) — si présent, ajouter `writeAuditEventInTx` (`employee.role_changed`, `payload={ userId, from, to }`). Sinon documenter le gap.

## Phase 6 — UI `/audit` (P1)

- [X] T016 Créer [src/app/(dashboard)/audit/page.tsx](src/app/(dashboard)/audit/page.tsx) (Server Component, `requireManagerContext`, parse `searchParams.action / entityType / beforeDate`, appelle `listForCompany`).
- [X] T017 Créer [src/app/(dashboard)/audit/_components/AuditFilters.tsx](src/app/(dashboard)/audit/_components/AuditFilters.tsx) (Client Component, selects action / entityType + input date `beforeDate` + bouton « Appliquer »).
- [X] T018 Créer [src/app/(dashboard)/audit/_components/AuditTable.tsx](src/app/(dashboard)/audit/_components/AuditTable.tsx) (table chronologique, lien « Plus anciens → » si page pleine).
- [X] T019 Créer [src/app/(dashboard)/audit/_components/AuditRowDetail.tsx](src/app/(dashboard)/audit/_components/AuditRowDetail.tsx) (Client, expand inline montrant payload formattée + IP + UA + lien « Ouvrir » best-effort).

## Phase 7 — Integration

- [X] T020 Modifier [src/proxy.ts](src/proxy.ts) : ajouter `/audit` aux `PROTECTED_PREFIXES` et au matcher.
- [X] T021 Modifier [src/components/shell/SidebarNav.tsx](src/components/shell/SidebarNav.tsx) : ajouter entrée « Audit » MANAGER-only (icône `ShieldCheck`).

## Phase 8 — Polish

- [X] T022 CLAUDE.md pointeur → 26-audit-log.
- [X] T023 `npx tsc --noEmit` + `npm run build`.
- [X] T024 Smoke test manuel : créer shift / publier semaine / décider time-off → vérifier 3 entrées `AuditLog` dans `/audit` + filtres + pagination.

## Dependencies

- T001 → T002 (schema avant migration)
- T002 → T003, T004 (migration avant code consommant le client Prisma régénéré)
- T004 → T006-T015 (helper repo avant instrumentation)
- T004 → T016 (helper repo avant page de lecture)
- T016 → T017, T018, T019 (page racine avant composants)
- T020, T021 séquentiel après UI
- T022 → T023 → T024 (polish séquentiel)

## Parallel Opportunities

- T008 / T009 / T010 / T011 (4 repos indépendants) — [P]
- T012 / T013 (instrumentations indépendantes) — [P]
- T017 / T018 / T019 (composants UI indépendants une fois la page créée) — [P]

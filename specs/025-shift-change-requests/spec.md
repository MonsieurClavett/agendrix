# Feature Specification: Demandes de modification de shift

**Feature Branch**: `025-shift-change-requests`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 25 — demandes de modification d'horaire. Un EMPLOYEE ouvre un de ses shifts PUBLISHED dans le calendrier et demande au MANAGER de changer les heures de début/fin. Le MANAGER approuve (les heures du Shift sont alors mises à jour) ou refuse (avec note optionnelle). Pattern identique aux échanges de shift de la Phase 13 : notifications transactionnelles, double validation (création + approbation), workflow PENDING → APPROVED / REJECTED. L'EMPLOYEE peut annuler sa demande tant qu'elle est PENDING."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - L'EMPLOYEE demande un changement d'horaire (Priority: P1)

L'EMPLOYEE Bob a un shift PUBLISHED de 9h00–17h00 mais voudrait commencer à 10h00 et finir à 18h00. Il ouvre le shift dans `/schedules`, clique « Demander un changement d'horaire ». Un dialog s'ouvre avec les heures actuelles pré-remplies et deux champs pour les nouvelles heures + une raison optionnelle. Il soumet. Le système crée un `ShiftChangeRequest` PENDING et notifie tous les MANAGERs de la company.

**Why this priority**: C'est le point d'entrée du workflow. Sans cette action, rien ne se passe.

**Independent Test**: Connecté en Bob, ouvrir un shift PUBLISHED qui lui appartient, cliquer le bouton, soumettre des heures valides → vérifier (a) `ShiftChangeRequest` créée avec `status=PENDING`, `employeeId=Bob`, (b) une `Notification` `SHIFT_CHANGE_REQUESTED` créée pour chaque MANAGER de la company.

**Acceptance Scenarios**:

1. **Given** Bob a un shift PUBLISHED 9h-17h, **When** il demande un changement vers 10h-18h, **Then** une `ShiftChangeRequest` PENDING est créée avec les nouvelles heures et tous les MANAGERs reçoivent une notification.
2. **Given** Bob a déjà une demande PENDING sur ce shift, **When** il rouvre le dialog, **Then** le bouton est désactivé (une seule demande PENDING par shift à la fois).
3. **Given** un shift en `status=DRAFT`, **When** Bob l'ouvre, **Then** le bouton « Demander un changement » n'est pas affiché.
4. **Given** un shift d'un autre employé, **When** Bob l'ouvre, **Then** le bouton n'est pas affiché.
5. **Given** un MANAGER qui ouvre un shift d'un de ses employés, **Then** le bouton n'est pas affiché (un MANAGER ne demande pas, il modifie directement).
6. **Given** des heures requêtées invalides (fin avant début, durée < 15 min ou > 24h), **Then** le serveur refuse avec un message clair en français.

---

### User Story 2 - Le MANAGER approuve une demande (Priority: P1)

Le MANAGER ouvre `/modifications`. Voit la liste des demandes PENDING avec : nom de l'employé, shift actuel (date + heures), heures demandées, raison. Clique « Approuver » sur la demande de Bob. La transaction met à jour `Shift.startsAt` / `Shift.endsAt` aux heures demandées, passe `request.status=APPROVED`, enregistre `decidedAt` / `decidedByUserId`, notifie Bob.

**Why this priority**: Sans approbation, le workflow ne se ferme jamais. C'est l'action complémentaire de la User Story 1.

**Independent Test**: Avec une `ShiftChangeRequest` PENDING en base, ouvrir `/modifications` en MANAGER, cliquer « Approuver » → vérifier (a) `Shift` mis à jour, (b) `request.status=APPROVED`, (c) `Notification SHIFT_CHANGE_DECIDED` (APPROVED) créée pour Bob, (d) email post-commit envoyé.

**Acceptance Scenarios**:

1. **Given** une demande PENDING, **When** le MANAGER approuve, **Then** le shift adopte les nouvelles heures et le statut passe à APPROVED.
2. **Given** les heures demandées créent un chevauchement avec un autre shift de Bob, **When** le MANAGER approuve, **Then** la transaction est annulée avec un message « Les heures demandées chevauchent un autre shift de cet employé ».
3. **Given** un EMPLOYEE qui essaie d'accéder à `/modifications` pour approuver, **Then** redirigé (MANAGER-only sur les actions decide).
4. **Given** une demande déjà APPROVED ou REJECTED, **When** le MANAGER clique « Approuver » à nouveau, **Then** refusé avec « Cette demande a déjà été traitée ».
5. **Given** un MANAGER d'une autre company, **Then** ne voit aucune demande tierce.

---

### User Story 3 - Le MANAGER refuse une demande (Priority: P1)

Le MANAGER clique « Refuser » sur la demande. Un dialog optionnel apparaît pour saisir une note (`managerNote`, max 280 chars). Il confirme. La demande passe à REJECTED, le shift n'est PAS modifié, Bob reçoit une notification avec la note.

**Independent Test**: Cliquer « Refuser » avec note « Désolé, équipe complète », vérifier (a) `request.status=REJECTED`, (b) `managerNote` persistée, (c) `Shift` inchangé, (d) notification créée avec status REJECTED dans le payload.

**Acceptance Scenarios**:

1. **Given** une demande PENDING, **When** le MANAGER refuse avec une note, **Then** la demande passe à REJECTED et la note est persistée dans `managerNote`.
2. **Given** un refus sans note, **When** le MANAGER confirme, **Then** la demande passe à REJECTED avec `managerNote=null`.
3. **Given** une note > 280 chars, **Then** refusé côté serveur.

---

### User Story 4 - L'EMPLOYEE annule sa propre demande (Priority: P2)

Bob change d'avis. Il ouvre `/modifications` (section « Mes demandes »), voit sa demande PENDING avec un bouton « Annuler ». Il clique. La demande passe à `CANCELED_BY_EMPLOYEE`. Aucune notification n'est envoyée (silencieux côté MANAGER).

**Independent Test**: Cliquer « Annuler » sur sa propre demande PENDING → status passe à CANCELED_BY_EMPLOYEE, plus visible dans la liste des PENDING du MANAGER.

**Acceptance Scenarios**:

1. **Given** Bob a une demande PENDING, **When** il clique « Annuler », **Then** status passe à CANCELED_BY_EMPLOYEE.
2. **Given** Bob essaie d'annuler la demande d'un collègue, **Then** refusé (l'action force `employeeId = ctx.userId`).
3. **Given** une demande déjà APPROVED, **When** Bob clique « Annuler », **Then** refusé avec « Cette demande a déjà été traitée ».

---

### Edge Cases

- **Shift supprimé entre la demande et l'approbation** : la cascade FK supprime aussi la `ShiftChangeRequest`. Côté UI, la ligne disparaît silencieusement.
- **Employé supprimé** : cascade idem.
- **Approbation après changement d'horaire manuel par MANAGER** : à l'approbation, on re-vérifie le chevauchement avec les autres shifts actuels de l'employé. Pas de vérification que le shift d'origine est encore PUBLISHED — un MANAGER qui re-DRAFT un shift puis approuve une demande est un cas tordu mais acceptable (la modification est appliquée quand même).
- **Demande sur un shift déjà passé** : autorisée (cas de correction a posteriori). Le MANAGER décide.
- **Deux MANAGERs ouvrent la même demande PENDING** : le second clic échoue car le repository filtre `where: { status: "PENDING" }` à la mise à jour — seule la première décision passe.
- **Cross-tenant** : strict via `companyId` à toute lecture/écriture.

## Requirements *(mandatory)*

- **FR-001**: Un EMPLOYEE MUST pouvoir créer une `ShiftChangeRequest` sur un de SES shifts en statut PUBLISHED.
- **FR-002**: Le serveur MUST forcer `employeeId = ctx.userId` à la création (anti-tampering).
- **FR-003**: Un MANAGER MUST NOT pouvoir créer une demande pour un employé — seul l'employé concerné peut.
- **FR-004**: La validation MUST garantir `requestedStartsAt < requestedEndsAt` et `15 min ≤ duration ≤ 24h`.
- **FR-005**: La validation MUST refuser une demande si le `Shift.status !== "PUBLISHED"`.
- **FR-006**: Au plus UNE demande PENDING par `shiftId` à tout instant (partial unique index).
- **FR-007**: À la création d'une demande, une `Notification` `SHIFT_CHANGE_REQUESTED` MUST être créée pour CHAQUE MANAGER de la company, dans la même transaction.
- **FR-008**: Le MANAGER MUST pouvoir approuver ou refuser une demande via `/modifications` (MANAGER-only).
- **FR-009**: À l'approbation, dans une SEULE transaction : (a) re-vérifier que les nouvelles heures ne chevauchent aucun autre shift du même employé, (b) mettre à jour `Shift.startsAt`/`Shift.endsAt`, (c) passer `request.status=APPROVED`, (d) enregistrer `decidedAt`/`decidedByUserId`, (e) créer la `Notification` `SHIFT_CHANGE_DECIDED` pour l'employé.
- **FR-010**: Au refus, la transaction MUST mettre à jour `status=REJECTED` + `managerNote` + `decidedAt`/`decidedByUserId` + créer la `Notification` `SHIFT_CHANGE_DECIDED` (status REJECTED).
- **FR-011**: L'EMPLOYEE MUST pouvoir annuler sa propre demande PENDING (status → `CANCELED_BY_EMPLOYEE`). Aucune notification émise dans ce cas.
- **FR-012**: Les emails de notification MUST être envoyés post-commit avec try/catch swallow (pattern Phase 21).
- **FR-013**: Filtre tenant strict : toutes les requêtes filtrent sur `companyId`.
- **FR-014**: La route `/modifications` MUST être protégée par le proxy (auth required, ouverte EMPLOYEE et MANAGER avec UI conditionnelle).

### Key Entities

- **ShiftChangeRequest** :
  - `id`, `companyId` (FK Company Cascade)
  - `shiftId` (FK Shift Cascade)
  - `employeeId` (FK User Cascade) — requester, doit égaler `Shift.employeeId` à la création
  - `requestedStartsAt: DateTime`, `requestedEndsAt: DateTime`
  - `reason: String?` (max 280)
  - `status: ShiftChangeRequestStatus` enum { `PENDING`, `APPROVED`, `REJECTED`, `CANCELED_BY_EMPLOYEE` }
  - `decidedAt: DateTime?`, `decidedByUserId: String?` (FK User SetNull)
  - `managerNote: String?` (max 280)
  - `createdAt`, `updatedAt`
  - Index : `(companyId, status)`, `(employeeId, status)`
  - Partial unique : UNE seule ligne PENDING par `shiftId`

### New Notification Types

- **`SHIFT_CHANGE_REQUESTED`** — payload `{ requestId, shiftId, employeeName, currentStartsAt, currentEndsAt, requestedStartsAt, requestedEndsAt }`. Destinataires : tous les MANAGERs de la company.
- **`SHIFT_CHANGE_DECIDED`** — payload `{ requestId, shiftId, status: "APPROVED" | "REJECTED", managerNote? }`. Destinataire : l'employé requesteur.

## Success Criteria *(mandatory)*

- **SC-001**: L'EMPLOYEE crée une demande en moins de 30s (ouvrir shift → dialog → submit).
- **SC-002**: Le MANAGER traite une demande (approuve ou refuse) en moins de 10s depuis `/modifications`.
- **SC-003**: 100% des approbations valides mettent à jour les heures du shift correctement.
- **SC-004**: Aucune approbation ne crée de chevauchement (validé par re-check transactionnel).
- **SC-005**: Aucune fuite cross-tenant — vérifié par filtre `companyId` en repo.
- **SC-006**: Une demande PENDING par shift à tout instant — garantie par partial unique index.

## Assumptions

- Pas de demande de changement de DATE (seulement les heures de début/fin du même shift). Pour changer de date, c'est un échange ou une annulation.
- Pas d'historique multi-demandes versionné — chaque demande est indépendante. Si la première est refusée, l'employé peut en créer une nouvelle.
- Pas d'auto-approval (toutes les demandes passent par le MANAGER).
- Pas de modification de la `positionId` dans cette phase.
- Le MANAGER peut toujours éditer directement le shift via le ShiftDialog existant — cette feature est un canal optionnel pour l'employé.
- Pas de SLA / délai d'expiration sur les demandes PENDING dans cette phase.

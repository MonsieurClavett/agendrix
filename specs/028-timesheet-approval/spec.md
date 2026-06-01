# Feature Specification: Approbation hiérarchique des heures

**Feature Branch**: `028-timesheet-approval`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 28 — approbation hiérarchique des heures. Le MANAGER ouvre une page `/approbation` (ou un onglet « Approbation hebdo » dans `/pointage`) où il visualise, pour une semaine choisie, la grille des employés avec heures prévues, heures travaillées et écart. Il approuve ou refuse chaque ligne, ou utilise un bouton « Approuver tout » pour valider toute la semaine en une transaction. Chaque décision crée un snapshot des minutes (prévues, travaillées, écart) afin de figer l'état au moment de l'approbation. L'employé reçoit une notification (in-app + email) à chaque décision individuelle. Le route handler CSV de la Phase 23 accepte un nouveau paramètre `?onlyApproved=true` qui filtre les employés à ceux dont la semaine est `APPROVED` et ajoute une colonne « Statut approbation »."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Le MANAGER approuve une semaine employé par employé (Priority: P1)

Le MANAGER ouvre `/approbation`. Le sélecteur de semaine est positionné par défaut sur la semaine précédente (lundi → dimanche). Une grille liste les employés actifs de la company avec : nom · heures prévues · heures travaillées · écart · statut. Pour Bob (prévu 40h, travaillé 38h30, écart -1h30, statut « À approuver »), le MANAGER clique « Approuver » → ligne passe à « Approuvée » (badge vert) avec snapshot figé.

**Why this priority**: Sans approbation ligne par ligne, le MANAGER ne peut valider les cas particuliers (écart important, oubli de pointage corrigé manuellement plus tard). C'est le mode par défaut.

**Independent Test**: Connecté en MANAGER, ouvrir `/approbation`, sélectionner une semaine passée, cliquer « Approuver » sur la ligne d'un employé → vérifier qu'une `TimesheetApproval(APPROVED)` est créée avec `companyId`, `weekStart`, `employeeId`, snapshots, `decidedByUserId`, `decidedAt`. La page se met à jour avec le badge vert.

**Acceptance Scenarios**:

1. **Given** Bob a 40h prévues / 38h30 travaillées sur la semaine du 25 mai, **When** le MANAGER clique « Approuver » sur sa ligne, **Then** une `TimesheetApproval(APPROVED)` est créée avec `scheduledMinutesSnapshot=2400`, `workedMinutesSnapshot=2310`, `varianceMinutesSnapshot=-90`.
2. **Given** une approbation existante `PENDING` pour Bob, **When** le MANAGER clique « Approuver », **Then** la ligne est upsertée vers `APPROVED` (pas de doublon — unique `(companyId, weekStart, employeeId)`).
3. **Given** un EMPLOYEE qui essaie d'accéder à `/approbation`, **Then** redirigé vers `/me` (MANAGER-only).
4. **Given** un MANAGER d'une autre company, **Then** ne voit aucune ligne tierce.
5. **Given** Bob qui n'a aucun shift et aucun pointage cette semaine-là, **Then** sa ligne affiche 0h / 0h / 0 et reste approuvable.

---

### User Story 2 - Le MANAGER refuse une semaine avec motif (Priority: P1)

Le MANAGER voit l'écart anormal de Carol (prévu 20h, travaillé 35h). Il clique « Refuser » → un dialog s'ouvre avec un champ « Raison » (max 500 caractères). Il saisit « Pointages à vérifier — possibles oublis de pointage de sortie ». Confirme. La ligne passe à « Refusée » (badge rouge) avec la note visible au survol. Carol reçoit une notification `TIMESHEET_DECIDED` (status REJECTED) avec le motif.

**Why this priority**: Permet au MANAGER de signaler un problème sans figer les heures pour la paie, et de communiquer la raison à l'employé.

**Independent Test**: MANAGER refuse une ligne avec un motif → vérifier `TimesheetApproval(REJECTED, managerNote=...)` créée et une `Notification` en attente pour l'employée.

**Acceptance Scenarios**:

1. **Given** la ligne de Carol avec écart +15h, **When** le MANAGER clique « Refuser » et saisit une raison, **Then** la `TimesheetApproval` est créée avec `status=REJECTED` et `managerNote` non vide.
2. **Given** un refus, **When** la transaction commit, **Then** une `Notification(TIMESHEET_DECIDED)` est créée pour Carol et un email part en post-commit.
3. **Given** une raison vide, **When** le MANAGER tente de confirmer, **Then** message d'erreur « Raison requise pour un refus ».
4. **Given** une raison de 600 caractères, **Then** l'action retourne `MOTIF_TOO_LONG` (limite 500).
5. **Given** une ligne déjà `APPROVED`, **When** le MANAGER clique « Refuser », **Then** la décision est mise à jour (upsert) — `decidedAt` reflète la dernière décision.

---

### User Story 3 - Le MANAGER approuve toute la semaine d'un coup (Priority: P1)

En fin de semaine, le MANAGER constate que toutes les lignes sont normales. Il clique « Approuver tout » en haut de la grille. Un dialog de confirmation s'affiche (« Approuver les X employés en attente pour la semaine du DD/MM ? »). Confirmé, toutes les lignes `PENDING` (ou jamais créées) deviennent `APPROVED` en une seule transaction, chacune avec son snapshot calculé au moment de l'action. Les lignes déjà `APPROVED` ou `REJECTED` ne sont pas touchées.

**Why this priority**: Workflow rapide pour la majorité des semaines sans écart. Critique pour ne pas faire 30 clics par semaine.

**Independent Test**: Avec 5 employés `PENDING` + 1 déjà `REJECTED`, cliquer « Approuver tout » → vérifier que 5 nouvelles approbations `APPROVED` sont créées et la ligne `REJECTED` reste inchangée.

**Acceptance Scenarios**:

1. **Given** 8 employés sans approbation pour la semaine, **When** le MANAGER clique « Approuver tout », **Then** 8 `TimesheetApproval(APPROVED)` sont créées en une transaction.
2. **Given** 3 lignes `PENDING` + 2 `APPROVED` + 1 `REJECTED`, **When** « Approuver tout » est cliqué, **Then** seules les 3 `PENDING` passent à `APPROVED` ; les 2 `APPROVED` et le `REJECTED` restent inchangés.
3. **Given** la transaction bulk, **When** un employé n'a aucun pointage ni shift, **Then** sa ligne est quand même approuvée avec snapshots à 0.
4. **Given** la transaction bulk, **Then** N notifications `TIMESHEET_DECIDED` sont créées en `tx`, et N emails sont envoyés en post-commit (try/catch).

---

### User Story 4 - L'export CSV ne retient que les semaines approuvées (Priority: P2)

Sur `/rapports`, le MANAGER coche une case « Heures approuvées uniquement » ou ajoute `?onlyApproved=true` à l'URL d'export. Le CSV téléchargé ne contient que les employés ayant `TimesheetApproval(APPROVED)` couvrant la plage (par approximation : approuvé sur la semaine ISO contenant la plage). Une colonne supplémentaire « Statut approbation » est ajoutée avec la valeur `APPROVED`.

**Why this priority**: Ferme la boucle avec la Phase 23 — la paie ne consomme que des heures officiellement validées.

**Independent Test**: 3 employés ont travaillé sur la semaine. 2 sont `APPROVED`, 1 est `PENDING`. Appeler `/api/reports/csv?onlyApproved=true&startDate=...` → CSV contient 2 lignes + colonne « Statut approbation = APPROVED ».

**Acceptance Scenarios**:

1. **Given** 3 employés (2 `APPROVED`, 1 `PENDING`) sur la semaine, **When** le CSV est généré avec `onlyApproved=true`, **Then** 2 lignes seulement.
2. **Given** `onlyApproved=true`, **Then** le CSV contient la colonne « Statut approbation » avec valeur `APPROVED` sur chaque ligne.
3. **Given** `onlyApproved=false` (ou absent), **Then** comportement Phase 23 inchangé : toutes les lignes, pas de colonne approbation.
4. **Given** une plage couvrant 2 semaines, **Then** un employé est inclus si AU MOINS une `TimesheetApproval(APPROVED)` existe sur l'une des semaines (logique inclusive).

---

### Edge Cases

- **Semaine non-clôturée (future)** : le MANAGER peut quand même approuver une semaine en cours, mais le bouton « Approuver tout » est désactivé tant que la semaine n'est pas terminée (dimanche 23h59 passé).
- **Snapshot dérive** : si un nouveau pointage est ajouté APRÈS l'approbation, le snapshot ne bouge PAS. La ligne reste `APPROVED` avec les valeurs figées. Une note discrète « Recalculer le snapshot » sera ajoutée en Phase ultérieure.
- **Employé supprimé** : `onDelete: Cascade` sur `employeeId` → l'approbation est supprimée avec l'employé.
- **MANAGER qui décide pour soi-même** : autorisé (un MANAGER peut être planifié et travailler ; il valide alors sa propre ligne).
- **Cross-tenant** : `companyId` filtré à toute lecture/écriture, vérifié par `requireManagerContext()`.
- **Bulk sur 0 ligne `PENDING`** : action no-op, retourne un état `success` sans créer de notifications.
- **Normalisation `weekStart`** : toujours le lundi 00:00 heure locale ; l'action rejette toute valeur qui n'est pas un lundi (`INVALID_WEEK_START`).

## Requirements *(mandatory)*

- **FR-001**: La page `/approbation` MUST être MANAGER-only (proxy + `requireManagerContext()`).
- **FR-002**: La grille MUST afficher, pour la semaine sélectionnée, tous les employés actifs de la company avec : heures prévues (snapshot live), heures travaillées (snapshot live), écart, statut actuel.
- **FR-003**: Le statut affiché MUST être l'un des suivants : « À approuver » (aucune ligne OU status `PENDING`), « Approuvée » (badge vert, `APPROVED`), « Refusée » (badge rouge, `REJECTED`).
- **FR-004**: L'action `decideForEmployee` MUST upserter une `TimesheetApproval` avec snapshot calculé au moment de l'action.
- **FR-005**: L'action `decideForAllPendingInWeek` MUST s'exécuter dans un `$transaction` unique et NE PAS toucher les lignes déjà `APPROVED` ou `REJECTED`.
- **FR-006**: Un refus MUST exiger un `managerNote` non vide (≤ 500 caractères).
- **FR-007**: Chaque décision individuelle MUST émettre une notification `TIMESHEET_DECIDED` à l'employé concerné dans la même transaction, et déclencher un email en post-commit avec try/catch swallow.
- **FR-008**: Le contrainte unique `(companyId, weekStart, employeeId)` MUST garantir une seule ligne d'approbation par employé par semaine.
- **FR-009**: `weekStart` MUST être un lundi normalisé à 00:00 heure locale. Toute valeur invalide → erreur `INVALID_WEEK_START`.
- **FR-010**: Le route handler `/api/reports/csv` MUST accepter `?onlyApproved=true` qui filtre les employés à ceux ayant une `TimesheetApproval(APPROVED)` couvrant la plage.
- **FR-011**: Quand `onlyApproved=true`, le CSV MUST ajouter la colonne « Statut approbation ».
- **FR-012**: Le filtre tenant MUST rester strict — un MANAGER ne peut décider que sur des employés de sa company.
- **FR-013**: Une entrée « Approbation » MUST être ajoutée au `SidebarNav` (MANAGER only, icône `BadgeCheck`).

### Key Entities *(include if feature involves data)*

- **TimesheetApproval** : `id`, `companyId` (FK Company Cascade), `weekStart` (DateTime @db.Date, lundi 00:00 local), `employeeId` (FK User Cascade), `status` (enum `TimesheetApprovalStatus { PENDING, APPROVED, REJECTED }`), `scheduledMinutesSnapshot` (Int), `workedMinutesSnapshot` (Int), `varianceMinutesSnapshot` (Int), `managerNote` (String?, max 500), `decidedByUserId` (FK User SetNull), `decidedAt` (DateTime?), `createdAt`, `updatedAt`. Unique sur `(companyId, weekStart, employeeId)`. Index sur `(companyId, weekStart, status)`.
- **NotificationType** (enum existant étendu) : nouvelle valeur `TIMESHEET_DECIDED` avec payload Zod `{ type: "TIMESHEET_DECIDED", weekStart: string, status: "APPROVED" | "REJECTED", managerNote?: string }`.

## Success Criteria *(mandatory)*

- **SC-001**: Un MANAGER approuve une semaine de 10 employés en moins de 10 secondes via « Approuver tout ».
- **SC-002**: Le snapshot d'une `TimesheetApproval` matche au minute près l'agrégation live de la page `/approbation` au moment de l'approbation.
- **SC-003**: Aucune approbation cross-tenant possible (vérifié par filtre tenant et `requireManagerContext()`).
- **SC-004**: Chaque décision individuelle déclenche une notification in-app visible immédiatement dans la cloche, et un email dans la file Resend.
- **SC-005**: Un CSV `?onlyApproved=true` ne contient AUCUN employé `PENDING` ou `REJECTED` ; la colonne « Statut approbation » est toujours présente.
- **SC-006**: L'unique constraint `(companyId, weekStart, employeeId)` rejette tout doublon au niveau DB.

## Assumptions

- La semaine commence le lundi (convention ISO/locale FR) — pas d'option de configuration dans cette phase.
- Les snapshots sont figés au moment de l'approbation et NE sont PAS recalculés automatiquement si des pointages tardifs arrivent. Recalcul manuel = phase ultérieure.
- Aucune notion de « ré-ouverture » d'une approbation : un `REJECTED` peut être upserté vers `APPROVED` par une nouvelle décision (et inversement).
- Le calcul des minutes prévues/travaillées réutilise `getReportForRange` (Phase 23) restreint à la semaine.
- Pas de workflow d'auto-rappel si une semaine reste `PENDING` (envisagé en Phase ultérieure).
- L'approximation « semaine couvrant la plage » pour le CSV se base sur la semaine ISO contenant `startDate` (et chaque semaine de la plage si plage > 7 jours).

# Feature Specification: Audit log — historique des mutations sensibles

**Feature Branch**: `026-audit-log`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 26 — audit log append-only. Capture toutes les mutations sensibles du système (création/modification/suppression de shifts, publication d'horaire, décisions sur demandes de congé, échanges, claims, annonces, postes de pointage, changements de rôle/désactivation d'employés) dans une table `AuditLog` write-once. Le MANAGER consulte `/audit` : table chronologique avec filtres (action, type d'entité, acteur, plage de dates), pagination cursor-based. Aucune notification, aucun email — c'est silencieux. L'écriture de l'audit se fait DANS la transaction de la mutation originale : si l'audit échoue, la mutation rollback aussi."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Le MANAGER consulte le journal des mutations (Priority: P1)

Le MANAGER ouvre `/audit`. Voit une table chronologique (la plus récente en haut) des mutations capturées : timestamp, acteur (nom dénormalisé), action (ex. `shift.created`), entité (ex. `Shift` avec lien vers la ressource si encore existante), aperçu de la payload. Pagination « Plus anciens → » via curseur `beforeDate`.

**Why this priority**: Sans visualisation, l'audit n'a aucune utilité pour le troubleshooting et la conformité.

**Independent Test**: Connecté en MANAGER, créer 3 shifts puis ouvrir `/audit` → voir 3 lignes `shift.created` triées par `createdAt` desc avec le nom du MANAGER comme acteur.

**Acceptance Scenarios**:

1. **Given** un MANAGER avec 10 mutations capturées dans sa company, **When** il ouvre `/audit`, **Then** il voit les 10 lignes triées par date desc.
2. **Given** un EMPLOYEE, **When** il essaie d'accéder à `/audit`, **Then** redirigé (MANAGER-only).
3. **Given** un MANAGER d'une autre company, **Then** il ne voit aucune entrée tierce.
4. **Given** 80 entrées et une limite de 50 par page, **When** le MANAGER clique « Plus anciens → », **Then** la page suivante charge les 30 entrées restantes via curseur `beforeDate`.
5. **Given** une mutation faite par un utilisateur ensuite supprimé, **Then** la ligne affiche encore le nom dénormalisé (`actorName`) — l'audit survit à la suppression de l'acteur.

---

### User Story 2 - Le MANAGER filtre par action ou type d'entité (Priority: P1)

Le MANAGER veut savoir « qui a supprimé ce shift ? » ou « qui a publié la semaine dernière ? ». Sur `/audit`, il filtre par action (`shift.deleted`) ou type d'entité (`Shift`) et obtient une liste réduite.

**Why this priority**: Sans filtres, parcourir des milliers de lignes est impraticable.

**Independent Test**: Avec des entrées de plusieurs types, filtrer `?action=shift.deleted` → voir uniquement les suppressions de shifts.

**Acceptance Scenarios**:

1. **Given** 50 entrées dont 5 `shift.deleted`, **When** le MANAGER filtre `action=shift.deleted`, **Then** il voit les 5 lignes.
2. **Given** un filtre combiné `entityType=Shift&beforeDate=2026-05-15`, **Then** la table affiche les mutations `Shift` antérieures à cette date.
3. **Given** un filtre sans résultat, **Then** une `EmptyState` française s'affiche (« Aucune entrée pour ces critères »).

---

### User Story 3 - Une mutation déclenche une écriture d'audit dans la même transaction (Priority: P1)

Quand le MANAGER crée un shift via le repo `shift.ts`, une entrée `AuditLog` avec `action='shift.created'` est insérée dans la même `$transaction`. Si l'insert d'audit échoue (cas extrême), toute la transaction rollback — y compris la création du shift.

**Why this priority**: C'est la garantie d'intégrité du journal. Une mutation capturée OU pas du tout, jamais « partiellement loggée ».

**Independent Test**: Créer un shift et vérifier en base qu'une ligne `AuditLog` correspondante existe avec le même `companyId`, `actorUserId`, `entityType='Shift'`, `entityId=<shift.id>`.

**Acceptance Scenarios**:

1. **Given** une création de shift réussie, **Then** une ligne `AuditLog` `shift.created` existe avec `entityId=<shift.id>` et `payload` snapshot du shift.
2. **Given** une publication d'horaire pour la semaine 2026-W23 (12 shifts), **Then** UNE ligne `shift.published` est écrite avec `payload={ weekStart, shiftCount: 12 }`.
3. **Given** un échec simulé d'insert dans `AuditLog`, **Then** la transaction entière rollback — aucun shift créé, aucun log écrit.
4. **Given** une mutation système sans acteur (job cron, hors scope MVP), **Then** `actorUserId` est `null` et `actorName='Système'`.

---

### User Story 4 - Le MANAGER inspecte le détail d'une entrée (Priority: P2)

Cliquer sur une ligne ouvre un panneau (ou expand inline) montrant la payload JSON intégrale, l'IP et le user-agent capturés.

**Why this priority**: Utile pour le forensic, secondaire pour la lecture rapide.

**Independent Test**: Cliquer une ligne `timeoff.decided` → voir `{ requestId, status: 'APPROVED', decidedBy }` rendu lisiblement.

**Acceptance Scenarios**:

1. **Given** une entrée avec payload, **When** le MANAGER clique « Détail », **Then** un bloc affiche la payload formatée (`JSON.stringify(payload, null, 2)`).
2. **Given** une entrée avec `entityId` qui pointe encore vers une ressource existante (ex. un `Shift`), **Then** un lien « Ouvrir » navigue vers la page de la ressource.

---

### Edge Cases

- **Acteur supprimé** : `actorUserId` passe à `null` (FK `SetNull`), mais `actorName` reste lisible car dénormalisé à l'écriture.
- **Entité supprimée après écriture** : `entityId` reste mais le lien « Ouvrir » est masqué si la ressource n'existe plus (best-effort lookup côté UI).
- **Payload trop grosse** : un soft cap de ~1 KB par payload (les helpers ne sérialisent que les champs identifiants + statut). Pas d'enforcement DB, juste discipline côté instrumentation.
- **Pas de UPDATE ni DELETE** : la repo n'expose AUCUNE fonction d'écriture autre que `writeAuditEventInTx` / `writeAuditEvent`. Append-only par convention.
- **Cross-tenant** : filtre `companyId` strict à la lecture comme à l'écriture.
- **Tri stable** : `createdAt desc, id desc` pour gérer les égalités au timestamp.
- **Pagination cursor-based** : `beforeDate` exclusif (`createdAt < beforeDate`) pour éviter le saut de lignes au boundary.
- **IP / User-Agent** : capturés best-effort depuis les headers de la requête au moment de l'action. Vides si non disponibles (ex. depuis un job).

## Requirements *(mandatory)*

- **FR-001**: Une nouvelle entité `AuditLog` MUST être ajoutée avec `companyId`, `actorUserId` (nullable, FK SetNull), `actorName`, `action`, `entityType`, `entityId` (nullable), `payload` (Json nullable), `ipAddress` (nullable), `userAgent` (nullable), `createdAt`.
- **FR-002**: La table `AuditLog` MUST être append-only par convention — la repo n'expose AUCUNE fonction `update` ou `delete`.
- **FR-003**: Le helper `writeAuditEventInTx(tx, input)` MUST être appelé à l'INTÉRIEUR des transactions existantes des mutations suivantes : `shift.created/updated/deleted`, `shift.published`, `announcement.created/deleted`, `timeoff.decided`, `claim.decided`, `swap.decided`, `punchLocation.created/deleted`, `employee.invited/deactivated/role_changed`.
- **FR-004**: Si `writeAuditEventInTx` lève une erreur, la transaction parente MUST rollback (l'audit fait partie intégrante de l'atomicité de la mutation).
- **FR-005**: `actorName` MUST être dénormalisé au moment de l'écriture pour survivre à la suppression de l'utilisateur acteur.
- **FR-006**: La page `/audit` MUST être MANAGER-only et filtrer strictement par `companyId = ctx.companyId`.
- **FR-007**: La page `/audit` MUST supporter les filtres : `action`, `entityType`, `beforeDate` (pagination cursor-based).
- **FR-008**: La pagination MUST utiliser `beforeDate` (exclusif) avec une limite par défaut de 50 lignes par page.
- **FR-009**: Aucune notification ni email MUST être déclenché par l'écriture d'un audit — l'audit est silencieux.
- **FR-010**: Le proxy MUST protéger `/audit` et le sidebar MUST exposer l'entrée « Audit » UNIQUEMENT pour les MANAGER.
- **FR-011**: La payload sérialisée MUST rester un snapshot structuré minimal (~1 KB) — pas de blob de données complètes.

### Key Entities

- **AuditLog** : `id` (cuid), `companyId` (FK Company Cascade), `actorUserId` (FK User SetNull, nullable), `actorName` (String, dénormalisé), `action` (String snake_case, ex. `shift.created`), `entityType` (String, ex. `Shift`), `entityId` (String?, FK logique non contrainte), `payload` (Json?), `ipAddress` (String?), `userAgent` (String?), `createdAt` (DateTime default now). Index : `(companyId, createdAt desc)`, `(companyId, action)`, `(companyId, entityType, entityId)`.

## Success Criteria *(mandatory)*

- **SC-001**: 100 % des mutations listées dans FR-003 produisent une entrée `AuditLog` lors d'un test manuel.
- **SC-002**: La page `/audit` charge 50 lignes en < 300 ms pour une company avec 10 000 entrées historiques (grâce aux index).
- **SC-003**: La suppression d'un utilisateur ne casse aucune entrée d'audit (relation SetNull + `actorName` dénormalisé).
- **SC-004**: Aucun enregistrement cross-tenant n'apparaît dans `/audit` (vérifié par filtre tenant).
- **SC-005**: Une erreur volontaire dans `writeAuditEventInTx` annule la mutation originale (transaction rollback complet).
- **SC-006**: Aucun code applicatif (page, action, route handler) ne peut écrire dans `AuditLog` hors des helpers `writeAuditEventInTx` / `writeAuditEvent`.

## Assumptions

- Pas d'export CSV de l'audit dans cette phase (peut être ajouté ultérieurement en réutilisant `src/lib/csv.ts` de la Phase 23).
- Pas de retention policy automatique — les entrées s'accumulent indéfiniment. Hors scope MVP.
- Pas de signature cryptographique des entrées (hash chain). Append-only « par convention » suffit pour un projet académique.
- Pas de capture IP/UA pour les Server Actions sans accès aux headers (best-effort). Quand disponible, lu depuis `headers()` de `next/headers`.
- Pas de filtre par acteur (`actorUserId`) dans le MVP UI — peut être ajouté plus tard, l'index `(companyId, createdAt desc)` couvre déjà la lecture principale.
- L'instrumentation des actions `team/setRole` et `team/setActive` suppose que ces Server Actions existent déjà. Si elles n'existent pas, la tâche correspondante note la création ou le report.

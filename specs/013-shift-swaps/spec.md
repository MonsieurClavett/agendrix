# Feature Specification: Échanges de shifts entre employés

**Feature Branch**: `013-shift-swaps`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 13 — swap de shifts entre employés. Un EMPLOYEE A propose à un EMPLOYEE B d'échanger un de ses shifts contre un des shifts de B. B accepte ou refuse. Si B accepte, le MANAGER approuve ou refuse la transaction. À l'approbation finale, les `employeeId` des deux shifts sont permutés atomiquement."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - L'employé propose un échange à un collègue (Priority: P1)

Un EMPLOYEE A consulte son calendrier, voit un de ses shifts publiés qui ne lui convient pas (par ex. un mardi soir où il a un empêchement), et choisit « Proposer un échange ». Un dialog s'ouvre : (a) le shift à céder est pré-rempli (le shift sur lequel il a cliqué), (b) il choisit un collègue parmi les autres employés actifs de la company, (c) il choisit en retour un des shifts publiés de ce collègue (idéalement à une date où A est disponible), (d) il ajoute optionnellement un message court (« je peux pas mardi, merci ! »). À la soumission, une `ShiftSwap` est créée avec statut `PENDING_PEER`. Le collègue B reçoit une notification in-app et un email.

**Why this priority**: C'est le point d'entrée du workflow. Sans cette US, rien à accepter ni à approuver.

**Independent Test**: Connecté en EMPLOYEE Bob, ouvrir un de ses shifts du mardi soir, cliquer « Proposer un échange », choisir Carol comme collègue et un de ses shifts du jeudi en retour, soumettre. Vérifier : (a) une `ShiftSwap` existe avec `proposerUserId = Bob`, `targetUserId = Carol`, `proposerShiftId`, `targetShiftId`, `status = PENDING_PEER` ; (b) Carol a une notification `SWAP_PROPOSED` ; (c) le shift de Bob côté calendrier affiche un badge discret « Échange en attente ».

**Acceptance Scenarios**:

1. **Given** Bob avec un shift publié mardi 18h–22h et Carol avec un shift publié jeudi 10h–14h, **When** Bob propose un échange (son mardi contre le jeudi de Carol), **Then** une `ShiftSwap` est créée avec `status = PENDING_PEER` et une notification est envoyée à Carol.
2. **Given** Bob qui essaie d'échanger contre un shift qui n'est PAS publié (DRAFT), **When** il soumet, **Then** le système refuse — seuls les shifts PUBLISHED sont échangeables.
3. **Given** Bob qui propose un échange impliquant son propre shift et un autre de ses propres shifts, **When** il soumet, **Then** le système refuse — on n'échange pas avec soi-même.
4. **Given** un MANAGER qui essaie de proposer un échange depuis le calendrier d'un employé, **When** il ouvre le menu d'un shift, **Then** l'action « Proposer un échange » n'est PAS visible côté MANAGER (l'action appartient à l'employé propriétaire du shift).
5. **Given** Bob qui propose un échange, **When** une `ShiftSwap` PENDING_PEER existe déjà impliquant le même `proposerShiftId`, **Then** le système refuse — un shift ne peut avoir qu'un seul échange en cours.

---

### User Story 2 - Le collègue accepte ou refuse (Priority: P1)

Carol reçoit la notification « Bob souhaite échanger son shift mardi 18h–22h contre votre shift jeudi 10h–14h. Voulez-vous accepter ? ». Elle ouvre une page « Mes échanges » (ou la notification elle-même la mène au dialog) où elle voit les détails. Elle clique « Accepter » ou « Refuser ». Si elle accepte, le statut passe à `PENDING_MANAGER` et les MANAGERs de la company reçoivent une notification. Si elle refuse (avec une raison optionnelle), le statut passe à `REJECTED_BY_PEER` et Bob reçoit une notification de refus.

**Why this priority**: C'est la moitié manquante du workflow employé-employé. Sans cette US, les propositions restent en attente indéfiniment.

**Independent Test**: Avec une `ShiftSwap` PENDING_PEER, se connecter en Carol, ouvrir « Mes échanges », cliquer « Accepter ». Vérifier : (a) `status = PENDING_MANAGER` et `peerDecidedAt` est rempli, (b) tous les MANAGERs de la company reçoivent une notification `SWAP_AWAITING_MANAGER`, (c) Bob reçoit une notification `SWAP_ACCEPTED_BY_PEER`. Réessayer avec un autre swap : cliquer « Refuser » → `status = REJECTED_BY_PEER`, Bob reçoit `SWAP_REJECTED_BY_PEER`.

**Acceptance Scenarios**:

1. **Given** une `ShiftSwap` PENDING_PEER avec Carol comme cible, **When** Carol clique « Accepter », **Then** `status = PENDING_MANAGER`, `peerDecidedAt = now`, et au moins un MANAGER de la company reçoit une notification.
2. **Given** la même swap, **When** Carol clique « Refuser » et saisit « impossible ce jour-là », **Then** `status = REJECTED_BY_PEER`, `peerDecidedAt = now`, `peerRejectionReason = "impossible ce jour-là"`, Bob reçoit une notification.
3. **Given** Bob qui essaie d'accepter sa propre proposition (lui-même comme target par bug), **When** la requête arrive, **Then** le système refuse — seul `targetUserId` peut décider à cette étape.
4. **Given** un EMPLOYEE C non concerné, **When** il essaie de prendre une décision sur la swap, **Then** refusé.
5. **Given** une `ShiftSwap` déjà PENDING_MANAGER, **When** Carol clique encore « Accepter », **Then** refusé — la décision peer est terminale à ce statut.

---

### User Story 3 - Le MANAGER approuve ou refuse l'échange (Priority: P1)

Un MANAGER consulte sa page « Échanges à approuver » (sur `/team` ou une nouvelle section `/echanges`) et voit la swap PENDING_MANAGER avec les détails : qui propose, contre qui, quels shifts. Il clique « Approuver » ou « Refuser ». À l'approbation, en une transaction atomique : (a) les `employeeId` des deux shifts sont permutés, (b) le statut passe à `APPROVED`, (c) `managerDecidedAt` et `managerDecidedByUserId` sont remplis. Au refus, le statut passe à `REJECTED_BY_MANAGER` et les deux employés reçoivent une notification.

**Why this priority**: C'est la fermeture du workflow. Sans cette US, les swaps acceptées par le peer restent indéfiniment en attente côté MANAGER.

**Independent Test**: Avec une `ShiftSwap` PENDING_MANAGER, connecté en MANAGER Alice, ouvrir « Échanges à approuver », cliquer « Approuver ». Vérifier : (a) le shift de Bob a maintenant `employeeId = Carol.id`, (b) le shift de Carol a maintenant `employeeId = Bob.id`, (c) `status = APPROVED`, (d) Bob et Carol reçoivent chacun une notification `SWAP_APPROVED`. Réessayer un autre swap avec « Refuser » → `status = REJECTED_BY_MANAGER`, deux notifications `SWAP_REJECTED_BY_MANAGER`.

**Acceptance Scenarios**:

1. **Given** une `ShiftSwap` PENDING_MANAGER, **When** Alice approuve, **Then** les `employeeId` des deux shifts sont permutés en une seule transaction, `status = APPROVED`, Bob et Carol reçoivent une notification.
2. **Given** la même swap, **When** Alice refuse avec une raison « surcharge ce jour-là », **Then** les shifts restent intacts, `status = REJECTED_BY_MANAGER`, `managerRejectionReason = "surcharge ce jour-là"`, Bob et Carol notifiés.
3. **Given** une swap où l'un des deux shifts a entre-temps été supprimé, **When** Alice essaie d'approuver, **Then** le système refuse avec une erreur explicite, le statut reste PENDING_MANAGER, aucune permutation n'a lieu.
4. **Given** une swap où l'un des deux shifts a déjà été échangé via une autre swap (overlap entre swaps), **When** Alice approuve la deuxième swap, **Then** le système re-vérifie les `employeeId` actuels avant la permutation et refuse si incohérent (« cet échange n'est plus valide »).
5. **Given** une swap qui résulterait en un chevauchement temporel pour l'un des deux employés (par ex. Carol aurait déjà un autre shift au moment du shift de Bob qu'elle reprendrait), **When** Alice approuve, **Then** le système refuse avec `ASSIGNEE_OVERLAP` — pas de double-booking.

---

### User Story 4 - L'utilisateur consulte et annule ses échanges en cours (Priority: P2)

Tout utilisateur peut consulter une page `/echanges` qui montre : (a) les swaps que je propose (statuts PENDING_PEER, PENDING_MANAGER, APPROVED, REJECTED_*), (b) les swaps où je suis le peer cible, (c) si MANAGER, les swaps PENDING_MANAGER de la company à approuver. Un propositeur PEUT canceller sa propre swap tant qu'elle est PENDING_PEER ou PENDING_MANAGER (statut → CANCELED_BY_PROPOSER). Un peer PEUT canceller sa décision PENDING_PEER (équivalent à refuser).

**Why this priority**: Confort opérationnel. Sans cette US, US1+US2+US3 fonctionnent mais on n'a pas de vue d'ensemble — l'utilisateur ne peut pas suivre l'état de ses propositions. P2 car l'historique est consultable via les notifications, mais une vraie page rend la chose lisible.

**Independent Test**: Bob a 3 swaps en cours : 1 PENDING_PEER, 1 PENDING_MANAGER, 1 APPROVED. Carol a 1 swap où elle est target (PENDING_PEER). Alice est MANAGER. Chacun consulte `/echanges` et voit la bonne vue.

**Acceptance Scenarios**:

1. **Given** Bob avec 3 swaps, **When** il ouvre `/echanges`, **Then** il voit les 3 sous la section « Mes propositions » avec leurs statuts.
2. **Given** Carol avec 1 swap PENDING_PEER, **When** elle ouvre `/echanges`, **Then** elle voit la swap sous « En attente de ma décision » avec boutons Accepter / Refuser.
3. **Given** Alice MANAGER avec 2 swaps PENDING_MANAGER de la company, **When** elle ouvre `/echanges`, **Then** elle voit les 2 sous « En attente d'approbation » avec boutons Approuver / Refuser.
4. **Given** Bob avec une swap PENDING_PEER qu'il a proposée, **When** il clique « Annuler ma proposition », **Then** `status = CANCELED_BY_PROPOSER`, plus visible aux autres utilisateurs sauf à lui en historique.
5. **Given** un MANAGER d'une autre company, **When** il consulte `/echanges`, **Then** aucune swap d'une company tierce n'apparaît.

---

### Edge Cases

- **Suppression d'un shift impliqué dans une swap PENDING_*** : la swap passe automatiquement en `INVALID` à la lecture (calculé) — le MANAGER ne peut plus l'approuver. Aucun nettoyage automatique en base dans cette phase.
- **Suppression de l'EMPLOYEE proposeur ou cible** : les swaps en cascade (CASCADE sur les FKs).
- **Approval pendant que le proposeur cancelle en parallèle** : la transaction du MANAGER re-vérifie le statut avant la permutation et échoue avec un message clair.
- **Bob propose à Carol, Carol accepte, mais entre-temps Alice (autre MANAGER) supprime un des shifts** : Alice ne pourra pas approuver — error « shift introuvable ».
- **Bob propose un échange impliquant un shift hors-disponibilité de Carol** : autorisé, mais un soft warning apparaît dans la dialog d'acceptation côté Carol (similaire au warning hors-dispo de Phase 6).
- **Carol décide alors qu'un de ses congés APPROVED couvre le shift qu'elle prendrait** : autorisé, mais soft warning visuel similaire au marker Phase 7. Le MANAGER verra le double warning au moment d'approuver.
- **Drag-and-drop d'un shift impliqué dans une swap PENDING_*** : autorisé techniquement, mais le shift bouge — la swap reste pointée sur le `shiftId`, donc la date et l'heure stockées dans le payload de notification peuvent devenir périmées. La swap reste valide tant que les `employeeId` actuels matchent l'attendu ; sinon `INVALID`.
- **Cross-tenant** : un employé d'une autre company ne peut jamais être désigné comme target — la liste de collègues est filtrée par `companyId`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Un EMPLOYEE MUST pouvoir créer une `ShiftSwap` proposant d'échanger un de SES shifts PUBLISHED contre le shift PUBLISHED d'un autre employé actif de la même company.
- **FR-002**: Le système MUST refuser une proposition où `proposerUserId === targetUserId` (auto-échange).
- **FR-003**: Le système MUST refuser une proposition où l'un des deux shifts n'est pas PUBLISHED, ou n'appartient pas à la company de l'EMPLOYEE proposeur.
- **FR-004**: Le système MUST refuser une seconde swap PENDING_PEER ou PENDING_MANAGER impliquant un shift déjà engagé dans une swap active.
- **FR-005**: À la création d'une swap, le système MUST notifier l'utilisateur cible (notification in-app + email via Phase 11).
- **FR-006**: Un EMPLOYEE cible MUST pouvoir accepter ou refuser une swap PENDING_PEER qui lui est destinée. Cette décision MUST transitionner le statut à PENDING_MANAGER (accept) ou REJECTED_BY_PEER (reject).
- **FR-007**: À l'acceptation par le peer, le système MUST notifier tous les MANAGERs actifs de la company. À la décision peer (accept ou reject), le système MUST notifier le proposeur.
- **FR-008**: Un MANAGER MUST pouvoir approuver ou refuser une swap PENDING_MANAGER. À l'approbation, en une transaction atomique : (a) re-vérifier que les deux shifts existent et appartiennent toujours aux employés attendus, (b) re-vérifier qu'aucun chevauchement temporel n'est créé pour les deux employés, (c) permuter les `employeeId` des deux shifts, (d) passer le statut à APPROVED avec `managerDecidedAt` et `managerDecidedByUserId`.
- **FR-009**: Au refus du MANAGER, le statut passe à REJECTED_BY_MANAGER avec `managerDecidedAt`, `managerDecidedByUserId`, et `managerRejectionReason` optionnel.
- **FR-010**: À la décision MANAGER (accept ou reject), le système MUST notifier le proposeur ET le peer.
- **FR-011**: Le proposeur MUST pouvoir canceller sa propre swap tant qu'elle est PENDING_PEER ou PENDING_MANAGER. Le statut passe à CANCELED_BY_PROPOSER.
- **FR-012**: Un utilisateur MUST NOT pouvoir lire, modifier, accepter, refuser, approuver ou canceller une swap où il n'est ni le proposeur, ni le peer, ni un MANAGER de la company. Cross-tenant refusé par défaut.
- **FR-013**: Une page `/echanges` MUST être accessible à tout utilisateur authentifié, montrant trois sections : « Mes propositions », « En attente de ma décision » (peer view), et — si MANAGER — « À approuver ».
- **FR-014**: Sur le calendrier des shifts, un shift impliqué dans une swap PENDING_* MUST afficher un indicateur visuel discret (par exemple un petit badge « Échange » dans le coin).
- **FR-015**: La suppression d'un shift impliqué dans une swap PENDING_* ne casse pas la base mais rend la swap non-approuvable. La swap est cliquée comme « invalide » dans l'UI.
- **FR-016**: La suppression d'un utilisateur (proposeur, peer ou décideur MANAGER) MUST entraîner la suppression de ses swaps en cascade (proposer/peer) ou mettre le décideur à NULL (manager).

### Key Entities *(include if feature involves data)*

- **ShiftSwap** : Représente une demande d'échange de deux shifts entre deux employés.
  - Attributs : `companyId` (tenant key), `proposerUserId`, `proposerShiftId`, `targetUserId`, `targetShiftId`, `proposerMessage` (string?, max 280 chars), `status` (enum), `peerDecidedAt`, `peerRejectionReason` (string?, max 280), `managerDecidedAt`, `managerDecidedByUserId`, `managerRejectionReason` (string?, max 280), `createdAt`, `updatedAt`.
  - Contraintes : `proposerUserId !== targetUserId`. Unique sur `(proposerShiftId)` quand status est PENDING_PEER ou PENDING_MANAGER (un shift ne peut être engagé que dans une swap active). Idem sur `(targetShiftId)`.
  - Relations : `Company` (CASCADE), `proposerUser` (CASCADE), `targetUser` (CASCADE), `proposerShift` (CASCADE), `targetShift` (CASCADE), `managerDecidedBy` (SET NULL).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un EMPLOYEE peut proposer un échange en moins de 60 secondes (ouvrir un shift → choisir un collègue → choisir un shift → soumettre).
- **SC-002**: L'acceptation par le peer puis l'approbation du MANAGER se font en moins de 5 secondes côté serveur cumulé (deux transactions séparées).
- **SC-003**: 100 % des échanges approuvés permutent atomiquement les deux `employeeId` — aucun état intermédiaire visible où un seul shift a changé.
- **SC-004**: 0 fuite cross-tenant : un EMPLOYEE de la company A ne peut jamais ni voir ni cibler un EMPLOYEE de la company B dans une swap.
- **SC-005**: 0 chevauchement temporel créé par une approbation — la re-vérification d'overlap au moment de la permutation rejette tout double-booking.
- **SC-006**: Chaque transition d'état génère exactement une notification par destinataire concerné (1 pour proposer→peer, 1 pour peer→proposeur, N pour peer accept→MANAGERs, 2 pour manager decide→both employees).

## Assumptions

- **Échange shift-contre-shift uniquement** : pas de don de shift (« je te donne mon shift sans rien en retour »). Hors-scope pour Phase 13 ; réutilisera la Phase 9 (open shifts) éventuellement.
- **Pas de groupes d'échange** (3+ employés en rotation). Strictement bilatéral.
- **Pas de modification d'un shift après approbation** : le shift, désormais celui de B, suit le cycle normal (DnD, suppression…). Aucun lien historique conservé qui indique « ce shift vient d'un échange ».
- **Pas de relance automatique** quand un peer ne répond pas pendant N jours. Le proposeur peut canceller manuellement.
- **Pas d'auto-approbation** par le MANAGER (par exemple, accepter automatiquement si Bob et Carol sont tous deux disponibles et sans conflit). Le MANAGER doit toujours valider.
- **Notifications utilisent l'infrastructure Phase 11** : `NotificationType` est étendu avec 4 nouveaux types (`SWAP_PROPOSED`, `SWAP_ACCEPTED_BY_PEER`, `SWAP_REJECTED_BY_PEER`, `SWAP_DECIDED_BY_MANAGER`). Chaque type a un payload typé via Zod.
- **Pas de réutilisation du DnD** pour proposer un échange — le DnD côté MANAGER continue de fonctionner normalement (réassignation directe). L'échange est strictement un workflow EMPLOYEE → EMPLOYEE → MANAGER.
- **Le proposeur ne reçoit PAS de notification quand sa propre swap est créée** (il vient de la créer). Cohérent avec les autres phases.
- L'invariant tenant et la séparation MANAGER/EMPLOYEE des phases précédentes s'appliquent intégralement.

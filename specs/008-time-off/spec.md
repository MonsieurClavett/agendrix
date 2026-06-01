# Feature Specification: Congés ponctuels

**Feature Branch**: `008-time-off`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 7 — congés ponctuels. Un EMPLOYEE soumet des demandes d'absence sur des plages de dates (vacances, jour férié personnel, maladie), un MANAGER les APPROVE ou REJECT, et le calendrier hebdomadaire affiche les jours absents en overlay. Soft warning sur tout shift placé un jour de congé APPROVED."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Un employé soumet une demande de congé (Priority: P1)

Un EMPLOYEE va sur la page « Congés », clique sur « Nouvelle demande », saisit une date de début, une date de fin (toutes deux inclusives), choisit un type (Payé, Non payé, Maladie), ajoute optionnellement une raison (jusqu'à 280 caractères), puis soumet. La demande apparaît immédiatement dans sa liste avec le statut « En attente ». Tant qu'elle est en attente, il peut la supprimer (= la canceller).

**Why this priority**: Sans cette capacité de base, aucune des autres fonctionnalités de la phase (approbation, overlay calendrier, warning) n'a de sens. C'est le point d'entrée du workflow.

**Independent Test**: Connecté en EMPLOYEE, naviguer vers `/conges`, soumettre une demande pour le 15–22 juillet 2026 type « Payé », puis vérifier qu'elle apparaît avec badge « En attente ». La supprimer. Elle disparaît. Aucune fuite vers un autre tenant.

**Acceptance Scenarios**:

1. **Given** un employé sans demande, **When** il crée « 15–22 juillet 2026 / Payé », **Then** la demande est créée avec statut PENDING et apparaît dans sa liste.
2. **Given** un employé qui a déjà une demande PENDING « 10–14 juillet 2026 », **When** il tente d'en créer une autre « 12–18 juillet 2026 », **Then** le système refuse avec un message expliquant le chevauchement avec sa demande existante.
3. **Given** une demande PENDING « 15–22 juillet », **When** l'employé clique sur « Annuler », **Then** la demande est supprimée et disparaît de sa liste.
4. **Given** une demande APPROVED, **When** l'employé essaie de la supprimer, **Then** le bouton « Annuler » n'est pas disponible (il doit demander à son MANAGER de la modifier).

---

### User Story 2 - Le MANAGER approuve ou refuse les demandes (Priority: P2)

Un MANAGER va sur la page « Congés » et voit deux onglets : « À approuver » (toutes les demandes PENDING de tous les employés de sa company) et « Historique » (les demandes APPROVED et REJECTED). Sur l'onglet « À approuver », chaque demande affiche le nom de l'employé, les dates, le type, la raison, et deux boutons : « Approuver » et « Refuser ». À l'approbation, la demande passe en APPROVED. Au refus, la demande passe en REJECTED.

**Why this priority**: Sans cette US, les demandes restent indéfiniment PENDING — le workflow ne se ferme pas. C'est la pièce qui rend la fonctionnalité opérationnelle.

**Independent Test**: Avec un employé ayant soumis une demande PENDING, se connecter en MANAGER, ouvrir « À approuver », cliquer sur « Approuver », vérifier que la demande disparaît de « À approuver » et apparaît dans « Historique » avec badge APPROVED. Refuser une autre demande, vérifier qu'elle apparaît aussi dans « Historique » avec badge REJECTED.

**Acceptance Scenarios**:

1. **Given** une demande PENDING d'un employé de la company, **When** le MANAGER clique « Approuver », **Then** la demande passe en APPROVED, son `decidedAt` et `decidedByUserId` sont enregistrés, et elle disparaît de la liste « À approuver ».
2. **Given** la même demande, **When** le MANAGER clique « Refuser », **Then** la demande passe en REJECTED avec les mêmes champs de décision enregistrés.
3. **Given** un MANAGER de la company A, **When** il consulte « À approuver », **Then** aucune demande appartenant à un employé de la company B n'apparaît.
4. **Given** une demande APPROVED qui chevauche temporellement, **When** un autre employé soumet une demande sur les mêmes dates, **Then** la nouvelle demande est créée (les chevauchements inter-employés sont autorisés).

---

### User Story 3 - Le calendrier signale les jours de congé (Priority: P3)

Sur le calendrier hebdomadaire des shifts, chaque cellule (jour × employé en mode « Gérer par Employé ») dont la date tombe dans une demande APPROVED de cet employé est rendue visuellement distinctive : fond très pâle + bordure pointillée + petite étiquette « Congé » discrète. Les cellules dont la date tombe dans une demande PENDING reçoivent un traitement plus léger encore (fond légèrement teinté + point d'interrogation). Quand un shift est tout de même placé un jour APPROVED, sa carte affiche un marqueur d'avertissement supplémentaire (icône d'absence orange) — sans bloquer la création ou le déplacement.

**Why this priority**: Cette US transforme la donnée en signal visuel pour le MANAGER. Sans elle, les approbations sont stockées en base mais invisibles dans l'outil de planification — l'utilité opérationnelle s'effondre. Elle est P3 car le workflow de demande/approbation (US1+US2) reste fonctionnel sans, mais sans US3 le MANAGER ne « voit » pas les congés en planifiant.

**Independent Test**: Avec un employé ayant une demande APPROVED « 15–17 juillet 2026 », un MANAGER ouvre le calendrier de la semaine du 13 juillet. Les cellules des 15, 16, 17 juillet de cet employé sont rendues avec le traitement « congé approuvé ». Il crée un shift le 16 juillet pour cet employé : la carte du shift montre un marqueur d'absence. Il déplace ce shift au 14 juillet (hors congé) : le marqueur disparaît.

**Acceptance Scenarios**:

1. **Given** un employé avec demande APPROVED « 15–17 juillet », **When** le MANAGER affiche la semaine du 13 juillet, **Then** les cellules de cet employé pour 15, 16, 17 juillet apparaissent visuellement distinctes (fond pâle + bordure pointillée).
2. **Given** le même employé et un shift le 16 juillet, **When** le MANAGER affiche le calendrier, **Then** la carte du shift affiche un marqueur d'absence en plus de tout autre marqueur (par ex. hors-disponibilité de la Phase 6).
3. **Given** un employé avec demande PENDING « 20–22 juillet », **When** le MANAGER affiche la semaine du 20 juillet, **Then** les cellules concernées reçoivent un traitement plus léger (fond légèrement teinté + point d'interrogation), distinct de l'APPROVED.
4. **Given** un shift sur un jour APPROVED, **When** le MANAGER le déplace par drag-and-drop sur un jour libre du même employé, **Then** le marqueur d'absence disparaît immédiatement.
5. **Given** un shift sur un jour APPROVED de l'employé A, **When** le MANAGER le déplace sur l'employé B (qui n'a pas de congé ce jour), **Then** le marqueur d'absence disparaît.

---

### Edge Cases

- **Demande sur une seule journée** : `startDate === endDate` est autorisé (équivaut à un jour de congé).
- **Demande qui chevauche une demande REJECTED du même employé** : autorisée (les REJECTED ne bloquent rien).
- **Demande qui chevauche un APPROVED ou un PENDING du même employé** : refusée à la création (statut conflictuel).
- **Demande dans le passé** : autorisée (utile pour enregistrer rétroactivement une absence maladie déjà prise).
- **Plage extrêmement longue** (par ex. 1 an entier) : autorisée. Aucune limite max imposée dans cette phase.
- **Suppression d'un employé** : ses demandes sont supprimées en cascade.
- **MANAGER décide sur sa propre demande** : autorisée (un MANAGER peut s'auto-approuver — c'est une décision produit assumée pour le MVP solo).
- **Shift sur un jour PENDING** : aucun warning visuel sur la carte (le shift est légitime tant que la demande n'est pas approuvée). Le warning ne s'active que sur APPROVED.
- **Drag-and-drop d'un shift sur un jour APPROVED** : autorisé (soft warning), pas de blocage.
- **Suppression d'une demande APPROVED** (MANAGER) : permise — l'overlay et tout warning associé disparaissent immédiatement.
- **Modification d'une demande APPROVED par le MANAGER** (par ex. raccourcir la plage) : permise via la même interaction qu'une nouvelle décision.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Un employé MUST pouvoir créer une demande de congé pour une plage `[startDate, endDate]` (inclusive aux deux bornes) sur des dates entières, en choisissant un type parmi PAID, UNPAID, SICK, et en ajoutant optionnellement une raison de 280 caractères ou moins.
- **FR-002**: Le système MUST refuser la création d'une demande dont la plage chevauche une autre demande PENDING ou APPROVED du même employé, et expliciter le conflit dans le message d'erreur.
- **FR-003**: Le système MUST autoriser le chevauchement temporel entre demandes de plusieurs employés distincts.
- **FR-004**: Une demande nouvellement créée MUST avoir le statut PENDING.
- **FR-005**: Un employé MUST pouvoir supprimer une demande PENDING qui lui appartient. Il MUST NOT pouvoir supprimer une demande APPROVED ou REJECTED.
- **FR-006**: Un MANAGER MUST pouvoir consulter toutes les demandes de sa company, séparées en deux onglets : (a) « À approuver » pour les PENDING ; (b) « Historique » pour les APPROVED + REJECTED.
- **FR-007**: Un MANAGER MUST pouvoir APPROVE ou REJECT une demande PENDING. À la décision, le système MUST enregistrer la date de décision et l'identifiant du MANAGER décideur.
- **FR-008**: Un MANAGER MUST pouvoir modifier ou supprimer n'importe quelle demande de sa company, indépendamment de son statut.
- **FR-009**: Un EMPLOYEE MUST NOT pouvoir lire, modifier ou supprimer une demande qui ne lui appartient pas, qu'il soit ou non dans la même company.
- **FR-010**: Aucun utilisateur (MANAGER ou EMPLOYEE) MUST pouvoir accéder à une demande appartenant à une autre company sous quelque forme que ce soit.
- **FR-011**: Sur le calendrier hebdomadaire, chaque cellule (jour × employé en mode « Gérer par Employé ») MUST recevoir un traitement visuel distinctif :
  (a) « congé approuvé » (fond pâle + bordure pointillée + étiquette discrète) si la date tombe dans une demande APPROVED de cet employé ;
  (b) « congé en attente » (fond légèrement teinté + point d'interrogation) si elle tombe dans une demande PENDING ;
  (c) aucun traitement spécial sinon.
- **FR-012**: Chaque carte de shift MUST afficher un marqueur d'avertissement supplémentaire (icône d'absence) si la date locale du shift tombe dans une demande APPROVED de l'employé assigné.
- **FR-013**: Le marqueur d'absence MUST coexister avec les autres marqueurs (par exemple le marqueur hors-disponibilité de la Phase 6) sans en remplacer aucun.
- **FR-014**: Le marqueur d'absence MUST NOT empêcher la création, la modification, le déplacement ou la suppression d'un shift.
- **FR-015**: Lors d'un déplacement de shift par drag-and-drop (changement de date ou d'employé), le marqueur d'absence MUST être recalculé immédiatement en fonction de la nouvelle date et du nouvel employé.
- **FR-016**: La suppression d'un employé MUST entraîner la suppression de toutes ses demandes de congé.
- **FR-017**: La page de gestion des congés MUST être accessible à tout utilisateur authentifié sous un chemin dédié (par convention `/conges`).

### Key Entities *(include if feature involves data)*

- **TimeOffRequest** : Représente une demande d'absence sur une plage de dates.
  - Attributs : entreprise propriétaire, employé demandeur, date de début (inclusive), date de fin (inclusive), type (PAID / UNPAID / SICK), raison textuelle optionnelle, statut (PENDING / APPROVED / REJECTED), date de décision (nullable), identifiant du MANAGER décideur (nullable).
  - Contraintes : `endDate >= startDate` ; pas de chevauchement avec une autre demande PENDING ou APPROVED du même employé ; les transitions de statut autorisées sont uniquement PENDING → APPROVED ou PENDING → REJECTED (puis libre suppression / modification par un MANAGER).
  - Relations : appartient à une `Company` ; appartient à un `User` (demandeur). Supprimée en cascade lors de la suppression du demandeur.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un employé peut soumettre sa première demande de congé en moins de 60 secondes à partir du moment où il arrive sur la page dédiée.
- **SC-002**: Sur un onglet « À approuver » contenant 10 demandes, un MANAGER peut approuver une demande spécifique en moins de 5 secondes (lecture, clic).
- **SC-003**: Sur le calendrier hebdomadaire d'une équipe de 10 employés, un MANAGER peut identifier visuellement un shift placé un jour de congé approuvé en moins de 3 secondes.
- **SC-004**: 100 % des opérations de création, modification ou déplacement de shift réussissent même quand la date tombe sur un congé APPROVED de l'employé concerné (le warning ne bloque rien).
- **SC-005**: 0 fuite cross-tenant : un EMPLOYEE ou MANAGER de l'entreprise A ne peut jamais voir, lire ou modifier une demande appartenant à un utilisateur de l'entreprise B.
- **SC-006**: 0 demande en base avec `endDate < startDate` ou avec chevauchement (en PENDING ou APPROVED) entre deux demandes d'un même employé (invariant tenu de bout en bout).

## Assumptions

- **Granularité journée entière uniquement**. Les demandes portent sur des dates complètes ; les demi-journées (matin/après-midi) et les heures précises sont hors-scope.
- **Trois types fixes** : PAID, UNPAID, SICK. Pas de configuration par entreprise dans cette phase.
- **Aucune notion de solde de congés** (« il vous reste 12 jours ») ni de politique d'entreprise (« max 5 jours consécutifs »). Pure gestion de demandes individuelles.
- **Aucune notification** (email, push, in-app toast persistant) n'est envoyée lors d'une création, approbation ou refus. Le système est passif : l'employé vérifie son statut en visitant la page.
- **Pas de vue calendrier annuelle dédiée aux congés** dans cette phase. La seule représentation visuelle est l'overlay sur le calendrier hebdomadaire des shifts existant.
- **Pas de récurrence** (« congés tous les vendredis »). Une demande = une plage continue de dates.
- **Pas de workflow d'escalade**. Un seul niveau d'approbation : MANAGER décide, c'est final (jusqu'à ce qu'il modifie ou supprime).
- **L'historique d'audit** (qui a décidé, quand) est porté par `decidedAt` et `decidedByUserId` directement sur la demande. Pas de table d'audit séparée.
- L'invariant tenant et la séparation MANAGER/EMPLOYEE déjà établis par les phases précédentes (helpers centraux de session, repositories scopés par `companyId`) s'appliquent intégralement à cette feature, sans exception ni dérogation.
- Le drag-and-drop existant (Phase 4) et l'overlay de disponibilités (Phase 6) continuent de fonctionner inchangés ; le nouveau marqueur d'absence s'ajoute aux marqueurs existants.

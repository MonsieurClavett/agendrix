# Feature Specification: Quarts à combler (open shifts)

**Feature Branch**: `010-open-shifts`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 9 — quarts à combler. Un MANAGER peut créer un shift sans assigner d'employé (employeeId nullable). Les EMPLOYEEs voient une liste « Quarts à combler » et peuvent réclamer un shift libre, ce qui crée une demande PENDING. Le MANAGER approuve ou refuse ; à l'approbation, le shift est attribué à l'employé."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Le MANAGER crée un quart à combler (Priority: P1)

Un MANAGER, en planifiant la semaine, sait qu'un quart doit être travaillé mais ne sait pas encore qui l'occupera. Il crée le shift sans choisir d'employé (option « Quart à combler ») : date, heures, position, note. Le shift est créé sans `employeeId` et apparaît immédiatement (a) sur la vue calendrier du MANAGER comme un quart sans titulaire, dans une rangée dédiée « Quarts à combler » ou avec un visuel distinct (icône utilisateur barré, fond hachuré), et (b) sur la liste « Quarts à combler » de tous les EMPLOYEEs de la company qui peuvent voir ce shift (visible une fois PUBLISHED — la phase 8 reste en vigueur).

**Why this priority**: Sans cette capacité de création, il n'y a rien à réclamer ni à approuver. C'est la fondation.

**Independent Test**: MANAGER va sur `/schedules`, clique « Nouveau shift », ne sélectionne pas d'employé (option « Quart à combler »), saisit une date, des heures et une position. Sauvegarde. Le shift apparaît dans une rangée séparée du calendrier MANAGER avec un visuel distinct. Si déjà publié, il apparaît sur la page `/quarts-a-combler` des EMPLOYEEs.

**Acceptance Scenarios**:

1. **Given** un MANAGER sur `/schedules`, **When** il crée un shift sans employé assigné, **Then** le shift est créé avec `employeeId = null` et status DRAFT par défaut.
2. **Given** le calendrier MANAGER, **When** des quarts à combler existent pour la semaine affichée, **Then** ils apparaissent dans une rangée dédiée (« Quarts à combler ») séparée des rangées par employé.
3. **Given** un quart à combler PUBLISHED, **When** un EMPLOYEE consulte sa page dédiée, **Then** il voit le quart avec date, heures, position.
4. **Given** un quart à combler DRAFT, **When** un EMPLOYEE consulte sa page dédiée, **Then** il ne voit pas ce quart (la règle de phase 8 s'applique).
5. **Given** un quart à combler, **When** le MANAGER l'édite, **Then** il peut le modifier ou le supprimer comme tout autre shift.

---

### User Story 2 - Un EMPLOYEE réclame un quart à combler (Priority: P2)

Un EMPLOYEE voit la liste des quarts à combler de sa company (PUBLISHED uniquement). Il clique « Je veux ce quart », confirme dans un dialog. Cela crée une demande (ShiftClaim) en statut PENDING attachée à ce shift et à cet employé. L'EMPLOYEE peut voir l'état de ses demandes dans la même liste (badge « Demande envoyée »). Tant que la demande est PENDING, l'EMPLOYEE peut la canceller.

**Why this priority**: Sans cette US, les quarts à combler restent statiquement à combler sans interaction des EMPLOYEEs. C'est le côté EMPLOYEE du workflow.

**Independent Test**: EMPLOYEE va sur `/quarts-a-combler`, voit un quart visible, clique « Je veux ce quart », confirme. Le quart affiche désormais un badge « Demande envoyée ». Une nouvelle demande PENDING existe en base, attachée à lui.

**Acceptance Scenarios**:

1. **Given** un quart à combler PUBLISHED et un EMPLOYEE de la même company, **When** l'EMPLOYEE clique « Je veux ce quart » puis confirme, **Then** une `ShiftClaim` est créée avec `shiftId`, `employeeId = ctx.userId`, `status = PENDING`.
2. **Given** un EMPLOYEE qui a déjà une demande PENDING sur un quart, **When** il essaie d'en créer une seconde sur le même quart, **Then** le système refuse avec un message « Vous avez déjà demandé ce quart ».
3. **Given** une demande PENDING d'un EMPLOYEE, **When** il clique « Annuler ma demande », **Then** la demande est supprimée.
4. **Given** un quart à combler où un autre EMPLOYEE a déjà une demande PENDING, **When** l'EMPLOYEE consulte la liste, **Then** il voit le quart toujours disponible (les demandes des autres ne sont pas affichées à lui), peut soumettre sa propre demande.
5. **Given** un EMPLOYEE qui voit un quart à combler hors de ses disponibilités déclarées, **When** il consulte la carte, **Then** un soft warning visuel apparaît (icône hors-disponibilité) — sans bloquer la demande.

---

### User Story 3 - Le MANAGER attribue le quart à un demandeur (Priority: P2)

Sur le panneau de filtres latéral du calendrier MANAGER, le badge « Quarts à combler » montre le nombre de demandes en attente. Quand le MANAGER clique sur le shift à combler, le dialog d'édition montre la liste des demandeurs (« Demandes : Bob, Carol, David »). Le MANAGER peut sélectionner un demandeur et cliquer « Attribuer à <nom> ». Cela : (a) assigne le shift à cet EMPLOYEE (`employeeId` devient l'id), (b) marque la demande de cet EMPLOYEE comme APPROVED, (c) marque toutes les autres demandes du même shift comme REJECTED. L'opération est atomique.

**Why this priority**: Sans cette US, les demandes restent indéfiniment PENDING. C'est la moitié manquante du workflow et c'est P2 (au même niveau que US2) car les deux côtés du workflow doivent fonctionner ensemble.

**Independent Test**: Avec un quart à combler ayant 2 demandes PENDING (Bob, Carol), MANAGER ouvre le dialog du shift, choisit Bob, clique « Attribuer ». Vérifier : (a) le shift `employeeId = Bob.id`, (b) la demande de Bob → APPROVED, (c) la demande de Carol → REJECTED, (d) le shift n'apparaît plus dans la liste « Quarts à combler » des EMPLOYEEs, (e) Bob voit le shift sur son calendrier.

**Acceptance Scenarios**:

1. **Given** un quart à combler avec 3 demandes PENDING (Bob, Carol, David), **When** le MANAGER attribue à Bob, **Then** `shift.employeeId = Bob.id`, demande de Bob = APPROVED, demandes de Carol et David = REJECTED.
2. **Given** le même shift après attribution, **When** un EMPLOYEE consulte « Quarts à combler », **Then** ce shift n'apparaît plus (il a un employeeId).
3. **Given** le calendrier de Bob, **When** Bob ouvre `/schedules`, **Then** le shift attribué apparaît dans son horaire.
4. **Given** un MANAGER qui crée un quart à combler, n'a aucune demande dessus, **When** il édite le shift, **Then** le bloc « Demandes » affiche « Aucune demande pour le moment ».
5. **Given** un quart à combler attribué par erreur, **When** le MANAGER ré-ouvre le dialog et change l'`employeeId` à null (ou à un autre employé), **Then** le shift est mis à jour comme un shift normal ; les demandes restent en historique (APPROVED/REJECTED ne change pas rétroactivement).

---

### Edge Cases

- **Suppression d'un quart à combler** : permise. Toutes ses demandes sont supprimées en cascade.
- **EMPLOYEE qui essaie de réclamer un shift d'une autre company** : refusé silencieusement (le shift n'apparaît pas dans sa liste).
- **EMPLOYEE qui essaie de réclamer un shift déjà attribué (employeeId non-null)** : refusé avec « Ce quart n'est plus disponible ».
- **MANAGER qui modifie l'`employeeId` d'un shift normal vers `null`** : autorisé — le shift redevient un « quart à combler » (mais ses demandes historiques restent intactes).
- **MANAGER qui supprime un quart pendant qu'un EMPLOYEE crée sa demande** : la demande échoue avec « Quart introuvable » (le shift a été supprimé entre-temps).
- **Drag-and-drop d'un quart à combler** : autorisé — change la date/heure mais garde `employeeId = null` et le shift reste dans la rangée « Quarts à combler ».
- **Chevauchement de demandes** : un EMPLOYEE peut avoir des demandes PENDING sur plusieurs quarts qui se chevauchent temporellement. Le système ne bloque pas — c'est au MANAGER de décider. Au moment de l'attribution, l'overlap check normal de shift s'applique (un EMPLOYEE ne peut pas avoir deux shifts qui se chevauchent en même temps).
- **Un quart à combler avec 0 demande qui dépasse sa date** : aucun comportement particulier — il reste dans la liste « Quarts à combler » jusqu'à ce que le MANAGER le supprime.
- **Warnings hors-dispo et congé** : continuent de s'afficher correctement sur les cartes de quart à combler (sans `employeeId`, ces warnings ne s'appliquent pas — pas d'employé pour comparer ; mais une fois la demande créée, sur la carte côté EMPLOYEE, son propre warning hors-dispo peut être affiché).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le champ `employeeId` du shift MUST devenir nullable. La création d'un shift par un MANAGER MUST autoriser explicitement `employeeId = null`.
- **FR-002**: La modification d'un shift par un MANAGER MUST autoriser le passage de `employeeId` non-null à null (le shift devient à combler) et inversement.
- **FR-003**: La vue calendrier du MANAGER MUST afficher les shifts à `employeeId = null` dans une rangée dédiée séparée des rangées par employé (en mode « Gérer par Employé »), avec un visuel distinctif (icône utilisateur barré ou similaire).
- **FR-004**: Une page dédiée `/quarts-a-combler` accessible à tous les rôles MUST afficher tous les shifts à `employeeId = null`, `status = PUBLISHED` de la company de l'utilisateur (cross-tenant impossible).
- **FR-005**: Un EMPLOYEE MUST pouvoir créer une `ShiftClaim` sur un quart à combler de sa company. La claim contient `shiftId`, `employeeId = ctx.userId`, `status = PENDING`.
- **FR-006**: Le système MUST refuser deux claims du même EMPLOYEE sur le même shift (unique sur `(shiftId, employeeId)`).
- **FR-007**: Le système MUST refuser une claim quand le shift cible a déjà un `employeeId` non-null OU n'existe plus.
- **FR-008**: Un EMPLOYEE MUST pouvoir canceller sa propre claim PENDING (= supprimer).
- **FR-009**: Un MANAGER MUST pouvoir voir la liste des claims PENDING d'un quart à combler dans le dialog d'édition de ce quart.
- **FR-010**: Un MANAGER MUST pouvoir attribuer un quart à combler à l'un de ses demandeurs. L'opération MUST en une transaction : (a) mettre à jour `shift.employeeId` à l'`employeeId` du demandeur choisi, (b) marquer cette claim comme APPROVED, (c) marquer toutes les autres claims du même shift comme REJECTED, (d) renseigner `decidedAt` et `decidedByUserId` sur les claims affectées.
- **FR-011**: Après attribution, le shift MUST disparaître de la liste « Quarts à combler » publique (filtré par `employeeId IS NULL`).
- **FR-012**: La suppression d'un shift MUST supprimer en cascade toutes ses claims.
- **FR-013**: Le panneau de filtres latéral du MANAGER (Phase 5) MUST afficher un badge avec le nombre de quarts à combler PENDING (somme des claims PENDING tous quarts confondus). Le badge est cosmétique uniquement.
- **FR-014**: Un EMPLOYEE qui réclame un quart à combler MUST voir l'état de sa demande (PENDING / APPROVED / REJECTED) sur sa carte dans la liste « Quarts à combler ».
- **FR-015**: Aucun EMPLOYEE MUST pouvoir voir ou modifier les claims d'un autre EMPLOYEE.
- **FR-016**: Aucun utilisateur MUST pouvoir accéder à des shifts ou claims d'une autre company.

### Key Entities *(include if feature involves data)*

- **Shift (extension)** : le champ `employeeId` devient nullable. La relation FK reste contrainte sur les valeurs non-nulles.
- **ShiftClaim** : nouvelle entité représentant une demande d'un EMPLOYEE de réclamer un quart à combler.
  - Attributs : entreprise propriétaire, shift cible, employé demandeur, status (PENDING / APPROVED / REJECTED), decidedAt (nullable), decidedByUserId (nullable).
  - Contraintes : unique sur `(shiftId, employeeId)` ; en cascade lors de la suppression du shift OU de l'employé.
  - Relations : appartient à une `Company`, à un `Shift`, à un `User` (demandeur). Optionnel `decidedBy` vers un MANAGER.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un MANAGER peut créer un quart à combler en moins de 30 secondes (le formulaire est le formulaire shift existant avec une option « non assigné »).
- **SC-002**: Un EMPLOYEE peut réclamer un quart à combler en deux clics : ouvrir la liste, cliquer « Je veux ce quart » + confirmation.
- **SC-003**: Un MANAGER peut attribuer un quart à un demandeur en moins de 5 secondes (lecture de la liste de demandeurs + clic).
- **SC-004**: L'attribution est atomique : 0 état intermédiaire observable où le shift est attribué mais les autres claims ne sont pas rejetées (test : exception au milieu de la transaction → rollback complet).
- **SC-005**: 0 fuite cross-tenant : un EMPLOYEE de la company A ne MUST jamais voir un quart à combler de la company B dans sa liste, ni soumettre une claim sur un tel quart.
- **SC-006**: Après attribution, le quart MUST disparaître de la liste « Quarts à combler » publique en moins d'un rafraîchissement de page (revalidatePath garanti).
- **SC-007**: Le badge du panneau de filtres MUST refléter le nombre exact de claims PENDING (vérifiable à la création/suppression de chaque claim).

## Assumptions

- **Granularité shift uniquement** : pas de quart partiel ni de partage de quart. Un quart est attribué à un seul EMPLOYEE.
- **Sélection par le MANAGER** : pas de tirage au sort, pas d'algorithme d'attribution automatique. Le MANAGER choisit manuellement parmi les demandeurs.
- **Pas de notification** aux demandeurs lors de l'attribution. Ils découvrent leur statut en consultant la page.
- **Pas de file d'attente** : si tous les demandeurs sont refusés implicitement (le MANAGER attribue à quelqu'un d'autre, ou supprime le shift), les claims passent en REJECTED ou disparaissent — pas de remise en queue.
- **Pas de re-publication automatique** : un quart attribué par erreur reste attribué tant que le MANAGER ne le modifie pas explicitement.
- **Cross-warnings** : les warnings de Phase 6 (disponibilités) et Phase 7 (congés) s'appliquent à un quart à combler côté EMPLOYEE comme « est-ce que ce quart tombe pendant mes plages indisponibles ? » — affichage informatif uniquement.
- L'invariant tenant et la séparation MANAGER/EMPLOYEE des phases précédentes s'appliquent intégralement, sans exception.
- Le statut DRAFT/PUBLISHED de Phase 8 continue d'opérer : les quarts à combler DRAFT ne sont visibles qu'au MANAGER. Seuls les PUBLISHED apparaissent dans la liste publique des EMPLOYEEs.

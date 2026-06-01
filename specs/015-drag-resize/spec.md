# Feature Specification: Drag-to-resize des shifts

**Feature Branch**: `015-drag-resize`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 15 — drag-to-resize. Sur le calendrier, le MANAGER peut étirer un shift par sa poignée droite pour prolonger l'heure de fin, ou par sa poignée gauche pour reculer l'heure de début. Le redimensionnement se fait par incréments de 15 minutes. Une fois relâché, la mutation est persistée via Server Action et la vue est revalidée."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Le MANAGER étire l'heure de fin d'un shift (Priority: P1)

Un MANAGER consulte un shift de 8h–12h. Il survole le bord droit du shift sur le calendrier desktop : un curseur de redimensionnement apparaît. Il presse, glisse de 4 « crans » vers la droite (chaque cran = 15 minutes), et relâche : le shift devient 8h–13h00. La mutation est persistée et la vue est rafraîchie. Pendant le drag, le shift affiche un indicateur visuel optimiste (durée mise à jour en temps réel).

**Why this priority**: C'est l'opération la plus fréquente — prolonger un shift en cours quand un employé reste plus tard. Sans cette US, le MANAGER doit ouvrir le dialog d'édition pour chaque ajustement.

**Independent Test**: Connecté en MANAGER, ouvrir `/schedules`, repérer un shift Bob 8h–12h. Empoigner la poignée droite (bord droit du bloc), glisser de 4 crans vers la droite, relâcher. Vérifier : (a) le shift en base est maintenant 8h–13h ; (b) la vue affiche la nouvelle durée sans rechargement complet ; (c) un toast « Shift redimensionné » apparaît.

**Acceptance Scenarios**:

1. **Given** un shift Bob 8h–12h, **When** le MANAGER étire la poignée droite de 60 minutes (4 crans), **Then** le shift devient 8h–13h en base, l'UI reflète immédiatement.
2. **Given** un shift Bob 8h–12h, **When** le MANAGER tente de glisser au-delà de minuit (par ex. +18h), **Then** le shift est borné à `endsAt = startsAt + 24h - 15min` (limite de jour) avec un toast d'information.
3. **Given** un shift Bob 8h–12h, **When** le MANAGER glisse jusqu'à `endsAt < startsAt + 15 min` (réduire à 0), **Then** la durée minimum de 15 minutes est respectée — pas de shift négatif.
4. **Given** un EMPLOYEE, **When** il survole le bord droit d'un shift, **Then** aucune poignée n'est visible (lecture seule).
5. **Given** un shift d'une autre company qui s'afficherait par bug, **When** la mutation arrive au serveur, **Then** le repository refuse (filtre tenant).

---

### User Story 2 - Le MANAGER recule l'heure de début d'un shift (Priority: P1)

Symétrique à US1, mais pour la poignée GAUCHE. Le shift Bob 8h–12h devient Bob 7h–12h en glissant la poignée gauche de 4 crans vers la gauche. Reflète l'heure de début effective quand un employé commence plus tôt.

**Why this priority**: Complète l'opération d'ajustement. Sans US2, le MANAGER ne peut prolonger que la fin, mais pas reculer le début (asymétrie frustrante).

**Independent Test**: Identique à US1 mais sur la poignée gauche, vérifier que `startsAt` recule de 60 minutes et `endsAt` reste inchangé.

**Acceptance Scenarios**:

1. **Given** un shift Bob 8h–12h, **When** le MANAGER recule la poignée gauche de 60 min (4 crans), **Then** le shift devient 7h–12h.
2. **Given** un shift Bob 8h–12h, **When** le MANAGER recule jusqu'à `startsAt < endsAt - 24h + 15min`, **Then** borné — pas de shift > 24h.
3. **Given** un shift Bob 8h–12h, **When** le MANAGER pousse la poignée gauche jusqu'à `startsAt = endsAt - 15min`, **Then** durée minimum respectée.
4. **Given** un shift qui traverse minuit (Bob 22h–02h), **When** le MANAGER étire ou recule, **Then** le calcul respecte le `endDayOffset` (la poignée GAUCHE déplace `startsAt`, la poignée DROITE déplace `endsAt`, indépendamment).

---

### User Story 3 - Feedback visuel pendant le drag (Priority: P2)

Pendant que le MANAGER drag une poignée (avant de relâcher), le bloc de shift affiche en temps réel la nouvelle plage horaire dans son label (par ex. « 8h–13h15 » au lieu de « 8h–12h »). Une bordure mise en évidence (couleur primaire ou ombre) confirme que le mode resize est actif. Au relâchement, si la mutation échoue côté serveur, le bloc revient à ses dimensions originales avec un toast d'erreur.

**Why this priority**: Confort UX. Sans cette US, US1+US2 fonctionnent mais l'expérience est sèche — pas de retour pendant le drag.

**Independent Test**: Démarrer un drag sur la poignée droite d'un shift Bob 8h–12h, glisser sans relâcher jusqu'à viser 13h15. Vérifier que le bloc affiche « 8h–13h15 » pendant le drag, avant même le relâchement.

**Acceptance Scenarios**:

1. **Given** un drag actif sur poignée droite, **When** le pointeur bouge, **Then** le label du shift se met à jour en temps réel (snap par 15min).
2. **Given** un drag actif, **When** le pointeur sort de la fenêtre, **Then** le drag est annulé sans mutation.
3. **Given** une mutation qui échoue côté serveur (par ex. permission refusée), **When** le serveur renvoie une erreur, **Then** le bloc revient à ses dimensions originales et un toast d'erreur s'affiche.

---

### Edge Cases

- **Drag depuis la vue mobile** : le redimensionnement N'EST PAS supporté sur mobile dans cette phase. La poignée n'est rendue que sur les écrans `md:` et plus. Sur mobile, le MANAGER doit ouvrir le dialog d'édition pour ajuster les heures.
- **Drag d'un shift DRAFT** : autorisé, la mutation préserve le statut DRAFT.
- **Drag d'un shift PUBLISHED** : autorisé, la mutation préserve le statut PUBLISHED. Aucune notification supplémentaire n'est émise (au contraire d'une création ou d'une publication).
- **Drag d'un open shift (employeeId = null)** : autorisé, le MANAGER peut ajuster les heures d'un quart à combler. Les claims associés ne sont pas affectés.
- **Conflit avec drag-and-drop existant** : le drag-and-drop déplace un shift d'un employé/jour à un autre (Phase 4). Le drag-to-resize ajuste seulement les heures d'un shift sur place. Les deux gestures coexistent par leur zone d'origine : les poignées (5px de chaque côté) initient le resize ; le reste du bloc initie le déplacement.
- **Re-vérification d'overlap au resize** : si le shift étiré chevauche un autre shift du même employé après resize, le serveur refuse avec `ASSIGNEE_OVERLAP` et l'UI rollback.
- **Cross-tenant** : la mutation passe par le repository existant qui filtre déjà sur `companyId` — pas de risque supplémentaire.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Un MANAGER MUST pouvoir redimensionner un shift via une poignée gauche (modifie `startsAt`) ou droite (modifie `endsAt`) sur le calendrier desktop.
- **FR-002**: Le redimensionnement MUST se faire par incréments de **15 minutes**.
- **FR-003**: La durée d'un shift après resize MUST être ≥ 15 minutes et ≤ 24 heures.
- **FR-004**: La mutation MUST être persistée via une Server Action et la vue rafraîchie.
- **FR-005**: Pendant le drag, l'UI MUST refléter optimistiquement la nouvelle plage (label + bloc).
- **FR-006**: Si la mutation serveur échoue, l'UI MUST revenir aux dimensions originales et afficher un toast d'erreur.
- **FR-007**: Les EMPLOYEES MUST PAS voir les poignées de resize (lecture seule).
- **FR-008**: Le resize MUST PAS être supporté sur l'écran mobile (uniquement `md:` et plus).
- **FR-009**: Le statut du shift (`DRAFT` / `PUBLISHED`) MUST être préservé.
- **FR-010**: Le filtre tenant MUST rester effectif (un MANAGER ne peut pas redimensionner un shift d'une autre company).
- **FR-011**: Le resize MUST re-utiliser le repository `updateShift` existant pour bénéficier de l'overlap check.

### Key Entities *(include if feature involves data)*

Aucune nouvelle entité. Aucun changement de schéma. Pure UX + nouvelle Server Action (ou extension d'`updateShiftAction`).

## Success Criteria *(mandatory)*

- **SC-001**: Un MANAGER peut redimensionner un shift en moins de 2 secondes (drag + relâchement → toast de succès).
- **SC-002**: Le snap de 15 minutes est exact : un drag de 100px (où 1 quart d'heure = 25px) donne pile +60 minutes.
- **SC-003**: Aucun shift d'une autre company ne peut être redimensionné (vérifié par le filtre tenant du repository).
- **SC-004**: La mutation respecte les contraintes existantes (overlap, statut, dates valides).
- **SC-005**: Aucun nouveau dépôt de poignées n'est rendu sur mobile (`< md:`).

## Assumptions

- Le composant calendrier desktop est `WeekGridDesktop`. Le mobile (`WeekStackedMobile`) ne supportera PAS le resize (UX différente, hors scope).
- Pas d'ajout de librairie : on réutilise les listeners pointer existants. `@dnd-kit/core` reste pour le drag-and-drop ; le resize utilise un handler manuel `onPointerDown/Move/Up`.
- La granularité 15 minutes est arbitraire mais standard dans l'industrie (Agendrix.com utilise 15min).
- Pas de keyboard accessibility pour le resize dans cette phase (P2 ultérieure).

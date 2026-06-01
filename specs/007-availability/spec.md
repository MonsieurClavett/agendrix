# Feature Specification: Disponibilités des employés

**Feature Branch**: `007-availability`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 6 — disponibilités. Permettre aux employés de déclarer leurs disponibilités récurrentes par jour de la semaine, signaler visuellement sur le calendrier les shifts assignés hors-disponibilité, et permettre au MANAGER de consulter (et éditer) les disponibilités de son équipe."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Un employé déclare ses disponibilités hebdomadaires (Priority: P1)

Un employé qui vient de rejoindre une entreprise ouvre la page « Disponibilités » et déclare, pour chaque jour de la semaine où il peut travailler, une ou plusieurs plages horaires (par exemple : lundi 9h–12h et 14h–18h, samedi 10h–16h). Il peut ensuite modifier ou supprimer ces plages à tout moment.

**Why this priority**: Sans cette capacité de base, aucune des autres fonctionnalités de la phase (affichage calendrier, warning) n'a de sens. C'est le socle de données nécessaire.

**Independent Test**: Connecté en EMPLOYEE, naviguer vers `/disponibilites`, ajouter trois plages distinctes (deux dans la même journée, une dans un autre jour), recharger la page, vérifier qu'elles persistent et qu'aucune plage d'un autre tenant n'est visible. Modifier l'une, supprimer une autre, vérifier la persistance.

**Acceptance Scenarios**:

1. **Given** un employé sans disponibilité déclarée, **When** il crée une plage « lundi 9h00–12h00 », **Then** la plage apparaît sur la page et reste après rechargement.
2. **Given** un employé qui a déjà une plage « lundi 9h00–12h00 », **When** il tente d'ajouter « lundi 10h00–14h00 », **Then** le système refuse la création avec un message expliquant le chevauchement, et aucune plage n'est créée.
3. **Given** un employé qui a une plage « lundi 9h00–12h00 », **When** il l'édite à « lundi 8h00–13h00 », **Then** la plage est mise à jour ; après rechargement la nouvelle plage est affichée et l'ancienne a disparu.
4. **Given** un employé qui a deux plages dans la même journée (« lundi 9h00–12h00 » et « lundi 14h00–18h00 »), **When** il supprime la première, **Then** seule la seconde subsiste.

---

### User Story 2 - Le calendrier signale les shifts hors-disponibilité (Priority: P2)

Un MANAGER en train de planifier des shifts voit, sur la vue calendrier hebdomadaire, une indication visuelle subtile pour chaque cellule (jour × employé) où l'employé s'est déclaré disponible — ce qui l'aide à éviter d'assigner des shifts en-dehors. Quand un shift est tout de même placé hors des plages disponibles de l'employé, la carte du shift affiche un marqueur d'avertissement (par exemple un petit point d'exclamation orange ou une bordure ambre) sans empêcher la création ou le déplacement.

**Why this priority**: Cette capacité transforme la donnée déclarée en US1 en une aide réelle à la décision pour le MANAGER. Elle est secondaire car la création/édition de shifts continuera à fonctionner sans elle, mais sans cette US la déclaration de l'US1 reste invisible côté planification.

**Independent Test**: Avec un employé ayant déclaré « lundi 9h–17h », un MANAGER ouvre le calendrier sur une semaine, crée un shift pour cet employé lundi 10h–15h (dans la plage) — aucun warning ne doit apparaître. Crée un autre shift lundi 18h–22h — un warning visuel doit apparaître sur la carte de ce second shift. Déplacer par drag-and-drop le shift hors-dispo vers une cellule mardi (sans dispo déclarée par défaut, aucun warning) — vérifier que le marqueur d'avertissement disparaît ou reste selon la nouvelle position. Déplacer le shift sur un autre employé (qui lui a déclaré être dispo à ce moment) — le warning disparaît.

**Acceptance Scenarios**:

1. **Given** un employé ayant déclaré « lundi 9h00–17h00 » et un shift pour cet employé lundi 10h00–15h00, **When** le MANAGER affiche le calendrier, **Then** la carte du shift n'affiche aucun warning.
2. **Given** le même employé, **When** un shift lundi 18h00–22h00 lui est créé, **Then** la carte affiche un marqueur visuel distinctif (warning hors-disponibilité).
3. **Given** un employé sans aucune disponibilité déclarée, **When** un shift lui est assigné, **Then** la carte n'affiche AUCUN warning (l'absence de déclaration n'équivaut pas à « indisponible »).
4. **Given** un shift initialement hors-disponibilité de l'employé A, **When** le MANAGER le déplace via drag-and-drop sur l'employé B dont les plages couvrent cette heure, **Then** le warning disparaît immédiatement et de manière optimiste sur la nouvelle position.
5. **Given** un employé avec dispos « lundi 9h–12h ET lundi 14h–18h » et un shift lundi 12h30–13h30, **When** le MANAGER affiche le calendrier, **Then** la carte affiche un warning (le shift tombe dans la pause non-déclarée).

---

### User Story 3 - Le MANAGER consulte et édite les disponibilités d'un employé (Priority: P3)

Depuis la page « Équipe », un MANAGER clique sur un bouton « Disponibilités » sur la carte d'un employé. Une fenêtre s'ouvre montrant toutes les plages déclarées par cet employé. Le MANAGER peut, si nécessaire (par exemple lors de l'onboarding d'un nouvel employé), ajouter, modifier ou supprimer des plages au nom de cet employé.

**Why this priority**: Utile pour les cas particuliers (onboarding, employé peu autonome) mais l'application reste pleinement fonctionnelle sans elle — l'employé peut toujours gérer ses propres plages via US1. C'est un confort, non un besoin critique de la phase.

**Independent Test**: Connecté en MANAGER, ouvrir la page « Équipe », cliquer sur le bouton « Disponibilités » de la carte d'un employé X. Vérifier que les plages affichées correspondent exactement à celles déclarées par X. Ajouter une plage au nom de X, fermer la fenêtre, se reconnecter en tant que X, vérifier que la nouvelle plage apparaît sur sa page personnelle.

**Acceptance Scenarios**:

1. **Given** un employé X ayant déclaré 4 plages réparties sur 3 jours, **When** le MANAGER ouvre la fenêtre « Disponibilités » de X depuis « Équipe », **Then** la fenêtre montre exactement ces 4 plages.
2. **Given** le même contexte, **When** le MANAGER ajoute une plage « samedi 10h00–14h00 » au nom de X, **Then** la plage est enregistrée et visible la prochaine fois que X consulte sa propre page « Disponibilités ».
3. **Given** un MANAGER de l'entreprise A, **When** il tente d'accéder aux disponibilités d'un employé de l'entreprise B, **Then** l'accès est refusé (cet employé n'apparaît pas dans la liste des membres de son équipe).

---

### Edge Cases

- **Plage qui traverse minuit** (par ex. « 22h00–02h00 ») : refusée. Les plages sont strictement bornées à une seule journée locale (`endMinute > startMinute`). Pour couvrir un quart de nuit, l'employé déclare deux plages séparées (22h–24h sur jour J, 0h–2h sur jour J+1).
- **Plage « toute la journée »** : autorisée (par ex. dimanche 0h00–24h00 représenté comme `startMinute=0, endMinute=1440`).
- **Aucune plage déclarée par l'employé** : le calendrier n'affiche aucune indication visuelle de disponibilité pour cet employé et aucun warning n'est jamais affiché sur ses shifts. L'absence de déclaration est interprétée comme « non renseigné », pas comme « indisponible ».
- **Shift qui chevauche une plage seulement partiellement** (par ex. plage 9h–12h, shift 11h–14h) : le shift est considéré hors-disponibilité (il sort de la plage à 12h00). Un warning est affiché.
- **Plusieurs plages dans le même jour** : autorisées tant qu'elles ne se chevauchent pas (ex. 9h–12h ET 14h–18h pour une pause midi).
- **Suppression d'un employé** : ses disponibilités sont supprimées en cascade.
- **Désactivation d'un employé (`isActive = false`)** : ses disponibilités restent en base mais l'employé n'apparaît plus dans les vues actives ; aucun shift ne devrait lui être assigné. Les disponibilités historiques sont conservées au cas où il serait réactivé.
- **Drag-and-drop d'un shift à un horaire hors-dispo** : autorisé (soft warning), pas de blocage.
- **Drag-and-drop d'un shift d'un employé A vers un employé B** : le warning est recalculé selon les disponibilités de B au moment du drop.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Un employé MUST pouvoir consulter, ajouter, modifier et supprimer ses propres plages de disponibilité depuis une page dédiée.
- **FR-002**: Chaque plage de disponibilité MUST être attachée à un jour de la semaine (dimanche=0 … samedi=6), une minute de début (0–1439), et une minute de fin (1–1440), avec `endMinute > startMinute`.
- **FR-003**: Le système MUST refuser la création ou la modification d'une plage qui chevauche une autre plage du même employé sur le même jour, et expliciter le conflit dans le message d'erreur.
- **FR-004**: Un MANAGER MUST pouvoir consulter les plages de disponibilité de tous les employés de sa propre entreprise.
- **FR-005**: Un MANAGER MUST pouvoir ajouter, modifier ou supprimer des plages au nom de n'importe quel employé de sa propre entreprise.
- **FR-006**: Un employé MUST NOT pouvoir lire, créer, modifier ou supprimer les plages d'un autre employé, qu'il soit ou non dans la même entreprise.
- **FR-007**: Aucun utilisateur (MANAGER ou EMPLOYEE) MUST pouvoir accéder aux plages d'utilisateurs d'une autre entreprise sous quelque forme que ce soit.
- **FR-008**: Sur le calendrier hebdomadaire, chaque carte de shift MUST afficher un marqueur visuel d'avertissement si et seulement si : (a) l'employé assigné a déclaré au moins une plage de disponibilité (n'importe quel jour), ET (b) le shift n'est pas entièrement contenu dans au moins une plage déclarée pour le jour de la semaine du shift.
- **FR-009**: Le marqueur d'avertissement MUST être visuellement distinct mais ne MUST PAS empêcher la création, la modification, le déplacement ou la suppression du shift.
- **FR-010**: Lors d'un déplacement de shift par drag-and-drop (changement de date, d'employé ou de position), le marqueur d'avertissement MUST être recalculé immédiatement en fonction de la nouvelle date et du nouvel employé.
- **FR-011**: La suppression d'un employé MUST entraîner la suppression de ses plages de disponibilité.
- **FR-012**: La page de gestion personnelle des disponibilités MUST être accessible à tout utilisateur authentifié sous un chemin dédié (par convention `/disponibilites`).
- **FR-013**: La fenêtre « Voir disponibilités » côté MANAGER MUST être atteignable depuis la page « Équipe » via une action explicite sur la carte de l'employé.

### Key Entities *(include if feature involves data)*

- **Availability** : Représente une plage horaire récurrente où un employé déclare pouvoir travailler.
  - Attributs : entreprise propriétaire, employé concerné, jour de la semaine (0–6), minute de début (0–1439), minute de fin (1–1440).
  - Contraintes : `endMinute > startMinute` ; pas de chevauchement entre deux plages du même employé sur le même jour de la semaine.
  - Relations : appartient à une `Company` ; appartient à un `User` (employé). Supprimée en cascade lors de la suppression de l'employé.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un employé peut créer sa première plage de disponibilité en moins de 30 secondes après être arrivé sur la page dédiée (sans documentation ni assistance).
- **SC-002**: Sur le calendrier hebdomadaire d'une équipe de 10 employés, un MANAGER peut identifier visuellement un shift hors-disponibilité en moins de 3 secondes (le marqueur est immédiatement repérable au survol de la vue).
- **SC-003**: 100 % des opérations de création ou de déplacement de shift réussissent même quand l'horaire tombe hors des plages déclarées de l'employé (aucun blocage côté serveur).
- **SC-004**: 0 fuite cross-tenant : un MANAGER ou un EMPLOYEE de l'entreprise A ne peut jamais — par interface, requête directe, ou erreur d'affichage — voir ou modifier une plage appartenant à un utilisateur de l'entreprise B.
- **SC-005**: 0 plage en base avec `endMinute <= startMinute` ou avec chevauchement entre deux plages du même employé pour le même `dayOfWeek` (invariant tenu de bout en bout).

## Assumptions

- Les disponibilités sont **récurrentes hebdomadaires uniquement**. La gestion d'exceptions ponctuelles (« indisponible le 15 juillet 2026 »), de congés et de vacances est explicitement hors-scope et constituera une phase ultérieure.
- Une plage horaire est strictement bornée à une seule journée locale ; les plages traversant minuit doivent être déclarées comme deux plages distinctes sur deux `dayOfWeek` consécutifs.
- Les heures sont interprétées dans la « zone locale de l'entreprise » sans distinction de fuseau horaire dans cette phase. Le système ne stocke que des minutes locales (0–1440) et un jour de la semaine, pas des `Date` complets.
- L'absence de toute plage déclarée par un employé est interprétée comme « non renseigné », pas comme « indisponible » : aucun warning n'est affiché sur ses shifts dans ce cas. Le warning n'apparaît qu'à partir du moment où au moins une plage existe pour cet employé (peu importe le jour).
- Le drag-and-drop existant (phase 4) continue de fonctionner ; le seul changement est l'affichage en temps réel du marqueur d'avertissement après recalcul.
- La page « Disponibilités » personnelle ne propose pas, dans cette phase, d'import en masse, de copie depuis une autre semaine ou de modèle prédéfini (« horaires de bureau standard »). Seule la saisie manuelle plage par plage est offerte.
- Aucune notification par email ou push n'est envoyée lorsque les disponibilités sont modifiées (par l'employé ou par le MANAGER au nom de l'employé). Hors-scope dans cette phase.
- L'invariant tenant et la séparation MANAGER/EMPLOYEE déjà établis par les phases précédentes (helpers centraux de session, repositories scopés par `companyId`) s'appliquent intégralement à cette feature, sans exception ni dérogation.

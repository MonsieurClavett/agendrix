# Feature Specification: Statistiques personnelles employé

**Feature Branch**: `027-employee-stats`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 27 — page `/me/stats` qui agrège pour l'utilisateur connecté (EMPLOYEE ou MANAGER, chacun ses propres données) ses statistiques sur les 30 derniers jours par défaut (commutable 7 ou 90) : heures travaillées (depuis les sessions de pointage closes), heures planifiées (depuis Shift), écart signé, comparaison à la fourchette préférée (`EmployeePreference.min/maxHoursPerWeek`), moyenne par jour travaillé, jour de la semaine le plus travaillé, score de ponctualité (à l'heure ±5 min), série consécutive. Visualisations : 4 stat cards, heatmap calendrier 30 jours, barres CSS par jour de la semaine et par position, grille de badges de gamification. Aucune nouvelle entité, aucune migration."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - L'EMPLOYEE consulte ses statistiques des 30 derniers jours (Priority: P1)

EMPLOYEE Bob ouvre `/me/stats`. Voit 4 stat cards en haut : heures travaillées (38h), heures planifiées (40h), écart (-2h), ponctualité (87%). Plus bas : heatmap des 30 derniers jours (30 cases colorées selon les heures travaillées chaque jour), barres par jour de la semaine, barres par position, badges débloqués.

**Why this priority**: C'est la vue principale qui rend la fonctionnalité visible et utile dès le premier jour.

**Independent Test**: Connecté en Bob avec 30 jours de données mixtes (shifts + punches), ouvrir `/me/stats` → voir les 4 cards avec des valeurs cohérentes, la heatmap, et au moins un badge.

**Acceptance Scenarios**:

1. **Given** Bob a 38h travaillées et 40h planifiées sur 30j, **When** il ouvre `/me/stats`, **Then** les cards affichent 38h / 40h / -2h.
2. **Given** Bob n'a aucune donnée (nouvel utilisateur), **Then** les cards affichent 0h partout et la heatmap est entièrement grise — pas d'erreur.
3. **Given** Bob a une `EmployeePreference` avec min=30, max=40 et 38h travaillées, **Then** un message « Vous êtes dans votre fourchette idéale » apparaît à côté des cards.
4. **Given** Bob a 25h travaillées et min=30, **Then** le message affiche « Sous votre fourchette de 5 heures ».
5. **Given** Bob a 45h travaillées et max=40, **Then** le message affiche « Au-dessus de votre fourchette de 5 heures ».
6. **Given** Bob n'a pas d'`EmployeePreference`, **Then** aucun message de fourchette n'apparaît (zone simplement omise).

---

### User Story 2 - Bob change la plage de temps (Priority: P1)

Sur `/me/stats`, Bob clique sur le sélecteur de plage « 7 / 30 / 90 derniers jours ». Il choisit « 7 jours ». La page se recharge avec les agrégations sur 7 jours et la heatmap n'affiche que 7 cases.

**Why this priority**: La plage par défaut de 30j convient pour la majorité, mais la possibilité de voir 7j (semaine en cours) ou 90j (tendance trimestrielle) rend la page utile pour différents besoins.

**Independent Test**: Sur `/me/stats?range=7`, vérifier que toutes les agrégations sont calculées sur 7j et que la heatmap affiche 7 cases.

**Acceptance Scenarios**:

1. **Given** Bob sur `/me/stats?range=7`, **Then** toutes les valeurs reflètent les 7 derniers jours.
2. **Given** Bob clique « 90 jours », **Then** l'URL devient `?range=90` et la heatmap affiche 90 cases.
3. **Given** une valeur `range` invalide (`?range=abc`), **Then** fallback silencieux à 30 jours.

---

### User Story 3 - Bob découvre ses badges (Priority: P2)

Bob a accumulé 52 heures de travail, plus de 5 sessions et une série de 8 jours consécutifs. En bas de `/me/stats`, il voit une grille de badges avec « Première semaine! », « 50 heures » et « Marathon » colorés (débloqués) tandis que « 100 heures » et « Ponctuel » sont grisés (verrouillés).

**Why this priority**: Gamification — incitative mais pas critique. Augmente l'engagement de l'employé.

**Independent Test**: Avec des données dépassant les seuils précis, vérifier que les bons badges sont affichés débloqués.

**Acceptance Scenarios**:

1. **Given** Bob a totalisé 52h, **Then** le badge « 50 heures » est débloqué et « 100 heures » est verrouillé.
2. **Given** Bob a une série de 7 jours consécutifs avec au moins une session close, **Then** le badge « Marathon » est débloqué.
3. **Given** Bob a un score de ponctualité ≥ 90%, **Then** le badge « Ponctuel » est débloqué.
4. **Given** Bob a au moins une session close qui se termine après 22h00, **Then** le badge « Sortie tardive » est débloqué.

---

### User Story 4 - Le MANAGER consulte aussi ses propres statistiques (Priority: P2)

Un MANAGER ouvre `/me/stats`. La page affiche SES propres statistiques (en tant qu'employé de sa company), pas celles de ses subordonnés. Le rôle MANAGER ne change rien aux agrégations — c'est juste un employé qui se trouve avoir le rôle MANAGER.

**Independent Test**: Connecté en MANAGER avec des shifts et des pointages personnels, ouvrir `/me/stats` → voir SES données.

**Acceptance Scenarios**:

1. **Given** un MANAGER avec ses propres punches, **When** il ouvre `/me/stats`, **Then** les valeurs reflètent SES données uniquement.
2. **Given** un MANAGER, **Then** aucune option « voir les stats d'un autre » n'est présente sur cette page (hors scope de cette phase).

---

### Edge Cases

- **Sessions ouvertes (IN sans OUT)** : exclues du total d'heures travaillées et du calcul de moyenne. Comptées comme « jour travaillé » uniquement si une autre session du jour est close.
- **Aucune `EmployeePreference`** : la section comparaison est entièrement omise (pas affichée du tout).
- **`minHoursPerWeek` > `maxHoursPerWeek`** (donnée corrompue) : on respecte le min, on ignore le max — message « Sous votre fourchette ».
- **Streak qui inclut aujourd'hui** : aujourd'hui ne compte que si une session est close (pas en cours).
- **Punctualité sans IN matché à un shift** : exclu du calcul. Si aucun IN n'est matché, le score est `null` et affiché « N/A ».
- **Position supprimée** : les shifts avec `positionId = null` sont regroupés sous « Sans position » dans la distribution.
- **Cross-tenant** : toutes les agrégations sont limitées au `companyId` de l'utilisateur via le repo.
- **Fuseau horaire** : toutes les bornes de jour sont calculées en heure locale serveur (cohérent avec les phases existantes).

## Requirements *(mandatory)*

- **FR-001**: La page `/me/stats` MUST être accessible à TOUT utilisateur authentifié (EMPLOYEE et MANAGER).
- **FR-002**: Les agrégations MUST porter exclusivement sur les données du `ctx.userId` connecté — jamais sur celles d'un autre utilisateur.
- **FR-003**: La plage de temps MUST être contrôlée par le query param `?range=7|30|90` avec fallback à 30.
- **FR-004**: Les heures travaillées MUST être calculées uniquement à partir des sessions IN→OUT closes (via `pairPunches()`).
- **FR-005**: Les heures planifiées MUST être calculées à partir de `Shift.endsAt - Shift.startsAt` filtrés sur la plage.
- **FR-006**: L'écart MUST être signé (worked - scheduled) et affiché avec le signe (`+` ou `-`).
- **FR-007**: La comparaison à la fourchette préférée MUST utiliser `EmployeePreference.minHoursPerWeek` et `maxHoursPerWeek`. Si la préférence est absente, la section MUST être omise.
- **FR-008**: Le score de ponctualité MUST être calculé comme : pour chaque punch IN matché à un shift, le punch est « à l'heure » si `abs(punchedAt - shift.startsAt) ≤ 5 min`. Le score est le pourcentage de IN à l'heure. Si aucun IN matché, score = `null`.
- **FR-009**: La série consécutive MUST compter les jours consécutifs (terminant par aujourd'hui ou hier au plus) avec au moins une session close.
- **FR-010**: La heatmap MUST afficher une case par jour de la plage, colorée selon les heures travaillées :
  - 0h → muted gray
  - 1-4h → light blue
  - 4-7h → medium blue
  - ≥ 7h → dark blue / accent
- **FR-011**: La distribution par jour de la semaine MUST afficher 7 barres (Lun→Dim) avec les heures travaillées cumulées.
- **FR-012**: La distribution par position MUST afficher une barre par position avec les heures planifiées cumulées sur la plage.
- **FR-013**: Les badges MUST être calculés serveur et affichés débloqués/verrouillés selon les seuils suivants :
  - « Première semaine! » : ≥ 5 sessions closes sur la plage
  - « 50 heures » : ≥ 50h travaillées sur la plage
  - « 100 heures » : ≥ 100h travaillées sur la plage
  - « Ponctuel » : ponctualité ≥ 90% (et calculable)
  - « Marathon » : streak ≥ 7 jours
  - « Sortie tardive » : ≥ 1 session close terminée après 22h00 sur la plage
- **FR-014**: Aucune nouvelle dépendance de visualisation — heatmap et barres MUST être en CSS pur (pas de lib chart).
- **FR-015**: Le filtre tenant MUST rester strict — un utilisateur ne peut voir que ses données dans sa company.

### Key Entities

Aucune nouvelle entité. Pure agrégation des entités existantes (`Shift`, `Punch`, `EmployeePreference`, `Position`, `User`).

## Success Criteria *(mandatory)*

- **SC-001**: Le calcul complet pour 30 jours (shifts + punches + préférences) s'exécute en moins de 500 ms côté serveur.
- **SC-002**: Aucune donnée d'un autre utilisateur ni d'une autre company n'apparaît dans les stats affichées.
- **SC-003**: Les totaux heures travaillées et heures planifiées matchent ceux calculés par la page `/rapports` (cohérence pour le même utilisateur sur la même plage).
- **SC-004**: La heatmap rend correctement 7, 30 ou 90 cases selon la plage choisie, sans débordement de layout.
- **SC-005**: Les badges sont attribués déterministiquement — mêmes données = mêmes badges débloqués.

## Assumptions

- Pas de cache côté serveur — chaque visite recalcule à partir des données fraîches. Acceptable vu les volumes MVP (≤ 200 shifts + 200 punches par utilisateur sur 90 jours).
- Pas de notification quand un badge est débloqué — la découverte se fait en visitant la page.
- Pas d'export ni de partage social des badges (hors scope).
- Pas de classement entre employés (hors scope, sensible côté RH).
- Fuseau horaire = heure locale du serveur (cohérent avec les autres phases ; gestion multi-TZ hors scope).
- La fourchette préférée hebdomadaire est comparée au total brut de la plage sans ajustement pro-rata (interprétation simple ; doc l'expliquera si besoin).
- Sessions ouvertes (IN sans OUT) sont exclues du total — un signalement discret peut être affiché mais n'est pas obligatoire pour cette phase.

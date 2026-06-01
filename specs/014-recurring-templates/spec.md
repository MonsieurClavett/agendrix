# Feature Specification: Modèles d'horaire récurrents

**Feature Branch**: `014-recurring-templates`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 14 — modèles d'horaire récurrents. Le MANAGER peut sauvegarder une semaine d'horaire comme modèle (ex. « Semaine type été »), puis appliquer ce modèle sur n'importe quelle autre semaine. L'application copie tous les shifts du modèle vers la semaine cible, en décalant les dates pour qu'elles tombent sur le bon jour de la semaine. Les shifts créés héritent du statut DRAFT pour que le MANAGER puisse ajuster avant de publier."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Le MANAGER sauvegarde une semaine comme modèle (Priority: P1)

Un MANAGER a passé du temps à monter une semaine d'horaire (par ex. la semaine du 1er juin) qui représente bien la rotation type de l'équipe. Il veut pouvoir la réutiliser. Sur la page `/schedules`, depuis la barre d'outils de la semaine, il clique « Sauvegarder comme modèle ». Un dialog demande un nom court (par ex. « Semaine type été »). À la soumission, un `ScheduleTemplate` est créé avec un snapshot de tous les shifts de la semaine visible (employeeId, positionId, jour-de-la-semaine, heure-début, heure-fin, note). Une fois sauvegardé, le modèle apparaît dans une liste « Mes modèles » et peut être réutilisé.

**Why this priority**: C'est la création de l'artéfact réutilisable. Sans cette US, aucune semaine ne peut servir de base.

**Independent Test**: Connecté en MANAGER, naviguer à la semaine du 1er juin contenant 12 shifts répartis sur Bob et Carol. Cliquer « Sauvegarder comme modèle », saisir « Semaine type été », valider. Vérifier : (a) un `ScheduleTemplate` existe avec `name = "Semaine type été"` et `companyId = ctx.companyId` ; (b) 12 `ScheduleTemplateShift` sont créés avec les bons employeeId, jour-de-semaine (1 = lundi … 7 = dimanche), heures, position, note ; (c) le modèle apparaît dans la liste des modèles côté MANAGER.

**Acceptance Scenarios**:

1. **Given** une semaine avec 8 shifts (mix DRAFT et PUBLISHED), **When** le MANAGER sauvegarde comme modèle « Été 2026 », **Then** un `ScheduleTemplate` est créé avec 8 `ScheduleTemplateShift` reflétant exactement les jours-de-semaine, heures et assignations.
2. **Given** une semaine vide, **When** le MANAGER tente de sauvegarder, **Then** le système refuse — un modèle vide n'a pas de sens.
3. **Given** un MANAGER avec déjà un modèle nommé « Été 2026 », **When** il tente de réutiliser le même nom, **Then** le système refuse — les noms doivent être uniques par company.
4. **Given** un EMPLOYEE, **When** il essaie d'accéder à l'action « Sauvegarder comme modèle », **Then** elle n'est pas visible côté UI et l'action serveur refuse.
5. **Given** un MANAGER d'une autre company, **When** il liste ses modèles, **Then** aucun modèle d'une company tierce n'apparaît.

---

### User Story 2 - Le MANAGER applique un modèle sur une semaine cible (Priority: P1)

Un MANAGER se trouve sur la semaine du 8 juin (vide ou à compléter). Depuis la barre d'outils, il clique « Appliquer un modèle ». Un dialog liste ses modèles disponibles. Il sélectionne « Semaine type été » et confirme. Le système copie tous les `ScheduleTemplateShift` vers la semaine cible : pour chaque entrée du modèle, un nouveau `Shift` est créé avec la même `employeeId`, `positionId`, `note`, et les heures appropriées, mais avec la `date` ajustée pour tomber sur le bon jour-de-semaine de la semaine cible. Tous les shifts créés sont en statut `DRAFT` pour que le MANAGER puisse ajuster avant publication.

**Why this priority**: C'est la moitié manquante. Sans cette US, on peut sauvegarder mais pas réutiliser.

**Independent Test**: Avec un modèle « Été 2026 » contenant 12 shifts, naviguer à la semaine du 8 juin (vide). Cliquer « Appliquer un modèle », choisir « Été 2026 », valider. Vérifier : (a) 12 nouveaux `Shift` existent dans la semaine du 8 juin avec les bons employeeId, positionId, heures ; (b) tous sont DRAFT ; (c) un shift du modèle qui était sur un lundi tombe bien sur lundi 8 juin ; un shift du jeudi tombe sur jeudi 11 juin.

**Acceptance Scenarios**:

1. **Given** un modèle avec 5 shifts (lundi, mercredi, vendredi), **When** appliqué sur la semaine du 8 juin, **Then** 5 nouveaux shifts DRAFT sont créés sur lundi 8, mercredi 10, vendredi 12.
2. **Given** la semaine cible contient déjà 3 shifts, **When** un modèle est appliqué, **Then** les shifts du modèle sont AJOUTÉS (pas de remplacement) — le MANAGER peut supprimer manuellement ce qui ne sert plus.
3. **Given** un modèle dont un employeeId pointe vers un employé désactivé entre-temps, **When** appliqué, **Then** ces shifts sont créés sans employé (employeeId = null, « Quart à combler ») au lieu de planter — robustesse.
4. **Given** un modèle dont un positionId pointe vers une position supprimée, **When** appliqué, **Then** ces shifts sont créés avec `positionId = null` — robustesse.
5. **Given** un EMPLOYEE, **When** il essaie d'appliquer un modèle, **Then** l'action n'est pas visible.

---

### User Story 3 - Le MANAGER gère ses modèles (Priority: P2)

Le MANAGER ouvre une page dédiée `/templates` (ou un onglet dans `/team`) qui liste tous les modèles de la company avec : nom, nombre de shifts, date de création, nom de l'auteur. Il peut renommer un modèle, ou le supprimer. La suppression d'un modèle n'affecte AUCUN shift existant (les shifts déjà appliqués restent intacts).

**Why this priority**: Confort opérationnel. Sans cette US, US1+US2 fonctionnent mais on accumule des modèles obsolètes sans pouvoir les nettoyer. P2 car c'est du nice-to-have.

**Independent Test**: Connecté en MANAGER avec 3 modèles. Ouvrir `/templates`. Renommer « Été 2026 » → « Rotation 4-jours ». Vérifier en base. Supprimer un autre modèle. Vérifier qu'il disparaît de la liste et que les shifts précédemment appliqués depuis ce modèle existent toujours.

**Acceptance Scenarios**:

1. **Given** 3 modèles existants, **When** le MANAGER ouvre `/templates`, **Then** les 3 apparaissent avec leurs métadonnées.
2. **Given** un modèle « Été 2026 », **When** le MANAGER le renomme « Rotation 4-jours », **Then** le `name` est mis à jour, l'unicité par company est revérifiée.
3. **Given** un modèle, **When** le MANAGER le supprime (avec confirmation), **Then** le `ScheduleTemplate` et ses `ScheduleTemplateShift` sont supprimés en cascade ; aucun `Shift` existant n'est affecté.
4. **Given** un EMPLOYEE, **When** il accède à `/templates`, **Then** redirigé hors de la page (MANAGER-only).
5. **Given** un MANAGER d'une autre company, **When** il liste les modèles, **Then** aucun modèle tiers visible.

---

### Edge Cases

- **Sauvegarde d'une semaine contenant des open shifts (employeeId = null)** : autorisée, les open shifts sont preservés dans le modèle ; à l'application, ils restent open shifts.
- **Sauvegarde puis suppression d'un employé** : le modèle contient encore l'ancien `employeeId` ; à l'application, le shift fallback en open shift (cf US2 acceptance #3).
- **Appliquer un modèle deux fois sur la même semaine** : autorisé, doublonne les shifts — c'est la responsabilité du MANAGER. Pas de dédup automatique.
- **Modèle avec un shift qui passe minuit** (par ex. 22h–02h) : preservé tel quel, le `endDayOffset = 1` est stocké dans le `ScheduleTemplateShift`.
- **Suppression d'une position référencée par un modèle** : autorisée, le `positionId` du modèle pointe sur un id absent ; à l'application, fallback à `null` (cf US2 acceptance #4).
- **Cross-tenant** : un modèle d'une company A ne peut jamais être appliqué sur la semaine d'une company B — la liste de modèles est filtrée par `companyId`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Un MANAGER MUST pouvoir créer un `ScheduleTemplate` nommé en snapshot d'une semaine visible.
- **FR-002**: La sauvegarde MUST capturer pour chaque shift de la semaine : `employeeId`, `positionId`, `dayOfWeek` (1–7), `startHour`, `endHour`, `endDayOffset` (0 ou 1 si traverse minuit), `note`.
- **FR-003**: Le système MUST refuser un nom de modèle déjà utilisé dans la company (`UNIQUE (companyId, name)`).
- **FR-004**: Un MANAGER MUST pouvoir appliquer un `ScheduleTemplate` sur une `WeekRange` cible.
- **FR-005**: L'application MUST créer un `Shift` DRAFT pour chaque `ScheduleTemplateShift`, avec `startsAt`/`endsAt` calculés sur la semaine cible.
- **FR-006**: L'application MUST fallback à `employeeId = null` si l'employeeId du modèle pointe vers un employé inactif/supprimé.
- **FR-007**: L'application MUST fallback à `positionId = null` si le positionId du modèle pointe vers une position supprimée.
- **FR-008**: L'application MUST ajouter les shifts (pas remplacer ceux existants).
- **FR-009**: Un MANAGER MUST pouvoir renommer ou supprimer un de ses modèles.
- **FR-010**: La suppression d'un modèle MUST cascade vers ses `ScheduleTemplateShift` mais ne TOUCHE PAS aux `Shift` réels précédemment créés.
- **FR-011**: Les modèles MUST être filtrés strictement par `companyId` à toute lecture.
- **FR-012**: Toute action de création/édition/suppression d'un modèle ou d'application MUST être MANAGER-only.
- **FR-013**: La sauvegarde MUST refuser une semaine vide (au moins 1 shift requis).

### Key Entities *(include if feature involves data)*

- **ScheduleTemplate** : modèle nommé d'une semaine type. Champs : `id`, `companyId`, `name`, `createdByUserId`, `createdAt`, `updatedAt`. Unique sur (`companyId`, `name`).
- **ScheduleTemplateShift** : ligne du modèle. Champs : `id`, `templateId`, `employeeId` (nullable, FK SetNull), `positionId` (nullable, FK SetNull), `dayOfWeek` (1–7, lundi=1), `startHour` (HH:MM), `endHour` (HH:MM), `endDayOffset` (0 ou 1), `note`.

## Success Criteria *(mandatory)*

- **SC-001**: Un MANAGER peut sauvegarder une semaine de 12 shifts comme modèle en moins de 10 secondes (clic → succès toast).
- **SC-002**: Appliquer un modèle de 12 shifts sur une semaine vide produit 12 shifts DRAFT avec les bons jours/heures/employés en moins de 5 secondes.
- **SC-003**: Aucun shift d'une autre company ne peut jamais être lu, copié, ou modifié via l'infra des modèles (vérifié par les invariants tenant des repositories).
- **SC-004**: Un EMPLOYEE ne peut ni créer, ni appliquer, ni voir la page `/templates`.
- **SC-005**: La suppression d'un modèle ne casse aucun `Shift` réel existant — vérifiable en supprimant un modèle puis en consultant `/schedules`.

## Assumptions

- Le modèle stocke des **jours-de-semaine** (1–7) et non des **dates absolues**, pour que le snapshot soit re-projetable sur n'importe quelle semaine.
- Le modèle ne stocke PAS le `status` des shifts originaux : tous les shifts générés sont DRAFT, à charge du MANAGER de publier.
- Les claims sur open shifts du modèle source ne sont PAS copiés (pas de sens — c'est une nouvelle semaine).
- Pas de versionnage des modèles dans cette phase (un modèle est mutable in-place).

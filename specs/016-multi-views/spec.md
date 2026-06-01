# Feature Specification: Vue jour & multi-semaines

**Feature Branch**: `016-multi-views`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 16 — vue jour et multi-semaines. La page /schedules gagne un sélecteur de vue : Semaine (1 sem, par défaut, comportement actuel), Jour (1 jour, plus dense), 2 Semaines (14 jours). Le state est persisté dans l'URL via `?view=day|week|2week`. La navigation suivant/précédent s'adapte (avance d'un jour en vue jour, d'une semaine en vue semaine, de 2 semaines en vue 2-semaines). Les composants existants (filtres, totaux, drag-and-drop, resize, etc.) restent fonctionnels dans chaque vue."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Le MANAGER bascule en vue jour (Priority: P1)

Un MANAGER consulte `/schedules` (vue semaine par défaut). Il clique sur le sélecteur de vue de la barre d'outils, choisit « Jour ». L'URL devient `/schedules?view=day&day=2026-06-01`. Le calendrier affiche désormais UNE seule colonne de jour, plus large, avec tous les shifts de ce jour visibles en détail. Les flèches `<` `>` avancent maintenant d'UN jour à la fois (au lieu de 7).

**Why this priority**: La vue jour est utile pour planifier précisément un jour chargé sans le bruit visuel des 6 autres jours. Sans cette US, le MANAGER doit chercher dans une grille hebdomadaire.

**Independent Test**: Connecté en MANAGER, ouvrir `/schedules`. Cliquer « Jour ». Vérifier : (a) URL contient `?view=day` ; (b) le grid affiche 1 colonne pour le jour visible ; (c) cliquer la flèche `>` avance au lendemain (URL `?view=day&day=YYYY-MM-DD+1`) ; (d) cliquer « Aujourd'hui » ramène à `?view=day&day=<today>`.

**Acceptance Scenarios**:

1. **Given** la vue par défaut (semaine), **When** le MANAGER bascule en « Jour », **Then** l'URL contient `view=day` et le calendrier affiche 1 colonne.
2. **Given** vue jour, **When** le MANAGER clique `>`, **Then** la date avance d'un jour.
3. **Given** vue jour, **When** le MANAGER bascule en « Semaine », **Then** la vue redevient hebdomadaire et `view=week` (ou absent).
4. **Given** un EMPLOYEE, **When** il bascule en « Jour », **Then** la vue jour affiche seulement SES shifts publiés du jour (le filtre tenant + employee continue de s'appliquer).
5. **Given** drag-and-drop activé dans la vue semaine, **When** le MANAGER drag un shift en vue jour, **Then** le drag reste fonctionnel (la cellule cible est dans la même colonne unique, donc seul un déplacement vers un autre employé est autorisé).

---

### User Story 2 - Le MANAGER consulte 2 semaines à la fois (Priority: P1)

Un MANAGER veut comparer la rotation de cette semaine et de la suivante. Il bascule en vue « 2 semaines ». L'URL devient `/schedules?view=2week&week=YYYY-MM-DD`. Le calendrier affiche 14 colonnes (jours), avec un séparateur visuel entre la semaine 1 et la semaine 2. La navigation `>` avance désormais de 14 jours.

**Why this priority**: Permet la planification proactive sur 2 semaines, utile pour voir la cohérence d'une rotation. Sans cette US, le MANAGER doit changer de semaine constamment.

**Independent Test**: Bascule en « 2 semaines ». Vérifier : (a) URL `?view=2week` ; (b) le grid affiche 14 colonnes ; (c) un séparateur (border plus marquée ou label « Semaine 2 ») apparaît entre les jours 7 et 8 ; (d) la flèche `>` avance de 14 jours.

**Acceptance Scenarios**:

1. **Given** vue semaine, **When** le MANAGER bascule « 2 semaines », **Then** le grid affiche 14 jours et l'URL contient `view=2week`.
2. **Given** vue 2 semaines, **When** le MANAGER clique `>`, **Then** la plage avance de 14 jours.
3. **Given** vue 2 semaines, **When** le MANAGER drag un shift de la semaine 1 vers la semaine 2 (par ex. lundi semaine 1 → mardi semaine 2), **Then** le shift est correctement déplacé (la date cible est dérivée de la cellule de drop comme dans la vue semaine).
4. **Given** vue 2 semaines, **When** le MANAGER bascule en « Jour », **Then** la vue jour s'ouvre sur le PREMIER jour de la plage de 2 semaines (ou sur aujourd'hui si visible dans la plage).

---

### User Story 3 - L'URL est partageable et signet-able (Priority: P2)

Un MANAGER copie l'URL d'une vue jour pour la coller dans un message à un autre MANAGER : `/schedules?view=day&day=2026-06-15`. L'autre MANAGER ouvre le lien : il atterrit exactement sur la vue jour du 15 juin, sans devoir naviguer manuellement.

**Why this priority**: Pratique pour le travail d'équipe. Sans cette US, on doit décrire « va au 15 juin et choisis vue jour » manuellement.

**Independent Test**: Ouvrir `/schedules?view=day&day=2026-06-15` directement → la page atterrit sur la vue jour du 15 juin.

**Acceptance Scenarios**:

1. **Given** une URL `/schedules?view=day&day=2026-06-15`, **When** elle est ouverte, **Then** la page rend immédiatement la vue jour du 15 juin.
2. **Given** une URL `/schedules?view=2week&week=2026-06-01`, **When** elle est ouverte, **Then** la page rend la plage 1–14 juin.
3. **Given** une URL avec `view=invalid`, **When** elle est ouverte, **Then** le fallback est `view=week` (gracieux).
4. **Given** une URL avec `day=2026-13-99` (date invalide), **When** elle est ouverte, **Then** fallback à aujourd'hui.

---

### Edge Cases

- **Vue jour sur mobile** : la vue jour est NATURELLEMENT compatible mobile (déjà 1 seule colonne). Pas de modification de `WeekStackedMobile` nécessaire — mais la barre d'outils mobile doit aussi exposer le sélecteur de vue.
- **Vue 2 semaines sur mobile** : empilée comme la vue semaine (le mobile garde son format `WeekStackedMobile` mais sur 14 jours au lieu de 7).
- **Drag-to-resize en vue jour** : fonctionne, mais `MINUTES_PER_PX` change (la colonne est plus large) → on peut soit ignorer (acceptable car les bornes 15min sont préservées) soit recalibrer (P2).
- **Templates en vue 2 semaines** : « Sauvegarder comme modèle » sauve toujours UNE semaine (la semaine 1 visible), pas les 2. « Appliquer un modèle » applique sur la semaine 1.
- **`pendingClaimsCount` / `draftCount` en vue 2 semaines** : doivent compter sur les 14 jours, pas sur 7. Les compteurs sont déjà recalculés via Promise.all dans la page.
- **Cross-tenant** : aucune nouvelle voie d'accès aux données, on réutilise les repositories existants avec un `WeekRange` ajusté.
- **Vue jour passant minuit** : un shift de 22h–02h du 14 juin se prolonge sur le 15 juin. En vue jour du 14, il apparaît tronqué (22h–00h visuellement) ; en vue jour du 15, il apparaît tronqué (00h–02h). Comportement standard.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La page `/schedules` MUST accepter un paramètre `?view=week|day|2week` (par défaut `week`).
- **FR-002**: La vue `week` reprend le comportement actuel (7 jours, lundi → dimanche).
- **FR-003**: La vue `day` affiche un seul jour, paramètre `?day=YYYY-MM-DD` (par défaut aujourd'hui).
- **FR-004**: La vue `2week` affiche 14 jours consécutifs à partir du lundi de la semaine donnée (paramètre `?week=YYYY-MM-DD` réutilisé).
- **FR-005**: La barre d'outils MUST inclure un sélecteur de vue (segmented control ou select).
- **FR-006**: Les flèches `<` `>` MUST avancer/reculer du bon nombre de jours selon la vue (1 / 7 / 14).
- **FR-007**: Le bouton « Aujourd'hui » MUST ramener à la vue actuelle centrée sur aujourd'hui.
- **FR-008**: Les paramètres invalides MUST fallback à des valeurs par défaut (vue → `week`, dates → `today`).
- **FR-009**: Les composants existants (filtres, drag-and-drop, resize, totaux par jour/employé, dialogs) MUST rester fonctionnels dans toutes les vues.
- **FR-010**: Le repository `listShiftsForCompanyWeek` (et `listShiftsForUserWeek`) MUST accepter une plage arbitraire (pas seulement 7 jours) — on généralise le type `WeekRange` ou on introduit `DateRange`.
- **FR-011**: L'URL MUST refléter la vue active pour permettre le partage de lien (FR partageabilité).

### Key Entities *(include if feature involves data)*

Aucune nouvelle entité. Aucun changement de schéma. Pure UX + ajustement des paramètres de range.

## Success Criteria *(mandatory)*

- **SC-001**: Le MANAGER peut basculer entre les 3 vues en moins de 2 secondes (clic sélecteur → render).
- **SC-002**: L'URL est partageable : ouvrir une URL `?view=day&day=...` produit exactement la même vue qu'un workflow manuel.
- **SC-003**: Aucune régression : drag-and-drop, drag-to-resize, filtres, publication, modèles, échanges fonctionnent dans toutes les vues.
- **SC-004**: Les totaux par employé / jour / semaine sont corrects pour les 14 jours en vue `2week`.
- **SC-005**: Le fallback gracieux empêche tout 404 ou écran blanc sur paramètre invalide.

## Assumptions

- On REMPLACE pas `WeekRange` partout — on l'utilise comme un alias de `DateRange` quand la vue est `week` ; pour `2week` on étend simplement la durée. La vue `day` utilise `DateRange = { start: day 00:00, end: nextDay 00:00 - 1ms }`.
- Pas de vue « mois » dans cette phase (coût visuel élevé). Reste pour une phase ultérieure.
- Sur mobile, la vue jour est rendue par un nouveau composant minimaliste (1 colonne) OU par `WeekStackedMobile` filtré à un seul jour. On choisit la solution la plus simple = `WeekStackedMobile` recevant un range de 1 jour.
- Le sélecteur de vue est un `<select>` simple (no segmented control component dans shadcn pour le moment).

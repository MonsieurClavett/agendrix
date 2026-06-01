# Feature Specification: Workflow de publication des horaires

**Feature Branch**: `009-publish-workflow`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 8 — publication brouillon/publié. Les shifts existent désormais avec un état DRAFT ou PUBLISHED. Un MANAGER édite librement les shifts DRAFT ; il publie ensuite une semaine entière en un clic, ce qui rend tous ses shifts DRAFT de cette semaine visibles aux EMPLOYEEs concernés. Tant qu'un shift est DRAFT, seul le MANAGER le voit."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Le MANAGER édite ses brouillons sans risquer de spammer les employés (Priority: P1)

Un MANAGER planifie une semaine de shifts. À leur création, tous les shifts ont l'état DRAFT (brouillon). Tant qu'ils sont en brouillon, le MANAGER les voit sur son calendrier mais aucun EMPLOYEE ne les voit, ni sur son propre calendrier, ni sur sa vue mobile. Sur la vue calendrier du MANAGER, les shifts DRAFT sont visuellement distincts (badge « Brouillon » + bordure pointillée ou opacité réduite) pour qu'il sache lesquels ne sont pas encore communiqués.

**Why this priority**: Sans cet état brouillon, chaque modification d'un MANAGER est visible immédiatement par tous les EMPLOYEEs, ce qui rend impossible la planification itérative. C'est la base de la fonctionnalité.

**Independent Test**: Connecté en MANAGER, créer trois shifts sur la semaine du 13 juillet 2026. Vérifier qu'ils apparaissent sur le calendrier MANAGER avec le visuel « Brouillon ». Se reconnecter en tant qu'EMPLOYEE concerné, naviguer vers les horaires de cette même semaine, vérifier qu'aucun shift n'est visible.

**Acceptance Scenarios**:

1. **Given** un MANAGER qui crée un shift, **When** le shift est enregistré, **Then** son état est DRAFT par défaut.
2. **Given** un MANAGER avec 3 shifts DRAFT pour Bob lundi/mardi/mercredi, **When** Bob ouvre son calendrier de cette semaine, **Then** aucun shift n'apparaît.
3. **Given** le même contexte, **When** le MANAGER affiche sa propre vue calendrier, **Then** les 3 shifts apparaissent avec un marqueur visuel distinctif (badge « Brouillon »).
4. **Given** un MANAGER qui modifie un shift DRAFT, **When** il enregistre, **Then** le shift reste DRAFT et l'EMPLOYEE continue de ne pas le voir.
5. **Given** un MANAGER qui supprime un shift DRAFT, **When** il confirme, **Then** le shift disparaît sans qu'aucune notification ni trace n'aille à l'EMPLOYEE.

---

### User Story 2 - Le MANAGER publie une semaine d'un seul clic (Priority: P2)

Sur la vue calendrier hebdomadaire, un bouton « Publier la semaine » est visible au MANAGER. Quand il clique, tous les shifts DRAFT de la semaine affichée passent à PUBLISHED en une transaction. Une confirmation lui est demandée d'abord (« Publier 12 shifts pour la semaine du 13 juillet 2026 ? »). Une fois publiés, les shifts deviennent immédiatement visibles aux EMPLOYEEs concernés. Le marqueur visuel « Brouillon » disparaît côté MANAGER, remplacé par un état neutre.

**Why this priority**: Sans cette action, les shifts DRAFT restent invisibles pour toujours. C'est la moitié manquante du workflow.

**Independent Test**: MANAGER avec 5 shifts DRAFT sur la semaine du 13 juillet 2026. Cliquer sur « Publier la semaine », confirmer dans le dialog. Vérifier que tous les 5 shifts perdent leur badge « Brouillon ». Se connecter en EMPLOYEE concerné par certains de ces shifts : ils apparaissent maintenant sur son calendrier.

**Acceptance Scenarios**:

1. **Given** une semaine avec 5 shifts DRAFT et 0 PUBLISHED pour la company A, **When** le MANAGER clique « Publier la semaine », confirme, **Then** tous les 5 shifts passent en PUBLISHED en une seule transaction et la vue est rafraîchie.
2. **Given** une semaine avec 3 shifts DRAFT et 2 PUBLISHED, **When** le MANAGER clique « Publier la semaine », **Then** seuls les 3 DRAFT changent ; les 2 PUBLISHED restent inchangés (pas de re-notification).
3. **Given** une semaine avec 0 shift DRAFT, **When** le MANAGER consulte la vue, **Then** le bouton « Publier la semaine » est désactivé ou remplacé par un état « Tout publié ».
4. **Given** un MANAGER d'une company A qui publie sa semaine, **When** la mutation s'exécute, **Then** seuls les shifts de la company A sont publiés ; aucun shift d'une autre company n'est touché.
5. **Given** une semaine avec des shifts publiés, **When** un EMPLOYEE concerné consulte ses horaires, **Then** ces shifts sont visibles et identiques à ce que le MANAGER a vu.

---

### User Story 3 - Un MANAGER peut dépublier un shift (Priority: P3)

Sur un shift PUBLISHED, le MANAGER peut le ramener en DRAFT via une action explicite (« Dépublier ») dans le dialog du shift. Le shift redevient invisible aux EMPLOYEEs jusqu'à la prochaine publication. Cette action est utile pour corriger une erreur d'horaire déjà publié sans le supprimer puis le recréer.

**Why this priority**: Confort utile mais non bloquant — le MANAGER peut toujours supprimer + recréer pour produire le même effet. P3 = nice-to-have.

**Independent Test**: MANAGER ouvre un shift PUBLISHED via le calendrier, clique « Dépublier », confirme. Le shift réapparaît avec le badge « Brouillon ». L'EMPLOYEE concerné ne le voit plus.

**Acceptance Scenarios**:

1. **Given** un shift PUBLISHED, **When** le MANAGER clique « Dépublier » et confirme, **Then** le shift passe en DRAFT et l'EMPLOYEE concerné ne le voit plus.
2. **Given** un shift DRAFT, **When** le MANAGER ouvre son dialog d'édition, **Then** le bouton « Dépublier » n'est pas affiché (le bouton n'existe que sur PUBLISHED).
3. **Given** un EMPLOYEE qui consulte ses horaires, **When** un shift est dépublié, **Then** il disparaît immédiatement après le prochain rafraîchissement (Server Action revalide la route).

---

### Edge Cases

- **Création d'un shift par DnD ou par formulaire** : toujours DRAFT à la création.
- **Modification d'un shift PUBLISHED** : reste PUBLISHED (la modification est immédiatement visible à l'EMPLOYEE). Pas de transition automatique vers DRAFT.
- **Suppression d'un shift PUBLISHED** : autorisée. L'EMPLOYEE ne verra simplement plus le shift au prochain rafraîchissement. Aucune notification.
- **EMPLOYEE qui consulte une semaine sans aucun shift PUBLISHED** : la vue indique « Aucun shift cette semaine » (état vide existant), exactement comme s'il n'y avait littéralement aucun shift.
- **MANAGER qui essaie de publier alors qu'il n'a aucun DRAFT** : le bouton est désactivé ; cliquer ne déclenche rien.
- **Concurrent publish** : si deux MANAGERs publient la même semaine en parallèle, la deuxième publication trouve 0 DRAFT à transformer et complète sans erreur (idempotent).
- **Drag-and-drop** : déplacer un shift DRAFT le garde DRAFT ; déplacer un PUBLISHED le garde PUBLISHED (le statut ne change jamais à cause d'un move).
- **Filtres de la vue MANAGER** : le panneau de filtres existant (Phase 5) ne change pas — il filtre sur positions, pas sur statut. Le statut est purement visuel + côté EMPLOYEE c'est un filtrage serveur.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Chaque shift MUST avoir un champ `status` parmi DRAFT et PUBLISHED. Toute insertion de shift par un MANAGER MUST initialiser ce champ à DRAFT.
- **FR-002**: La vue calendrier d'un EMPLOYEE MUST n'afficher que les shifts dont le statut est PUBLISHED.
- **FR-003**: La vue calendrier d'un MANAGER MUST afficher tous les shifts (DRAFT et PUBLISHED) de sa company, avec un marqueur visuel distinctif sur les DRAFT (badge ou opacité, bordure pointillée).
- **FR-004**: Un MANAGER MUST pouvoir publier en une opération atomique tous les shifts DRAFT de la semaine actuellement affichée — la transition `DRAFT → PUBLISHED` s'applique au filtre `{ companyId, status: DRAFT, week: [start, end] }`.
- **FR-005**: La publication MUST être idempotente : appeler « Publier la semaine » deux fois de suite sans création de shift entre les deux NE doit causer aucun effet observable au second appel (rien à publier).
- **FR-006**: La publication MUST afficher un dialog de confirmation qui annonce le nombre de shifts qui seront publiés et la semaine concernée.
- **FR-007**: Quand 0 shift DRAFT existe pour la semaine affichée, le déclencheur « Publier la semaine » MUST être désactivé ou remplacé par un état visuel "Tout est publié".
- **FR-008**: Un MANAGER MUST pouvoir ramener un shift PUBLISHED à l'état DRAFT (« Dépublier ») via une action explicite dans le dialog d'édition du shift. L'action MUST être visible UNIQUEMENT quand le shift est PUBLISHED.
- **FR-009**: La modification (date, heures, employé, position, note) d'un shift PUBLISHED MUST le laisser PUBLISHED. La modification d'un shift DRAFT MUST le laisser DRAFT. Le drag-and-drop MUST suivre la même règle.
- **FR-010**: La suppression d'un shift à n'importe quel statut MUST réussir sans changement de statut intermédiaire.
- **FR-011**: Le warning hors-disponibilité (Phase 6) et le marqueur d'absence (Phase 7) MUST continuer de s'appliquer à tous les shifts (DRAFT et PUBLISHED) côté MANAGER. Côté EMPLOYEE, ces marqueurs s'appliquent uniquement aux shifts visibles (donc PUBLISHED seulement).
- **FR-012**: Aucun EMPLOYEE de la company A MUST pouvoir consulter, lire ou utiliser un shift DRAFT, même via une requête directe ; le filtrage est imposé côté serveur (repository), pas seulement côté UI.
- **FR-013**: Les disponibilités et les congés des EMPLOYEEs ne sont pas affectés par ce changement.

### Key Entities *(include if feature involves data)*

- **Shift (extension)** : entité existante, gagne un champ `status` (enum `DRAFT | PUBLISHED`).
  - Tous les shifts existants en base avant cette phase MUST être migrés en PUBLISHED (pas de surprise rétroactive).
  - Pas de table séparée, pas de table d'audit pour la transition de statut dans cette phase.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un MANAGER peut publier une semaine de 30 shifts DRAFT en moins de 2 secondes (latence serveur perçue).
- **SC-002**: Un MANAGER peut distinguer visuellement un shift DRAFT d'un shift PUBLISHED en moins d'une seconde au survol de la vue calendrier.
- **SC-003**: 100 % des shifts DRAFT créés par un MANAGER restent invisibles aux EMPLOYEEs jusqu'à la publication explicite (test : aucune fuite à travers les routes EMPLOYEE).
- **SC-004**: 0 fuite cross-tenant : la publication par un MANAGER de la company A ne MUST jamais affecter un shift de la company B (test : insertion de shifts DRAFT dans plusieurs companies, publier la semaine dans la company A, vérifier que les DRAFT de B restent intacts).
- **SC-005**: 0 shift en base avec un statut inattendu après migration (tous les anciens sont PUBLISHED, tous les nouveaux sont DRAFT par défaut).
- **SC-006**: La publication est idempotente : un MANAGER peut cliquer « Publier la semaine » N fois de suite sans modification ni effet de bord après la première (vérifiable en lisant `updatedAt` qui ne bouge pas pour les rows déjà PUBLISHED).

## Assumptions

- **Aucune notification** (email, push, in-app toast persistant) n'est envoyée aux EMPLOYEEs lors d'une publication. L'EMPLOYEE découvre ses shifts en consultant son calendrier — la notification réelle sera ajoutée dans une phase ultérieure (Phase email/notifications).
- **Aucun audit de transition de statut** dans cette phase. `updatedAt` du shift suffit comme trace approximative.
- **Pas de publication partielle** (par exemple « publier uniquement les shifts de Bob ») dans cette phase. Tout DRAFT visible dans la semaine est publié, sans sous-sélection.
- **Pas de planification de publication future** (« publier le vendredi à 17h ») — la publication est synchrone et manuelle.
- **Backfill** : à la migration, tous les shifts existants reçoivent le statut PUBLISHED. Cela préserve le comportement actuel pour les utilisateurs déjà actifs.
- **Granularité hebdomadaire** : la sélection des shifts à publier suit exactement la même `WeekRange` que la vue calendrier (Phase 3+).
- L'invariant tenant et la séparation MANAGER/EMPLOYEE déjà établis par les phases précédentes s'appliquent intégralement à cette feature, sans exception.
- Les warnings calendrier (hors-disponibilité, congé) restent identiques sur les DRAFT et les PUBLISHED côté MANAGER.

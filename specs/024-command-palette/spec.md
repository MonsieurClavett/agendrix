# Feature Specification: Recherche globale (Cmd+K) — palette de commandes

**Feature Branch**: `024-command-palette`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 24 — palette de commandes globale. N'importe où dans le dashboard, l'utilisateur ouvre une palette via Cmd+K (Mac) ou Ctrl+K (Win/Linux). Un champ de recherche avec filtrage flou affiche une liste verticale d'items groupés par type : Navigation (toutes les entrées de la sidebar selon le rôle), Actions rapides (MANAGER seulement : créer un shift, nouvelle annonce, nouveau poste de pointage, inviter un employé), Employés (taper un nom surface « Voir le profil de Bob »), et Récents (5 dernières navigations en localStorage). Sur mobile, un bouton dans le header remplace le raccourci clavier."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - L'utilisateur ouvre la palette via Cmd+K (Priority: P1)

N'importe où dans le dashboard, l'utilisateur appuie sur `Cmd+K` (Mac) ou `Ctrl+K` (Win/Linux). Une modale centrée s'ouvre avec un input texte focus auto et une liste verticale de toutes les entrées de navigation autorisées par son rôle. Il tape « horaire » → la liste filtre en floue à « Horaires ». Il appuie sur `Entrée` → redirigé vers `/schedules`. La palette se ferme.

**Why this priority**: C'est le cœur de la fonctionnalité — sans navigation rapide la palette n'a aucun intérêt.

**Independent Test**: Connecté (MANAGER ou EMPLOYEE), depuis `/dashboard`, appuyer sur `Cmd+K` → palette ouverte. Taper « équ », sélectionner « Équipe », appuyer `Entrée` → arrive sur `/team`.

**Acceptance Scenarios**:

1. **Given** un utilisateur sur n'importe quelle page du dashboard, **When** il appuie `Cmd+K`, **Then** la palette s'ouvre avec l'input focus.
2. **Given** la palette ouverte, **When** il appuie `Esc`, **Then** elle se ferme.
3. **Given** la palette ouverte, **When** il clique en dehors, **Then** elle se ferme.
4. **Given** EMPLOYEE, **When** il ouvre la palette, **Then** aucune entrée MANAGER-only (Équipe, Positions, Rapports, etc.) n'est listée.
5. **Given** MANAGER, **When** il ouvre la palette, **Then** toutes les entrées de la sidebar apparaissent.
6. **Given** la palette ouverte, **When** il navigue avec `↑`/`↓` et appuie `Entrée`, **Then** redirigé et la palette se ferme.
7. **Given** le navigateur réserve `Cmd+K` (barre d'URL Firefox), **When** l'utilisateur appuie le raccourci sur le dashboard, **Then** `preventDefault` empêche le comportement par défaut.

---

### User Story 2 - Le MANAGER exécute une action rapide (Priority: P1)

Un MANAGER ouvre la palette et tape « shift ». Il voit « Créer un shift cette semaine » dans le groupe « Actions rapides ». Il appuie `Entrée` → redirigé vers `/schedules?createShift=1` (ou route équivalente qui ouvre le dialog de création).

**Why this priority**: Le MANAGER gère le rythme de l'app — raccourcir 3 clics en 2 frappes change l'usage quotidien.

**Independent Test**: MANAGER, `Cmd+K`, taper « annonce », sélectionner « Nouvelle annonce », `Entrée` → arrive sur `/annonces/nouvelle` (ou équivalent).

**Acceptance Scenarios**:

1. **Given** MANAGER, **When** il ouvre la palette, **Then** les 4 actions rapides apparaissent dans un groupe dédié : « Créer un shift cette semaine », « Nouvelle annonce », « Nouveau poste de pointage », « Inviter un employé ».
2. **Given** EMPLOYEE, **When** il ouvre la palette, **Then** AUCUNE action rapide n'apparaît.
3. **Given** MANAGER, **When** il sélectionne « Inviter un employé », **Then** redirigé vers `/team?invite=1`.
4. **Given** MANAGER, **When** il sélectionne « Nouveau poste de pointage », **Then** redirigé vers `/punch-locations?new=1`.

---

### User Story 3 - Recherche d'un employé (Priority: P2)

Un MANAGER tape le prénom ou nom d'un employé (« bob ») dans la palette. Un groupe « Employés » apparaît avec « Voir le profil de Bob Tremblay » → clic → redirige vers `/team#bob-id` (ou `/team/[id]` si la page existe).

**Why this priority**: Utile mais secondaire — la navigation et les actions rapides couvrent 90 % des usages.

**Independent Test**: MANAGER avec 5 employés, `Cmd+K`, taper « bob », voir l'entrée Bob, `Entrée` → arrive sur `/team` avec ancre vers Bob.

**Acceptance Scenarios**:

1. **Given** MANAGER, **When** il tape un nom d'employé existant, **Then** une entrée « Voir le profil de <Nom> » apparaît dans le groupe « Employés ».
2. **Given** EMPLOYEE, **When** il tape un nom d'employé, **Then** AUCUNE entrée « Employés » n'apparaît (réservé MANAGER).
3. **Given** un input vide, **Then** le groupe « Employés » n'apparaît PAS (pour ne pas saturer la liste par défaut).
4. **Given** MANAGER d'une autre company, **Then** ne voit AUCUN employé tiers (filtré par `companyId`).

---

### User Story 4 - Items récents (Priority: P2)

L'utilisateur a navigué vers `/schedules`, `/team`, `/conges`, `/annonces`, `/positions` dans la session courante. Il ouvre la palette → un groupe « Récents » liste les 5 dernières navigations dans l'ordre (plus récent en haut), permettant un retour rapide.

**Why this priority**: Cosmétique mais améliore le flow — non bloquant pour la livraison.

**Independent Test**: Naviguer entre 5 routes différentes, ouvrir la palette → voir les 5 dans « Récents » avec la plus récente en tête.

**Acceptance Scenarios**:

1. **Given** un utilisateur ayant visité 7 routes différentes, **When** il ouvre la palette, **Then** seules les 5 plus récentes apparaissent (FIFO).
2. **Given** un EMPLOYEE qui aurait visité une route MANAGER (impossible mais paranoïa), **When** il rouvre la palette, **Then** l'item récent est filtré côté client si l'item n'est plus dans la nav autorisée.
3. **Given** un utilisateur sans historique (premier login), **Then** le groupe « Récents » n'apparaît PAS.
4. **Given** localStorage indisponible (mode privé strict), **Then** la palette fonctionne sans crash, simplement sans groupe « Récents ».

---

### Edge Cases

- **Cmd+K dans un input ou textarea** : la palette s'ouvre quand même — comportement standard (cmdk gère ça).
- **Raccourci navigateur** : `preventDefault` systématique sur l'événement `keydown` correspondant.
- **Mobile (pas de clavier physique)** : un bouton `CommandPaletteTrigger` (loupe + texte « Rechercher… ») visible dans le header ouvre la palette au tap.
- **Trigger desktop** : le même bouton dans le header affiche un badge `⌘K` (Mac) ou `Ctrl K` (Win), purement décoratif.
- **Multiples ouvertures** : si la palette est déjà ouverte, `Cmd+K` la ferme (toggle).
- **Navigation interne** : tout `<Link>` dans la palette ferme la palette via `onSelect`.
- **Items récents stale** : si une route a été supprimée ou est désormais interdite, l'item est silencieusement masqué.
- **localStorage quota** : on stocke max 5 entrées (`href` + `label`), payload < 1 Ko.
- **SSR** : la palette est un Client Component lazy-monté ; pas de référence à `window` au rendu serveur.

## Requirements *(mandatory)*

- **FR-001**: Le raccourci `Cmd+K` (Mac) / `Ctrl+K` (Win/Linux) MUST ouvrir/fermer la palette en mode toggle.
- **FR-002**: `Esc` MUST fermer la palette ; un clic hors modale MUST fermer la palette.
- **FR-003**: L'événement clavier MUST appeler `preventDefault` pour ne pas déclencher le comportement par défaut du navigateur.
- **FR-004**: La palette MUST proposer un filtrage flou côté client (fourni par `cmdk`).
- **FR-005**: Le groupe « Navigation » MUST lister toutes les entrées sidebar autorisées par le rôle de l'utilisateur courant.
- **FR-006**: Le groupe « Actions rapides » MUST n'apparaître que pour les MANAGERs et contenir EXACTEMENT 4 entrées : « Créer un shift cette semaine », « Nouvelle annonce », « Nouveau poste de pointage », « Inviter un employé ».
- **FR-007**: Le groupe « Employés » MUST n'apparaître que pour les MANAGERs ET seulement si l'input contient ≥ 1 caractère.
- **FR-008**: La recherche d'employés MUST être filtrée par `companyId` côté serveur (chargement via Server Component dans le shell).
- **FR-009**: Le groupe « Récents » MUST lire/écrire `localStorage` clé `agendrix:command-palette:recent` (array max 5 d'objets `{ href, label }`).
- **FR-010**: Chaque sélection d'item MUST fermer la palette et naviguer vers `item.href` via `next/navigation`.
- **FR-011**: Sur mobile (largeur < 768 px) un bouton trigger MUST être visible dans le header et ouvrir la palette au tap.
- **FR-012**: Le composant MUST être monté globalement dans `AppShell` pour être accessible depuis toute route `/dashboard`, `/schedules`, `/team`, etc.

### Key Entities *(include if feature involves data)*

Aucune nouvelle entité, aucune migration. Les données proviennent :

- Statiques : `NAV_ITEMS` (déjà défini dans `SidebarNav.tsx`) + liste hardcodée des 4 actions rapides.
- Dynamiques : `User[]` de la company courante (via repository existant ou nouveau `listEmployeesForPalette`).
- Client : `localStorage` (pas de persistance serveur).

## Success Criteria *(mandatory)*

- **SC-001**: La palette s'ouvre en moins de 100 ms après `Cmd+K`.
- **SC-002**: Le filtrage flou affiche les résultats à chaque frappe sans saccade perceptible (≤ 16 ms).
- **SC-003**: Aucun item MANAGER-only n'est jamais visible pour un EMPLOYEE (vérifié par tests d'autorisation).
- **SC-004**: Aucun employé d'une autre company n'apparaît dans la recherche (filtre tenant strict).
- **SC-005**: Sur mobile, le bouton trigger est tappable (zone ≥ 44 × 44 px).
- **SC-006**: Le raccourci `Cmd+K` ne déclenche jamais le comportement par défaut du navigateur sur les pages du dashboard.

## Assumptions

- La librairie `cmdk` (https://cmdk.paco.me) est ajoutée comme dépendance (`npm install cmdk`).
- Aucun composant `command.tsx` n'existe encore dans `src/components/ui/` — création basée sur le template officiel shadcn.
- La liste des employés est chargée au montage de la palette (Server Component qui passe `employees: { id, name }[]` au Client). Pas de recherche serveur live cette phase.
- Pas de recherche full-text dans les notes de shift, annonces, congés, etc. — hors scope (nécessiterait indexation).
- Pas de commandes vocales.
- Pas d'historique partagé entre devices — `localStorage` only.
- Les routes « Actions rapides » utilisent des query params (`?createShift=1`, `?invite=1`, etc.) pour déclencher les dialogs existants. Si une page cible n'a pas encore ce comportement, la route est ouverte sans dialog (dégradé acceptable).

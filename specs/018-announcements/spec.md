# Feature Specification: Annonces internes

**Feature Branch**: `018-announcements`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 18 — annonces internes. Le MANAGER peut publier une annonce courte (titre + corps Markdown léger) visible par tous les employés de la company. Les annonces apparaissent sur le tableau de bord (les 3 plus récentes, plus les épinglées) et sur une page dédiée `/annonces`. Le MANAGER peut épingler, modifier, supprimer. Une notification in-app est créée pour tous les employés à la publication."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Le MANAGER publie une annonce (Priority: P1)

Un MANAGER ouvre `/annonces`. Clique « Nouvelle annonce ». Saisit un titre (« Réunion lundi 9h ») et un corps (« On se voit en salle B pour faire le point sur la rentrée. Apportez vos questions »). Valide. L'annonce est créée, une notification in-app est émise pour CHAQUE employé actif de la company. Sur `/dashboard`, l'annonce apparaît parmi les 3 dernières.

**Why this priority**: C'est le cœur de la fonction. Sans cette US, rien à lire.

**Independent Test**: Connecté en MANAGER, ouvrir `/annonces`, créer « Test annonce » avec corps quelconque. Vérifier : (a) l'annonce existe en base avec `companyId = ctx.companyId`, `authorUserId = ctx.userId`, (b) chaque autre employé actif a une `Notification` type `ANNOUNCEMENT_POSTED`, (c) l'annonce apparaît dans `/dashboard` et `/annonces`.

**Acceptance Scenarios**:

1. **Given** MANAGER avec 4 employés actifs, **When** il crée une annonce, **Then** 4 notifications sont créées (une par employé sauf l'auteur).
2. **Given** un EMPLOYEE, **When** il essaie d'accéder au bouton « Nouvelle annonce », **Then** il n'apparaît pas dans l'UI et l'action serveur refuse.
3. **Given** un MANAGER d'une autre company, **When** il liste les annonces, **Then** aucune annonce d'une company tierce visible.

---

### User Story 2 - Le MANAGER épingle / modifie / supprime (Priority: P1)

Depuis la liste `/annonces`, le MANAGER peut épingler (la place en haut, visible sur dashboard), modifier (titre + corps) ou supprimer une annonce. La suppression cascade aux notifications associées (FK ON DELETE CASCADE).

**Independent Test**: Avec 5 annonces, le MANAGER en épingle 2. Sur `/dashboard`, les 2 épinglées + 1 récente (= 3 visibles). Modifie une annonce → titre changé en base. Supprime → l'annonce disparaît partout.

**Acceptance Scenarios**:

1. **Given** une annonce non épinglée, **When** le MANAGER l'épingle, **Then** `isPinned = true`, l'annonce apparaît en tête de la liste et sur `/dashboard`.
2. **Given** une annonce, **When** le MANAGER édite le titre, **Then** `updatedAt` est mis à jour et le nouveau titre est visible.
3. **Given** une annonce, **When** le MANAGER supprime, **Then** l'annonce et ses notifications sont supprimées en cascade.
4. **Given** un EMPLOYEE, **When** il essaie de pin/edit/delete, **Then** refusé.

---

### User Story 3 - L'employé consulte les annonces (Priority: P2)

Tout utilisateur (MANAGER comme EMPLOYEE) peut consulter `/annonces` et voit la liste complète (épinglées en haut, puis triées par `createdAt desc`). Sur `/dashboard`, un widget « Annonces » montre les 2 épinglées + la dernière non épinglée (max 3). Cliquer sur une annonce dans la notification pop-up redirige vers `/annonces`.

**Independent Test**: Connecté en EMPLOYEE, ouvrir `/annonces` → voit les annonces de sa company. Aucune action de mutation visible.

**Acceptance Scenarios**:

1. **Given** un EMPLOYEE, **When** il ouvre `/annonces`, **Then** il voit la liste en lecture seule (pas de boutons Nouveau / Pin / Edit / Delete).
2. **Given** une notification `ANNOUNCEMENT_POSTED`, **When** il clique dessus, **Then** redirigé vers `/annonces`.

---

### Edge Cases

- **Annonce vide** : titre obligatoire ≥ 1 char et ≤ 120. Corps optionnel ≤ 2000 chars.
- **MANAGER se notifie lui-même** : Non — l'auteur ne reçoit PAS de notification de sa propre annonce.
- **Suppression du MANAGER auteur** : `authorUserId` FK avec `onDelete: SetNull` — l'annonce reste, juste sans auteur affiché.
- **Cross-tenant** : filtré par `companyId` partout.

## Requirements *(mandatory)*

- **FR-001**: Un MANAGER MUST pouvoir créer une `Announcement` avec titre + corps.
- **FR-002**: La création MUST émettre une notification `ANNOUNCEMENT_POSTED` à chaque employé actif de la company SAUF l'auteur, dans la même transaction.
- **FR-003**: Un MANAGER MUST pouvoir épingler/désépingler une annonce.
- **FR-004**: Un MANAGER MUST pouvoir éditer (titre + corps) ou supprimer une annonce.
- **FR-005**: Tout utilisateur MUST pouvoir consulter les annonces de sa company sur `/annonces`.
- **FR-006**: Le `/dashboard` MUST afficher les annonces épinglées + récentes (max 3 visibles).
- **FR-007**: La suppression d'une annonce MUST cascade aux notifications associées.
- **FR-008**: Les annonces MUST être filtrées strictement par `companyId`.

### Key Entities

- **Announcement** : `id`, `companyId` (FK Company onDelete Cascade), `authorUserId` (FK User? onDelete SetNull), `title`, `body`, `isPinned` (default false), `createdAt`, `updatedAt`.

## Success Criteria

- **SC-001**: Un MANAGER publie une annonce en moins de 30s (clic « Nouvelle » → toast succès).
- **SC-002**: Chaque employé actif voit la nouvelle annonce dans son centre de notifications sous 5s.
- **SC-003**: La liste `/annonces` respecte l'ordre épinglées d'abord puis `createdAt desc`.
- **SC-004**: Aucune annonce d'une autre company n'est visible (vérifié par tests tenant).

## Assumptions

- Corps en texte brut (pas de Markdown rendering dans cette phase, juste `whitespace-pre-wrap`).
- Pas d'attachement fichier dans cette phase.
- Pas de réactions/commentaires.
- Le widget dashboard limite à 3 annonces (2 épinglées + 1 récente, ou 3 récentes si pas d'épinglées).

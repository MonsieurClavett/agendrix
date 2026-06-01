# Feature Specification: Notes internes sur shift

**Feature Branch**: `020-shift-internal-notes`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 20 — notes internes sur shift. Le MANAGER peut ajouter une note interne (commentaire, instruction) sur chaque shift. Cette note est INVISIBLE pour l'employé assigné — seuls les MANAGERS la voient. Distincte du champ `note` actuel qui est public."

## User Scenarios & Testing

### User Story 1 - Le MANAGER ajoute une note interne (Priority: P1)

Dans le dialog de création/édition d'un shift, le MANAGER voit un nouveau champ « Note interne (gestionnaires seulement) ». Il saisit « Couvre l'absence de Mark, prévenir si retard ». Sauvegarde. Le champ est persisté.

**Independent Test**: MANAGER ouvre un shift dans le ShiftDialog, saisit une note interne, sauvegarde. Vérifier en base : `Shift.internalNote` mis à jour.

**Acceptance Scenarios**:

1. **Given** un shift sans note interne, **When** le MANAGER saisit « Test », **Then** `internalNote = "Test"`.
2. **Given** un shift avec note interne, **When** le MANAGER vide le champ, **Then** `internalNote = null`.
3. **Given** un EMPLOYEE qui essaie de modifier la note interne via formData truqué, **Then** refusé (action MANAGER-only).

---

### User Story 2 - Le MANAGER voit l'indicateur sur le calendrier (Priority: P1)

Sur le bloc de shift dans le calendrier, si une note interne existe, un petit icône (StickyNote ou MessageSquare) apparaît dans le coin. Hover affiche le contenu en tooltip. Le badge n'est visible QUE pour les MANAGERs.

**Independent Test**: Avec un shift contenant une note interne, ouvrir le calendrier en MANAGER → l'icône apparaît. Ouvrir en EMPLOYEE → l'icône n'apparaît PAS.

**Acceptance Scenarios**:

1. **Given** un shift avec `internalNote`, **When** le MANAGER consulte le calendrier, **Then** une icône de note apparaît sur le bloc.
2. **Given** le même shift, **When** l'EMPLOYEE assigné le consulte, **Then** PAS d'icône, le champ `internalNote` ne sort jamais du serveur.
3. **Given** un MANAGER survole l'icône, **When** le tooltip apparaît, **Then** affiche le contenu de la note.

---

### Edge Cases

- **Note interne longue** : max 500 chars, tronquée dans le tooltip à 200 chars + « … ».
- **Champ `note` public ET `internalNote`** : indépendants — le shift peut avoir les deux.
- **Filtrage de sortie** : le repo `listShiftsForUserWeek` (EMPLOYEE view) ne retourne JAMAIS `internalNote` — sécurité par construction.

## Requirements

- **FR-001**: Ajouter `internalNote: String?` (max 500) au modèle `Shift`.
- **FR-002**: Le repo `listShiftsForCompanyWeek` (MANAGER) inclut `internalNote`.
- **FR-003**: Le repo `listShiftsForUserWeek` (EMPLOYEE) EXCLUT `internalNote`.
- **FR-004**: Les actions `createShift` et `updateShift` acceptent `internalNote` ; refusent l'entrée si appelées par un EMPLOYEE.
- **FR-005**: Le `ShiftDialog` affiche le champ « Note interne » uniquement pour les MANAGERs.
- **FR-006**: Le `ShiftBlock` affiche une icône si `internalNote` existe et que la prop `canMutate` est true (= MANAGER).

### Key Entities

Pas de nouvelle entité. Modif du `Shift` existant : ajout `internalNote: String?`.

## Success Criteria

- **SC-001**: Un EMPLOYEE ne peut JAMAIS voir la note interne d'un de ses shifts (vérifié par les types : `WeekShift` côté EMPLOYEE n'a pas ce champ).
- **SC-002**: Un MANAGER ajoute et voit une note interne en moins de 30s.
- **SC-003**: L'icône d'indication apparaît au bon endroit sans casser le layout.

## Assumptions

- Pas d'historique des notes (modif in-place).
- Pas de mention/notification d'autres MANAGERs sur changement.
- Pas de formatting Markdown (texte brut).

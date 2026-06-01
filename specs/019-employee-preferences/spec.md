# Feature Specification: Préférences employé

**Feature Branch**: `019-employee-preferences`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 19 — préférences employé. Chaque EMPLOYEE peut déclarer : heures min/max souhaitées par semaine, jours préférés (case à cocher Lun-Dim), notes libres. Visibles par le MANAGER au survol/clic du nom de l'employé sur le calendrier (popover) et sur `/team`."

## User Scenarios & Testing

### User Story 1 - L'employé déclare ses préférences (Priority: P1)

Un EMPLOYEE ouvre une nouvelle page `/preferences`. Saisit : « 25h min — 35h max par semaine », coche Lun/Mer/Ven comme jours préférés, ajoute une note libre (« Pas de fermeture, j'ai un transport limité »). Valide. Les préférences sont enregistrées.

**Why this priority**: Cœur de la fonction.

**Independent Test**: Connecté en EMPLOYEE Bob, ouvrir `/preferences`, remplir, sauvegarder. Vérifier en base : `EmployeePreference` existe avec `employeeId = Bob.id`, valeurs correctes.

**Acceptance Scenarios**:

1. **Given** Bob sans préférences, **When** il sauvegarde, **Then** une `EmployeePreference` est créée (upsert).
2. **Given** Bob avec préférences existantes, **When** il sauvegarde de nouveau, **Then** mise à jour (pas duplication).
3. **Given** Bob qui essaie de modifier les préférences d'un autre employé (via formData truqué), **Then** le serveur refuse — `employeeId` est toujours `ctx.userId`.

---

### User Story 2 - Le MANAGER consulte les préférences (Priority: P2)

Sur la page `/team`, à côté du nom de chaque employé, un petit indicateur visible ; cliquer ouvre un panneau qui affiche les préférences (ou « non déclaré »). Aide à la planification.

**Independent Test**: Connecté en MANAGER, ouvrir `/team`. Cliquer sur le bouton « Préférences » d'un employé → affiche les préférences si elles existent.

**Acceptance Scenarios**:

1. **Given** Bob avec préférences, **When** le MANAGER ouvre son popover préférences, **Then** voit min/max/jours/note.
2. **Given** Carol sans préférences, **When** le MANAGER ouvre son popover, **Then** voit « Non déclarées » + invite à ce que Carol les remplisse.
3. **Given** un MANAGER d'une autre company, **Then** ne peut pas voir les préférences d'employés d'autres companies (filtre tenant).

---

### Edge Cases

- **min > max** : refus côté serveur.
- **min ou max négatifs / > 168h** : refus.
- **Aucun jour préféré coché** : autorisé (signifie « aucune préférence forte »).
- **Suppression de l'employé** : préférences cascade.

## Requirements

- **FR-001**: Un EMPLOYEE MUST pouvoir créer/mettre à jour SES préférences (upsert).
- **FR-002**: Le repo MUST refuser un `employeeId` ≠ `ctx.userId` à l'écriture (sauf MANAGER en lecture).
- **FR-003**: Validation : `0 ≤ minHours ≤ maxHours ≤ 168`.
- **FR-004**: `preferredDays` : array Int 1-7 (ISO lundi=1), unique.
- **FR-005**: `notes` : texte libre, max 500 chars.
- **FR-006**: Le MANAGER MUST pouvoir lire les préférences de tout employé actif de sa company.
- **FR-007**: Filtrage strict par `companyId` à toute lecture.

### Key Entities

- **EmployeePreference** : `id`, `companyId`, `employeeId` (unique, FK Cascade), `minHoursPerWeek` (Int?), `maxHoursPerWeek` (Int?), `preferredDays` (Int[]), `notes` (String?), `updatedAt`.

## Success Criteria

- **SC-001**: L'EMPLOYEE remplit ses préférences en moins de 60s.
- **SC-002**: Le MANAGER consulte les préférences d'un employé en 1 clic depuis `/team`.
- **SC-003**: Tenant strict : impossible de voir/modifier les préférences d'une autre company.

## Assumptions

- Préférences = guide visuel pour le MANAGER, PAS de contrainte forte sur la planification (n'empêche pas de planifier 45h pour un employé qui en veut 35).
- Pas de notification au MANAGER quand l'employé met à jour ses préférences (silencieux).

# Feature Specification: Rapports + export CSV

**Feature Branch**: `023-reports-csv`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 23 — rapports + export CSV. Le MANAGER consulte une page `/rapports` qui agrège pour une plage de dates au choix : heures prévues (depuis les shifts), heures réellement travaillées (depuis les pointages), écart, ventilation par employé et par position. Boutons d'export CSV pour ouvrir directement dans Excel."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Le MANAGER consulte les heures par employé sur une plage (Priority: P1)

Le MANAGER ouvre `/rapports`. Sélectionne une plage de dates (par défaut : 7 derniers jours). Voit une table « Heures par employé » avec colonnes : Employé · Prévu (h) · Réel (h) · Écart (h). Triée par heures travaillées décroissantes.

**Why this priority**: C'est le rapport principal pour préparer la paie.

**Independent Test**: Avec 3 employés ayant des shifts et des pointages dans la semaine passée, ouvrir `/rapports` → voir 3 lignes avec heures correctes.

**Acceptance Scenarios**:

1. **Given** Bob a 40h prévues et 38h travaillées sur la plage, **When** le MANAGER ouvre `/rapports`, **Then** la ligne Bob affiche 40h / 38h / -2h.
2. **Given** Carol a 0h prévue mais 5h pointées, **When** le rapport est généré, **Then** sa ligne affiche 0h / 5h / +5h (heures non planifiées).
3. **Given** Dave a 20h prévues et 0h pointées (jamais venu), **Then** sa ligne affiche 20h / 0h / -20h.
4. **Given** un EMPLOYEE qui essaie d'accéder à `/rapports`, **Then** redirigé (MANAGER-only).
5. **Given** un MANAGER d'une autre company, **Then** ne voit aucune donnée tierce.

---

### User Story 2 - Le MANAGER télécharge un CSV (Priority: P1)

Le MANAGER clique « Exporter CSV (par employé) ». Un fichier `agendrix-rapport-2026-06-01-au-2026-06-07.csv` est téléchargé. Ouvert dans Excel : colonnes propres, encodage UTF-8 avec BOM (pour Excel), séparateur `;` (locale FR).

**Why this priority**: Sans export, le rapport reste « pour info ». Avec export, c'est la base de la paie.

**Independent Test**: Cliquer le bouton, vérifier que le fichier téléchargé s'ouvre dans Excel avec les bonnes colonnes et valeurs.

**Acceptance Scenarios**:

1. **Given** une plage de dates et 3 employés, **When** le MANAGER clique « Exporter CSV », **Then** un fichier `.csv` est téléchargé avec 1 ligne d'en-tête + 3 lignes de données.
2. **Given** un employé avec accents ou caractères spéciaux dans le nom, **When** le CSV est ouvert dans Excel, **Then** les caractères s'affichent correctement (UTF-8 BOM).
3. **Given** un EMPLOYEE qui essaie d'appeler l'API CSV directement, **Then** 403.

---

### User Story 3 - Ventilation par position (Priority: P2)

En plus de la table par employé, une table « Heures par position » montre les heures travaillées et prévues ventilées par position (Cuisine, Salle, Caisse, etc.).

**Independent Test**: Avec des shifts liés à différentes positions, vérifier la ventilation.

**Acceptance Scenarios**:

1. **Given** 20h shifts « Cuisine » + 15h shifts « Salle », **Then** la table position affiche 2 lignes.
2. **Given** des shifts sans position assignée, **Then** une ligne « Sans position » apparaît si non-zero.

---

### Edge Cases

- **Session de pointage ouverte (IN sans OUT)** : exclue du calcul d'heures travaillées. Une note discrète à côté de la ligne de l'employé concerné (« 1 session non clôturée »).
- **Plage de dates invalides** : `endDate < startDate` → swap automatique côté serveur.
- **Plage vide** : `0h` partout, tableau toujours rendu (pas d'erreur).
- **Très grande plage (> 90 jours)** : autorisée mais affiche un warning UX.
- **Cross-tenant** : filtré par `companyId` à toute requête.

## Requirements *(mandatory)*

- **FR-001**: La page `/rapports` MUST être MANAGER-only.
- **FR-002**: Les agrégations MUST couvrir : heures prévues (depuis Shift), heures réelles (depuis Punch, sessions IN→OUT closes), écart, par employé.
- **FR-003**: Une seconde agrégation MUST ventiler les heures par position (depuis Shift.positionId).
- **FR-004**: Le bouton CSV MUST déclencher un téléchargement avec : encoding UTF-8 BOM, séparateur `;`, virgule décimale, en-tête en français, nom de fichier daté.
- **FR-005**: Le filtre de plage de dates MUST être contrôlé par l'URL (`?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`) pour être partageable.
- **FR-006**: Une plage invalide MUST fallback à « 7 derniers jours ».
- **FR-007**: Le filtre tenant MUST rester strict — un MANAGER ne peut voir que les données de sa company.

### Key Entities

Aucune nouvelle entité. Pure agrégation des entités existantes (`Shift`, `Punch`, `User`, `Position`).

## Success Criteria

- **SC-001**: Un rapport sur 7 jours pour 10 employés se génère en moins de 2 secondes.
- **SC-002**: Le CSV s'ouvre dans Excel sans erreur d'encodage.
- **SC-003**: Les totaux du CSV matchent les totaux de la page web (cohérence).
- **SC-004**: Aucune donnée d'une autre company n'apparaît dans le CSV (vérifié par filtre tenant).
- **SC-005**: L'écart prévu - réel est calculé correctement, signe inclus (+ pour heures supplémentaires, - pour heures manquantes).

## Assumptions

- Calcul des heures réelles : seules les sessions IN→OUT closes sont comptées. Sessions ouvertes signalées séparément.
- Pas de gestion des pauses non payées dans cette phase (toutes les minutes IN→OUT sont comptées).
- Pas de calcul de coût (taux horaire × heures) — Phase ultérieure.
- Pas de graphique dans cette phase, juste des tables (pas de dépendance recharts).

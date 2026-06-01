# Tasks: Drag-to-resize des shifts

**Feature**: 015-drag-resize
**Plan**: [plan.md](./plan.md)

## Phase 1 — Setup

- [ ] T001 Vérifier qu'aucune migration ni dépendance n'est requise (pure UX).

## Phase 2 — Foundational (helpers)

- [ ] T002 Ajouter une constante locale `DAY_WIDTH_PX_DEFAULT = 240` (ou similaire) dans [src/app/(dashboard)/schedules/_components/ShiftBlock.tsx](src/app/(dashboard)/schedules/_components/ShiftBlock.tsx) avec un commentaire explicatif sur le snap 15 min.

## Phase 3 — User Story 1 (Resize droite) (P1)

- [ ] T003 [US1] Étendre `ShiftBlock` avec une prop optionnelle `onResize?: (shift, newStart, newEnd) => void` et `dayWidthPx?: number`.
- [ ] T004 [US1] Implémenter dans `ShiftBlock` une poignée droite (`<div>` absolu, 5px, cursor `ew-resize`) avec `onPointerDown/Move/Up` qui calcule un snap 15 min, applique les bornes (≥ 15 min, ≤ 24 h), met à jour un state local `previewRange` et appelle `onResize` au relâchement.
- [ ] T005 [US1] Étendre le reducer `useOptimistic` dans [ScheduleCalendar.tsx](src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx) avec un cas `"resize"` (mise à jour de `startsAt`/`endsAt` uniquement).
- [ ] T006 [US1] Implémenter `handleResizeEnd(shift, newStart, newEnd)` dans `ScheduleCalendar.tsx` : dispatch optimiste puis `updateShiftAction` via `startTransition`, toast success/error.
- [ ] T007 [US1] Forwarder `onResize` de `ScheduleCalendar` → [WeekGridDesktop.tsx](src/app/(dashboard)/schedules/_components/WeekGridDesktop.tsx) → `ShiftBlock` (les deux sous-composants `EmployeeGrid` et `PositionGrid`).

## Phase 4 — User Story 2 (Resize gauche) (P1)

- [ ] T008 [US2] Implémenter dans `ShiftBlock` une poignée gauche symétrique (5px à gauche) qui modifie `startsAt` au lieu de `endsAt`. Mêmes bornes.

## Phase 5 — User Story 3 (Feedback visuel) (P2)

- [ ] T009 [US3] Pendant le drag, faire que `ShiftBlock` affiche son label avec la plage en cours (basée sur `previewRange` plutôt que sur les props), pour montrer en temps réel l'heure cible.
- [ ] T010 [US3] Ajouter un effet visuel (ring ou bordure mise en évidence) sur `ShiftBlock` pendant que `previewRange !== null`.

## Phase 6 — Polish

- [ ] T011 Mettre à jour CLAUDE.md (pointeur de phase active → 015).
- [ ] T012 `npx tsc --noEmit` ; corriger toute erreur.
- [ ] T013 `npm run build` ; vérifier que `/schedules` builde correctement.

## Dependencies

- T001 → T002 → T003 → T004 → T005, T006 → T007 (chaîne séquentielle de propagation)
- T004 (droite) → T008 (gauche) ; même mécanique
- T009 → T010 (feedback visuel séquentiel)
- T011 → T012 → T013 (polish séquentiel)

## Parallel Opportunities

- Aucune réelle : tout le travail est concentré sur `ShiftBlock.tsx` + `ScheduleCalendar.tsx`, donc séquentiel pour éviter conflits.

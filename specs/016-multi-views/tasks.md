# Tasks: Vue jour & multi-semaines

**Feature**: 016-multi-views
**Plan**: [plan.md](./plan.md)

## Phase 1 — Setup

- [X] T001 Vérifier qu'aucune migration ni dépendance n'est requise.

## Phase 2 — Foundational (helpers)

- [X] T002 Ajouter `type CalendarView = "week" | "day" | "2week"` dans [src/lib/week.ts](src/lib/week.ts).
- [X] T003 Ajouter `parseViewParam(raw)` dans `src/lib/week.ts`.
- [X] T004 Ajouter `rangeFor(view, anchor)` dans `src/lib/week.ts` qui retourne le `WeekRange` adapté (1 / 7 / 14 jours).
- [X] T005 Ajouter `nextAnchor(view, current)` et `prevAnchor(view, current)` dans `src/lib/week.ts`.
- [X] T006 Ajouter `daysOfRange(range)` dans `src/lib/week.ts` qui retourne N midnights.

## Phase 3 — User Story 1 (Vue jour) (P1)

- [X] T007 [US1] Modifier [src/app/(dashboard)/schedules/page.tsx](src/app/(dashboard)/schedules/page.tsx) : parser `?view` et `?day`, construire le range via `rangeFor(view, anchor)`.
- [X] T008 [US1] Propager `view: CalendarView` via [ScheduleView.tsx](src/app/(dashboard)/schedules/_components/ScheduleView.tsx) → [ScheduleCalendar.tsx](src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx) → [ScheduleToolbar.tsx](src/app/(dashboard)/schedules/_components/ScheduleToolbar.tsx).
- [X] T009 [US1] Modifier [WeekGridDesktop.tsx](src/app/(dashboard)/schedules/_components/WeekGridDesktop.tsx) : remplacer `daysOfWeek(range.start)` par `daysOfRange(range)`. Ajuster `GRID_COLS` pour `${days.length}` colonnes dynamiques.
- [X] T010 [US1] Modifier [WeekStackedMobile.tsx](src/app/(dashboard)/schedules/_components/WeekStackedMobile.tsx) : même remplacement.
- [X] T011 [US1] Modifier `ScheduleToolbar.tsx` : ajouter un `<select>` de vue (Semaine/Jour/2 semaines) qui pousse vers une URL adaptée. Adapter les flèches `<` `>` via `nextAnchor/prevAnchor`. Adapter le bouton « Aujourd'hui ».

## Phase 4 — User Story 2 (Vue 2 semaines) (P1)

- [X] T012 [US2] Ajouter un séparateur visuel entre jour 7 et jour 8 dans `WeekGridDesktop.tsx` (border-l-2 ou label) quand `days.length === 14`.
- [X] T013 [US2] Vérifier que les calculs `rowTotals`, `dayTotals`, `grandTotal` dans [ScheduleCalendar.tsx](src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx) fonctionnent pour 14 jours (la logique est déjà générique, juste valider).

## Phase 5 — User Story 3 (URL partageable) (P2)

- [X] T014 [US3] Vérifier que les params `?view=day&day=YYYY-MM-DD` et `?view=2week&week=YYYY-MM-DD` produisent la bonne vue au premier chargement (Server Component).
- [X] T015 [US3] Gérer le fallback gracieux : `?view=invalid` → `week`, `?day=invalid` → today.

## Phase 6 — Polish

- [X] T016 Mettre à jour CLAUDE.md (pointeur de phase active → 016).
- [X] T017 `npx tsc --noEmit` ; corriger toute erreur.
- [X] T018 `npm run build` ; vérifier que `/schedules` est server-rendered.

## Dependencies

- T001 → T002 à T006 (helpers d'abord)
- T007 → T008 → T009, T010, T011 (propagation séquentielle)
- T012 et T013 séquentiels après T009
- T016 → T017 → T018 (polish séquentiel)

## Parallel Opportunities

- T009 et T010 (desktop + mobile) sont indépendants — [P]
- T002 à T006 sont tous dans le même fichier `week.ts` mais peuvent être implémentés ensemble dans un seul Edit.

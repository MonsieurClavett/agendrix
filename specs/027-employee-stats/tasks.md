# Tasks: Statistiques personnelles employé

**Feature**: 027-employee-stats

## Phase 1 — Foundational

- [X] T001 Créer [src/lib/stats.ts](src/lib/stats.ts) avec helpers `parseRange(value: string | undefined): 7 | 30 | 90`, `dayBucket(date: Date): string`, `weekdayOf(date: Date): 0|1|2|3|4|5|6`, `weekdayLabel(weekday: number): string` (Lun/Mar/...).
- [X] T002 Créer [src/lib/repositories/employeeStats.ts](src/lib/repositories/employeeStats.ts) avec `getStatsForUser(ctx, { range })` retournant la structure complète (totals, preference, punctuality, streak, mostWorkedDayOfWeek, heatmap, distributionByWeekday, distributionByPosition, badges). Réutilise `pairPunches` du repo `punch.ts`.

## Phase 2 — UI atomique (P1)

- [X] T003 [P] Créer [src/app/(dashboard)/me/stats/_components/HeatmapCalendar.tsx](src/app/(dashboard)/me/stats/_components/HeatmapCalendar.tsx) (Server Component, grille CSS, classes Tailwind selon bucket d'heures, tooltip via `title`).
- [X] T004 [P] Créer [src/app/(dashboard)/me/stats/_components/DistributionBars.tsx](src/app/(dashboard)/me/stats/_components/DistributionBars.tsx) (Server Component, normalise sur max, barres CSS pur).
- [X] T005 [P] Créer [src/app/(dashboard)/me/stats/_components/BadgesGrid.tsx](src/app/(dashboard)/me/stats/_components/BadgesGrid.tsx) (Server Component, 6 cards débloquées/verrouillées avec icônes lucide).
- [X] T006 [P] Créer [src/app/(dashboard)/me/stats/_components/RangeSelector.tsx](src/app/(dashboard)/me/stats/_components/RangeSelector.tsx) (Server Component, 3 liens vers `?range=7|30|90` avec état actif).

## Phase 3 — Page principale (P1)

- [X] T007 Créer [src/app/(dashboard)/me/stats/page.tsx](src/app/(dashboard)/me/stats/page.tsx) (Server Component, parse `?range`, appelle `getStatsForUser`, compose PageHeader + RangeSelector + bannière fourchette + 4 stat cards + HeatmapCalendar + 2 DistributionBars + BadgesGrid, EmptyState si aucune donnée, classe `page-enter`).

## Phase 4 — Integration

- [X] T008 Modifier [src/components/shell/SidebarNav.tsx](src/components/shell/SidebarNav.tsx) : ajouter entrée « Mes stats » (TOUS rôles, icône `LineChart` ou `Sparkles`, href `/me/stats`).

## Phase 5 — Polish

- [X] T009 Mettre à jour [CLAUDE.md](CLAUDE.md) : pointer la phase active sur `027-employee-stats` et ajouter `027-employee-stats` à la liste des phases livrées une fois prêt.
- [X] T010 `npx tsc --noEmit` + `npm run build`.

## Dependencies

- T001 → T002 (helpers utilisés par le repo).
- T002 → T007 (la page consomme le repo).
- T003 / T004 / T005 / T006 → T007 (la page compose ces 4 composants).
- T007 → T008 (entrée sidebar pointe vers la route effective).
- T008 → T009 → T010 (polish en dernier).

## Parallel Opportunities

- T003 / T004 / T005 / T006 (4 composants UI indépendants) — [P]

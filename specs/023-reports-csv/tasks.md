# Tasks: Rapports + export CSV

**Feature**: 023-reports-csv

## Phase 1 — Foundational

- [X] T001 Créer [src/lib/csv.ts](src/lib/csv.ts) avec `escapeCsvField`, `formatMinutesAsHours`, `buildCsv(rows, columns)`.
- [X] T002 Créer [src/lib/repositories/reports.ts](src/lib/repositories/reports.ts) avec `getReportForRange(ctx, { startDate, endDate })`. Réutilise `pairPunches` du repo punch.

## Phase 2 — Route Handler CSV (P1)

- [X] T003 Créer [src/app/api/reports/csv/route.ts](src/app/api/reports/csv/route.ts) — MANAGER auth + génère CSV avec BOM + retourne `Response` avec `Content-Disposition: attachment`.

## Phase 3 — UI (P1)

- [X] T004 Créer [src/app/(dashboard)/rapports/page.tsx](src/app/(dashboard)/rapports/page.tsx) (Server Component, parse `?startDate`/`?endDate`, fallback 7 derniers jours).
- [X] T005 Créer [src/app/(dashboard)/rapports/_components/ReportFilters.tsx](src/app/(dashboard)/rapports/_components/ReportFilters.tsx) (Client Component avec 2 inputs date + bouton « Appliquer »).
- [X] T006 Créer [src/app/(dashboard)/rapports/_components/ReportTables.tsx](src/app/(dashboard)/rapports/_components/ReportTables.tsx) — affiche tables par employé + par position avec écart coloré (vert/rouge).

## Phase 4 — Integration

- [X] T007 Modifier [src/proxy.ts](src/proxy.ts) : ajouter `/rapports` (et `/api/reports` accessible via auth).
- [X] T008 Modifier [src/components/shell/SidebarNav.tsx](src/components/shell/SidebarNav.tsx) : ajouter « Rapports » (MANAGER, icône `BarChart3`).

## Phase 5 — Polish

- [X] T009 CLAUDE.md pointeur → 023.
- [X] T010 `npx tsc --noEmit` + `npm run build`.

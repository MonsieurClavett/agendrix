# Implementation Plan: Rapports + export CSV

**Feature**: 023-reports-csv

## Technical Context

Aucune nouvelle entité, aucune migration, aucune nouvelle dépendance. Pure agrégation côté serveur des données déjà collectées (Shift + Punch). Export CSV via Route Handler Next.js (header `Content-Disposition: attachment`).

## Architecture

### Repository (`src/lib/repositories/reports.ts`)

Pure functions, MANAGER-context only :

- `getReportForRange(ctx, { startDate, endDate })` retourne :
  ```ts
  {
    range: { startDate: Date, endDate: Date },
    perEmployee: {
      employeeId, name, email,
      scheduledMinutes, workedMinutes, varianceMinutes,
      openSessionsCount,  // sessions IN sans OUT — info, exclu du worked
    }[],
    perPosition: {
      positionId | null, positionName,
      scheduledMinutes, workedMinutes,
    }[],
    totals: { scheduledMinutes, workedMinutes, varianceMinutes },
  }
  ```

Algorithme :
1. Charger les shifts dont (startsAt ≥ startDate) ET (startsAt ≤ endDate). On groupe par `employeeId` et `positionId`, accumule `endsAt - startsAt` en minutes.
2. Charger les punches dont (punchedAt ≥ startDate) ET (punchedAt ≤ endDate). On utilise `pairPunches(rows)` du repo `punch.ts` pour transformer en sessions, on accumule `durationMinutes` (closed only) par employé.
3. Combine les deux maps par `employeeId`.
4. Calcule variance = worked - scheduled.

### Route Handler (`src/app/api/reports/csv/route.ts`)

Standard Next.js Route Handler :
- Vérifie auth via `requireManagerContext()`.
- Lit `startDate`/`endDate` des query params.
- Appelle `getReportForRange()`.
- Construit le CSV string : BOM (`﻿`), header, lignes.
- Retourne `new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=..." }})`.

### Format CSV

```
Employé;Email;Heures prévues;Heures travaillées;Écart;Sessions ouvertes
Bob Tremblay;bob@…;40,00;38,50;-1,50;0
Carol Lavoie;carol@…;0,00;5,25;+5,25;1
```

- Séparateur `;` (locale FR), virgule décimale, encoding UTF-8 BOM (compat Excel FR).
- Helper `escapeCsvField(s)` qui double les `"` et entoure si contient `;` ou `\n`.

### UI (`/rapports` page)

Server Component :
- Filtre de plage : 2 inputs date HTML (déjà supportés par tous les navigateurs modernes).
- Lien « Reset » qui revient aux 7 derniers jours.
- 4 stat cards en haut : heures prévues total, heures réelles total, écart total, employés actifs.
- 2 tables : « Heures par employé » et « Heures par position ».
- 2 boutons d'export : « CSV par employé » et « CSV par position » qui pointent vers le route handler avec les params.

## File Tree

```
src/lib/repositories/reports.ts                  (nouveau)
src/lib/csv.ts                                   (nouveau — helpers escape/build)
src/app/api/reports/csv/route.ts                 (nouveau)
src/app/(dashboard)/rapports/page.tsx            (nouveau)
src/app/(dashboard)/rapports/_components/
  ReportFilters.tsx                              (nouveau)
  ReportTables.tsx                               (nouveau)

src/proxy.ts                                     (modifié — /rapports + /api/reports)
src/components/shell/SidebarNav.tsx              (modifié — entrée "Rapports")
```

## Risks & Mitigations

- **R1 : Performances sur grande plage** — pour 1 an, requêtes pourraient être lentes. Mitigation : déjà 2 requêtes simples (shifts + punches) avec index, OK pour 1000 shifts.
- **R2 : Encoding Excel** — Excel FR par défaut ouvre UTF-8 mal sans BOM. Mitigation : préfixer `﻿` au CSV.
- **R3 : Cross-tenant via route handler** — Mitigation : `requireManagerContext()` au début du handler, filtre tenant intrinsèque dans la repo.

## Quickstart

1. `npm run dev`
2. MANAGER ouvre `/rapports` → voit les 7 derniers jours par défaut.
3. Change la plage de dates → tables rafraîchies.
4. Clique « Exporter CSV par employé » → fichier téléchargé.
5. Ouvre le CSV dans Excel → vérifie les caractères et les chiffres.

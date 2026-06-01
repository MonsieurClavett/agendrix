# Implementation Plan: Statistiques personnelles employé

**Feature**: 027-employee-stats

## Technical Context

Aucune nouvelle entité, aucune migration, aucune nouvelle dépendance. Pure agrégation côté serveur des données déjà collectées (Shift + Punch + EmployeePreference + Position). Visualisations CSS uniquement. Réutilise `pairPunches()` du repo `punch.ts` (déjà mature depuis Phase 22) pour le calcul des sessions closes. Réutilise les conventions de la Phase 23 (`/rapports`) pour le filtre par plage de temps.

## Architecture

### Entités

Aucune. Lecture seule sur `Shift`, `Punch`, `EmployeePreference`, `Position`, `User`.

### Repository (`src/lib/repositories/employeeStats.ts`)

Pure functions, tenant-scoped. Le contexte est celui de l'utilisateur connecté (EMPLOYEE ou MANAGER) — c'est toujours `ctx.userId` qui est agrégé.

- `getStatsForUser(ctx, { range })` retourne :
  ```ts
  {
    range: { days: 7 | 30 | 90, startDate: Date, endDate: Date },
    totals: {
      workedHours: number,         // depuis sessions closes
      scheduledHours: number,      // depuis Shift
      varianceHours: number,       // worked - scheduled, signed
      workedDays: number,          // jours distincts avec au moins une session close
      avgHoursPerWorkedDay: number,
    },
    preference: {
      minHoursPerWeek: number,
      maxHoursPerWeek: number,
      status: "IN_RANGE" | "BELOW" | "ABOVE",
      deltaHours: number,          // signed gap to nearest bound
    } | null,
    punctuality: {
      sampleCount: number,         // IN punches matched to a shift
      onTimeCount: number,
      score: number | null,        // pct, null si sampleCount = 0
    },
    streak: { currentDays: number },
    mostWorkedDayOfWeek: { weekday: 0|1|2|3|4|5|6, hours: number } | null,
    heatmap: Array<{ date: string, hours: number }>,  // length = range.days
    distributionByWeekday: Array<{ weekday: 0|1|2|3|4|5|6, hours: number }>,
    distributionByPosition: Array<{ positionId: string | null, positionName: string, hours: number }>,
    badges: {
      firstWeek: boolean,          // ≥ 5 sessions
      hours50: boolean,
      hours100: boolean,
      punctual: boolean,           // score ≥ 90 && score !== null
      marathon: boolean,           // streak ≥ 7
      lateNight: boolean,          // ≥ 1 session ending past 22h00
    },
  }
  ```

Algorithme :
1. Calcule `startDate` et `endDate` (now). `endDate = today 23h59`, `startDate = today - (range-1) jours 00h00`.
2. Charge en parallèle :
   - `shift.findMany({ where: { companyId, employeeId: ctx.userId, startsAt: { gte: startDate, lte: endDate } }, include: { position: { select: { id, name } } } })`
   - `punch.findMany({ where: { companyId, employeeId: ctx.userId, punchedAt: { gte: startDate, lte: endDate } }, orderBy: { punchedAt: "asc" } })`
   - `employeePreference.findUnique({ where: { companyId_userId: { companyId, userId: ctx.userId } } })` (ou pattern existant)
3. Transforme les punches en sessions via `pairPunches(rows)`. Filtre `durationMinutes` sur sessions closes.
4. Calcule chaque métrique en mémoire (cf. helpers ci-dessous).
5. Pour la ponctualité : pour chaque punch IN, cherche le shift de l'utilisateur dont `startsAt` est dans une fenêtre de ±6h autour du `punchedAt` (cohérent avec la logique d'écart de Phase 22).

### Helpers internes (même fichier ou `src/lib/stats.ts`)

- `dayBucket(date)` → ISO date string `YYYY-MM-DD` (clé heatmap).
- `weekdayOf(date)` → 0 (Lun) … 6 (Dim).
- `parseRange(rangeStr): 7 | 30 | 90` avec fallback 30.

### Server Actions

Aucune. La page est en lecture seule (Server Component + query param).

### Route Handlers

Aucun.

### UI

**`/me/stats`** (Server Component, EMPLOYEE et MANAGER) :
- Parse `?range` (fallback 30).
- Appelle `getStatsForUser(ctx, { range })`.
- Layout :
  1. `PageHeader` avec titre « Mes statistiques » + sélecteur de plage (3 boutons « 7j / 30j / 90j » en liens vers `?range=`).
  2. Bannière fourchette si `preference !== null` (vert si IN_RANGE, orange sinon).
  3. 4 stat cards (grid responsive) : Heures travaillées, Heures planifiées, Écart (vert/rouge selon signe), Ponctualité (% ou « N/A »).
  4. Section « Activité quotidienne » avec `<HeatmapCalendar data={heatmap} />`.
  5. Section « Répartition par jour de la semaine » avec `<DistributionBars data={distributionByWeekday} format="weekday" />`.
  6. Section « Répartition par position » avec `<DistributionBars data={distributionByPosition} format="position" />`.
  7. Section « Mes badges » avec `<BadgesGrid badges={badges} />`.
- Page wrapper avec classe `page-enter`.
- Si toutes les valeurs sont à 0 (nouvel utilisateur), affiche `EmptyState` central avec message d'encouragement.

**`HeatmapCalendar.tsx`** (Server Component) :
- Reçoit `Array<{ date, hours }>`.
- Render grid CSS (grille responsive, ~10 colonnes max).
- Pour chaque case : `<div title="<date> · <hours>h" className={bucketClass(hours)} />` avec classes Tailwind :
  - `0` → `bg-muted`
  - `<4` → `bg-blue-200`
  - `<7` → `bg-blue-400`
  - `>=7` → `bg-blue-600`
- Légende discrète en bas (4 cases avec labels).

**`DistributionBars.tsx`** (Server Component) :
- Reçoit `Array<{ label, hours }>` (le composant transforme weekday → « Lun / Mar / … » ou prend directement le `positionName`).
- Calcule `maxHours` pour normaliser.
- Render une rangée par item : `<div className="flex items-center gap-2"><span className="w-20">{label}</span><div className="h-3 bg-blue-500 rounded" style={{ width: (hours / max * 100) + '%' }} /><span className="text-sm tabular-nums">{hours}h</span></div>`.

**`BadgesGrid.tsx`** (Server Component) :
- Grille de 6 cards. Chaque card : icône (`lucide-react`) + titre + description courte.
- Card débloquée : couleur vive (e.g. `bg-amber-100 text-amber-900`).
- Card verrouillée : grisée (`bg-muted text-muted-foreground opacity-60`) avec une description « Comment débloquer : … ».
- Icônes suggérées : `Sparkles` (Première semaine), `Trophy` (50h, 100h), `Clock` (Ponctuel), `Zap` (Marathon), `Moon` (Sortie tardive).

### Sidebar entries

- « Mes stats » (TOUS rôles) → `/me/stats` (icône `LineChart` ou `Sparkles`).

### Proxy

Déjà couvert par le matcher `/me/*` introduit en Phase 22. Aucun changement.

### Notifications

Aucune. Les badges sont découverts en visitant la page (cf. Assumptions du spec).

## File Tree

```
src/lib/repositories/employeeStats.ts                              (nouveau)
src/lib/stats.ts                                                   (nouveau — helpers dayBucket, weekdayOf, parseRange)

src/app/(dashboard)/me/stats/page.tsx                              (nouveau)
src/app/(dashboard)/me/stats/_components/HeatmapCalendar.tsx       (nouveau)
src/app/(dashboard)/me/stats/_components/DistributionBars.tsx      (nouveau)
src/app/(dashboard)/me/stats/_components/BadgesGrid.tsx            (nouveau)
src/app/(dashboard)/me/stats/_components/RangeSelector.tsx         (nouveau — 3 liens ?range=)

src/components/shell/SidebarNav.tsx                                (modifié — entrée "Mes stats" pour TOUS)
```

## Risks & Mitigations

- **R1 : Performance sur grande plage (90 jours).** Mitigation : 2 requêtes simples avec index existants (`companyId, punchedAt`, `companyId, startsAt`), calcul en mémoire en O(n) sur n ≤ ~600 lignes. SC-001 fixe la cible à 500 ms.
- **R2 : Cohérence avec `/rapports`.** Mitigation : on réutilise la même fonction `pairPunches` et la même définition « sessions closes ». SC-003 vérifie la cohérence.
- **R3 : Comparaison hebdo vs plage variable.** Mitigation : on documente clairement dans le spec (Assumptions) que la comparaison est brute, sans pro-rata. Simple et lisible.
- **R4 : Fuseau horaire pour les bornes de jour.** Mitigation : heure locale serveur, cohérent avec phases précédentes. À documenter une fois pour toutes dans la doc projet.
- **R5 : Cross-tenant.** Mitigation : repo prend `ctx`, force `companyId: ctx.companyId` et `employeeId: ctx.userId` à toute requête.

## Constitution Check

- ✅ Multi-tenant strict (filtre `companyId` et `employeeId: ctx.userId` à toute requête).
- ✅ Pas d'accès Prisma direct hors repo.
- ✅ Pas de mutation, donc pas de Server Action — aucune surface d'attaque côté écriture.
- ✅ Pas d'over-engineering : aucune entité, aucune lib, aucune notification.

## Quickstart

1. `npm run dev`
2. EMPLOYEE Bob ouvre `/me/stats` → voit ses stats des 30 derniers jours.
3. Clique « 7j » → URL devient `?range=7`, page recalcule.
4. Clique « 90j » → heatmap affiche 90 cases.
5. Vérifier qu'un MANAGER voit SES propres stats sur la même page (rôle indifférent).
6. Vérifier qu'un user d'une autre company ne peut accéder à des données tierces (filtre tenant).

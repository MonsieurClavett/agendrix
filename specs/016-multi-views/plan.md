# Implementation Plan: Vue jour & multi-semaines

**Feature**: 016-multi-views
**Spec**: [spec.md](./spec.md)
**Created**: 2026-06-01

## Technical Context

Pure UX & URL. Aucune migration. Aucune nouvelle dépendance. La logique principale reste dans la page Server Component `/schedules` qui parse `searchParams` et construit le bon `DateRange`.

## Constitution Check

- ✅ **Multi-tenant** : on continue à utiliser les repositories existants qui filtrent par `companyId`. La forme du `DateRange` change, pas le tenant guard.
- ✅ **Repositories only** : aucun Prisma direct ajouté.
- ✅ **Pas d'over-engineering** : pas de vue mois, pas de vue année, pas de plage arbitraire — 3 vues prédéfinies.

## Architecture Decisions

### `DateRange` comme généralisation de `WeekRange`

Dans [src/lib/week.ts](src/lib/week.ts), `WeekRange = { start: Date; end: Date }`. On l'utilisera tel quel sous le nom `DateRange` (juste un alias mental) — le type est déjà assez générique. Pas besoin de renommer ; on documente que `WeekRange` accepte n'importe quelle plage [start, end).

### Nouveau helper `parseViewParams`

Ajouter dans [src/lib/week.ts](src/lib/week.ts) :

```ts
export type CalendarView = "week" | "day" | "2week";

export function parseViewParam(raw: string | undefined): CalendarView {
  if (raw === "day" || raw === "2week") return raw;
  return "week";
}

export function rangeFor(view: CalendarView, anchor: Date): WeekRange {
  if (view === "day") {
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    const end = addDays(start, 1);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { start, end };
  }
  if (view === "2week") {
    const monday = mondayOfWeek(anchor);
    const end = addDays(monday, 14);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { start: monday, end };
  }
  return weekRangeFrom(mondayOfWeek(anchor));
}

export function nextAnchor(view: CalendarView, current: Date): Date {
  return addDays(current, view === "day" ? 1 : view === "2week" ? 14 : 7);
}
export function prevAnchor(view: CalendarView, current: Date): Date {
  return addDays(current, view === "day" ? -1 : view === "2week" ? -14 : -7);
}
```

### Modifs `/schedules/page.tsx`

- Parse `?view`, `?day`, `?week`.
- Pour `view=day`, l'ancre est `day` (fallback today). Range = 1 jour.
- Pour `view=week` ou `view=2week`, l'ancre est `week` (fallback today). Range = 7 ou 14 jours.
- Le reste de la page (Promise.all, ScheduleView) reçoit le `range` et la `view` ; pas de découplage entité-par-entité.

### Modifs `WeekGridDesktop`

Remplacer `daysOfWeek(range.start)` (fixé à 7) par `daysOfRange(range)` qui renvoie le bon nombre de jours (1 / 7 / 14).

Ajouter un helper :

```ts
export function daysOfRange(range: WeekRange): Date[] {
  const days: Date[] = [];
  const cur = new Date(range.start);
  cur.setHours(0, 0, 0, 0);
  while (cur < range.end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}
```

Le `GRID_COLS` doit s'adapter au nombre de colonnes : on remplace `220px repeat(7, …)` par `220px repeat(${days.length}, …)` calculé inline.

Le séparateur visuel entre semaine 1 et semaine 2 en vue `2week` : on peut ajouter une `border-l-2` sur le 8e jour (`days.length === 14 && index === 7`).

### Modifs `WeekStackedMobile`

Même technique : remplacer `daysOfWeek(range.start)` par `daysOfRange(range)`. Le composant rend `N` sections empilées.

### Modifs `ScheduleToolbar`

Ajouter un `<select>` de vue à droite de la barre. Reflète l'URL en sortant un `<Link>` qui préserve les autres params (`day` ou `week`).

Pour les flèches `<` `>`, calculer `prevHref` et `nextHref` selon la vue.

### Modifs des composants intermédiaires

`ScheduleView` et `ScheduleCalendar` doivent recevoir `view: CalendarView` pour le forwarder à `ScheduleToolbar`. Pas de modification ailleurs.

## File Tree

```
src/lib/week.ts                                                       (modifié — +helpers)
src/app/(dashboard)/schedules/page.tsx                                (modifié — parse view)
src/app/(dashboard)/schedules/_components/ScheduleView.tsx            (modifié — prop view)
src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx        (modifié — prop view)
src/app/(dashboard)/schedules/_components/ScheduleToolbar.tsx         (modifié — select + nav arrows)
src/app/(dashboard)/schedules/_components/WeekGridDesktop.tsx         (modifié — daysOfRange)
src/app/(dashboard)/schedules/_components/WeekStackedMobile.tsx       (modifié — daysOfRange)
```

Pas de nouveau fichier.

## Risks & Mitigations

- **R1 : rupture de typage `WeekRange` → `DateRange`.** Mitigation : on ne renomme PAS, on utilise `WeekRange` comme alias générique. Pas de churn.
- **R2 : Drag-and-drop cible incorrect en vue 2 semaines.** Mitigation : la cellule de drop encode déjà `YYYY-MM-DD|emp:id`. Le calcul `addDays` côté handler est indépendant du nombre de colonnes. Aucune modif.
- **R3 : Mauvaise navigation des flèches.** Mitigation : helper `nextAnchor` / `prevAnchor` factorisé, testable.
- **R4 : `?day=invalid`.** Mitigation : `parseWeekParam` gère déjà le fallback. On l'utilise aussi pour le `day` param avec un fallback `today`.

## Quickstart

1. `npm run dev`
2. MANAGER ouvre `/schedules` → vue semaine par défaut.
3. Clique le select « Semaine » et choisit « Jour » → URL devient `?view=day&day=YYYY-MM-DD`. Le grid affiche 1 colonne.
4. Clique `>` → avance d'un jour.
5. Bascule en « 2 semaines » → 14 colonnes, séparateur entre jour 7 et jour 8.
6. Copie l'URL, ouvre dans un autre onglet → même état.

## Constitution Recheck

- ✅ Aucune nouvelle voie d'accès aux données.
- ✅ Pas de nouvelle entité, pas de nouvelle Server Action.
- ✅ Tous les invariants tenant et MANAGER-only restent intacts.

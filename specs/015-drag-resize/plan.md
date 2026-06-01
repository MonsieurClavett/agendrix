# Implementation Plan: Drag-to-resize des shifts

**Feature**: 015-drag-resize
**Spec**: [spec.md](./spec.md)
**Created**: 2026-06-01

## Technical Context

Pure UX. Stack identique, aucune nouvelle dépendance. Le redimensionnement se fait via un handler manuel `onPointerDown/Move/Up` plutôt que `@dnd-kit` (qui sert pour le drag-and-drop existant et n'a pas de primitive resize prête à l'emploi).

## Constitution Check

- ✅ **Multi-tenant** : on réutilise `updateShift(ctx, shiftId, ...)` qui filtre déjà par `companyId`.
- ✅ **MANAGER guard** : la Server Action reste protégée par `requireManagerContext`.
- ✅ **Repositories only** : aucun Prisma direct en UI.
- ✅ **Pas d'over-engineering** : pas de nouvelle entité, pas de migration, pas de dépendance.

## Architecture Decisions

### Pas de nouvelle Server Action — on étend l'existante

`updateShiftAction` accepte déjà tous les champs requis pour persister une modification d'heures. On va simplement appeler cette action depuis le handler de drag-to-resize, en envoyant les nouveaux `start`/`end` calculés. Avantage : zéro duplication, on bénéficie automatiquement de l'overlap check et de l'audit.

Justification de NE PAS créer `resizeShiftAction` dédiée :
- Le payload est identique à un update (les autres champs sont juste passés inchangés).
- L'overlap check, le filtre tenant, et la revalidation sont déjà en place.
- Une nouvelle action serait un doublon que le user devrait maintenir en parallèle.

### Composant `ShiftBlock` — ajout de 2 poignées

Modifier [src/app/(dashboard)/schedules/_components/ShiftBlock.tsx](src/app/(dashboard)/schedules/_components/ShiftBlock.tsx) :

- Ajouter une nouvelle prop `onResize?: (newStart: Date, newEnd: Date) => void` qui sera appelée au relâchement.
- Si `canDrag && onResize`, rendre deux `<div>` absolument positionnés :
  - Poignée gauche : `left: 0, top: 0, bottom: 0, width: 5px, cursor: ew-resize`.
  - Poignée droite : `right: 0, top: 0, bottom: 0, width: 5px, cursor: ew-resize`.
- Sur `onPointerDown` d'une poignée :
  - Capturer `pointerId`, `e.target.setPointerCapture(pointerId)`.
  - Stocker en state local : `{ edge: "left"|"right", originX, originStart, originEnd }`.
  - Préventer la propagation pour ne PAS déclencher le drag-and-drop de `@dnd-kit`.
- Sur `onPointerMove` :
  - Calculer `deltaX = e.clientX - originX`.
  - Convertir en minutes via `MINUTES_PER_PX` (constante, calibrée à `15 / 25` ou similaire selon la largeur du jour).
  - Snap à 15 minutes : `deltaMinutes = Math.round(rawMinutes / 15) * 15`.
  - Calculer le nouveau `startsAt` / `endsAt` (selon `edge`).
  - Appliquer les bornes : durée ≥ 15min, durée ≤ 24h.
  - Mettre à jour un state local `previewRange` pour afficher la nouvelle plage.
- Sur `onPointerUp` :
  - Appeler `onResize(newStart, newEnd)`.
  - Le parent (`ScheduleCalendar`) appelle ensuite `updateShiftAction` via `startTransition` + `useOptimistic`.

### Calcul de `MINUTES_PER_PX`

Le grid desktop a une largeur de jour fixe. On peut soit :
- (a) Mesurer la largeur du cell parent via `getBoundingClientRect()` au `pointerDown`.
- (b) Utiliser une constante : 1 jour = 1440 minutes. Si on suppose 200px par jour → 1440/200 = 7.2 min/px, et 25px = ~3.5 min. Trop grossier pour des snaps de 15min.

→ Approche (a) : on mesure la largeur du day-cell au moment du drag (passé en prop ou via un parent ref). Plus précis et auto-adaptable au resize de la fenêtre.

Décision : **passer `dayWidthPx` via une nouvelle prop sur `ShiftBlock`** depuis le parent `WeekGridDesktop`, qui dispose du layout. Le parent peut mesurer la cellule via un `ref` ou une `ResizeObserver`. Pour MVP, on passe une **constante** par défaut (`240`) et on documente comment l'affiner.

### ScheduleCalendar — handleResizeEnd

Dans [ScheduleCalendar.tsx](src/app/(dashboard)/schedules/_components/ScheduleCalendar.tsx), ajouter :

```ts
const handleResizeEnd = (shift, newStart, newEnd) => {
  startTransition(async () => {
    dispatchOptimistic({ type: "resize", shiftId: shift.id, newStartsAt: newStart, newEndsAt: newEnd });
    const fd = new FormData();
    fd.append("shiftId", shift.id);
    fd.append("employeeId", shift.employeeId ?? "");
    fd.append("date", toISODate(newStart));
    fd.append("start", formatHHMM(newStart));
    fd.append("end", formatHHMM(newEnd));
    if (shift.note) fd.append("note", shift.note);
    if (shift.positionId) fd.append("positionId", shift.positionId);
    const result = await updateShiftAction({}, fd);
    if (result.success) toast.success("Shift redimensionné.");
    else if (result.error) toast.error(result.error);
  });
};
```

Et étendre le reducer `useOptimistic` pour accepter le type `"resize"` (similaire à `"move"`, sans changer l'employeeId/positionId).

Cette fonction est forwardée jusqu'à `ShiftBlock` via les composants intermédiaires (`WeekGridDesktop`, `EmployeeGrid`, `PositionGrid`).

### Pourquoi pas un overlay de drag visuel ?

Le bloc lui-même est resize-able : en mettant à jour son `width` (via state local `previewRange`), on a déjà le feedback visuel. Pas besoin d'un overlay séparé comme `DragOverlay` de `@dnd-kit`.

## File Tree

```
src/app/(dashboard)/schedules/_components/
  ShiftBlock.tsx                   (modifié — 2 poignées + handlers)
  ScheduleCalendar.tsx             (modifié — handleResizeEnd + reducer "resize")
  WeekGridDesktop.tsx              (modifié — forward onResize aux ShiftBlock)
```

Aucun fichier nouveau. Aucune migration. Pas de nouvelle Server Action.

## Risks & Mitigations

- **R1 : Conflit avec drag-and-drop de @dnd-kit.** Mitigation : poignées de 5px en `position: absolute`, on stoppe `e.stopPropagation()` au `pointerDown` pour ne pas déclencher dnd-kit.
- **R2 : Largeur du jour mal estimée → snap imprécis.** Mitigation : MVP avec constante 240px ; l'utilisateur peut affiner par observation. À documenter dans le quickstart.
- **R3 : Drag inversé (poignée gauche dépassant la droite).** Mitigation : borne `durée ≥ 15 min` empêche le résultat invalide.
- **R4 : Mobile.** Mitigation : ne rendre les poignées que dans `WeekGridDesktop` (jamais dans `WeekStackedMobile`). La mobile-only branche ne reçoit même pas la prop `onResize`.

## Quickstart

1. `npm run dev`
2. MANAGER ouvre `/schedules`, repère un shift Bob 8h–12h.
3. Survole le bord droit → curseur `ew-resize`.
4. Presse, glisse de quelques crans à droite, relâche → toast « Shift redimensionné ».
5. Recharge la page → la nouvelle plage est persistée.
6. Vérifie qu'EMPLOYEE Bob ne voit AUCUNE poignée sur ses propres shifts.

## Constitution Recheck

- ✅ Pas de nouvelle action, repository inchangé.
- ✅ Pure UX side, aucun risque d'injection ou d'élévation de privilège.

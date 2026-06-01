# Implementation Plan: Modèles d'horaire récurrents

**Feature**: 014-recurring-templates
**Spec**: [spec.md](./spec.md)
**Created**: 2026-06-01

## Technical Context

Stack inchangé : Next.js 16 App Router + Prisma 6 + Postgres Neon + Auth.js v5 + Tailwind v4 + shadcn/ui. Tout passe par `requireManagerContext()` car cette phase est MANAGER-only de bout en bout.

## Constitution Check

- ✅ **Multi-tenant strict** : tout filtrage sur `companyId`, jamais d'IDs croisés.
- ✅ **Repositories only** : aucun accès Prisma direct depuis Server Action ou page.
- ✅ **MANAGER guard** : `requireManagerContext` en entrée de chaque action.
- ✅ **Pas d'over-engineering** : pas de versionnage de modèles, pas de variables (semaine A/B/C), une seule entité parent + une enfant.

## Architecture Decisions

### Entités (data-model.md résumé)

**`ScheduleTemplate`** :
- `id` (cuid), `companyId` (FK Company, onDelete Cascade), `name` (String), `createdByUserId` (FK User, onDelete SetNull), `createdAt`, `updatedAt`
- Unique : `(companyId, name)`
- Index : `(companyId, createdAt desc)` pour la liste

**`ScheduleTemplateShift`** :
- `id` (cuid), `templateId` (FK ScheduleTemplate, onDelete Cascade), `employeeId` (FK User?, onDelete SetNull), `positionId` (FK Position?, onDelete SetNull)
- `dayOfWeek` (Int, 1–7 ISO, lundi=1)
- `startHour` (Int, minutes depuis 00:00 → ex 18:30 = 1110), `endHour` (Int, minutes)
- `endDayOffset` (Int, 0 ou 1 — gère les shifts traversant minuit)
- `note` (String?)
- Index : `(templateId, dayOfWeek)`

**Justification du stockage en minutes (Int)** plutôt qu'en `DateTime` : un modèle n'a pas de date absolue, juste un jour-de-semaine + une heure. Stocker comme `Int` évite de jouer avec des `DateTime` fictifs (epoch 0 + offset) qui posent des problèmes de timezone.

### Repository (`src/lib/repositories/scheduleTemplate.ts`)

Fonctions exportées :

- `listTemplates(ctx) : Promise<TemplateRow[]>` — liste de la company avec count des shifts, ordre `createdAt desc`.
- `getTemplate(ctx, templateId) : Promise<TemplateDetail | null>` — détail + tous les `ScheduleTemplateShift` (pour preview ou debug).
- `createTemplateFromWeek(ctx, input: { name, weekStart })` — transactionnel :
  1. Compte les shifts dans `[weekStart, weekStart+7)` de la company.
  2. Si 0 → throw `EMPTY_WEEK`.
  3. Si `name` existe déjà (P2002) → throw `NAME_TAKEN`.
  4. Crée le `ScheduleTemplate`.
  5. Pour chaque shift, calcule `dayOfWeek` (ISO 1=lundi), `startHour`/`endHour` en minutes locales, `endDayOffset = dateDiff(endDate, startDate)`, insère un `ScheduleTemplateShift`.
- `applyTemplate(ctx, input: { templateId, weekStart })` — transactionnel :
  1. Charge le template + ses shifts (404 si template d'une autre company).
  2. Charge la liste d'employés actifs et de positions valides.
  3. Pour chaque `ScheduleTemplateShift` : construit `startsAt`/`endsAt` à partir de `weekStart + (dayOfWeek-1) jours + startHour minutes`, fallback `employeeId/positionId` à null si invalide.
  4. Insère tous les `Shift` en `createMany` avec `status = "DRAFT"`.
  5. Retourne `{ createdCount }`.
- `renameTemplate(ctx, templateId, newName)` — P2002 → `NAME_TAKEN`.
- `deleteTemplate(ctx, templateId)` — cascade auto sur les `ScheduleTemplateShift`. Shifts réels intacts.

### Server Actions (`src/actions/scheduleTemplates/`)

- `save.ts` — `saveAsTemplateAction(state, fd)` : invoque `createTemplateFromWeek`. revalide `/templates`.
- `apply.ts` — `applyTemplateAction(state, fd)` : invoque `applyTemplate`. revalide `/schedules`.
- `rename.ts` — `renameTemplateAction(state, fd)`. revalide `/templates`.
- `delete.ts` — `deleteTemplateAction(state, fd)`. revalide `/templates`.

Pattern habituel : Zod validation + try/catch sur les codes throw du repo + `{ success, error }`.

### UI

**Nouvelle page `/templates`** (MANAGER only) :
- Liste des modèles : table avec nom, nb shifts, créé par, date.
- Actions par ligne : Renommer (inline dialog), Supprimer (confirm dialog).
- Pas de création depuis cette page (la création se fait depuis `/schedules` via la barre d'outils, contextuelle à la semaine visible).

**Modifs `/schedules`** :
- `ScheduleToolbar` : 2 nouveaux boutons MANAGER-only :
  - « Sauvegarder comme modèle » → ouvre `SaveTemplateDialog` (input `name`).
  - « Appliquer un modèle » → ouvre `ApplyTemplateDialog` (select des modèles + confirm).
- `SaveTemplateDialog` : Client Component, formulaire 1 champ, soumet `saveAsTemplateAction`, ferme + toast sur succès.
- `ApplyTemplateDialog` : Client Component, charge la liste de modèles côté serveur via une fonction `loader`, select + confirm, soumet `applyTemplateAction`.

**Modifs Sidebar** :
- Ajouter entrée « Modèles » sous MANAGER → route `/templates`, icône `LayoutTemplate`.

**Modifs `proxy.ts`** :
- Ajouter `/templates` aux `PROTECTED_PREFIXES` et matcher.

### Why this design

- Une seule transaction pour la sauvegarde (atomicité). Une seule transaction pour l'application (atomicité — si un insert échoue, tout rollback).
- `createMany` accepté ici (pas d'ID retour à utiliser) → 1 round-trip au lieu de N.
- Les fallbacks `employeeId/positionId = null` plutôt qu'un erreur fragile permettent que les modèles survivent aux mouvements d'équipe.
- `dayOfWeek` ISO (lundi=1) cohérent avec `daysOfWeek()` dans [src/lib/week.ts](src/lib/week.ts).

## File Tree

```
prisma/
  schema.prisma                                         (modifié)
  migrations/20260601XXXXXX_add_schedule_templates/
    migration.sql                                       (nouveau)

src/
  proxy.ts                                              (modifié)
  components/shell/SidebarNav.tsx                       (modifié)
  lib/repositories/scheduleTemplate.ts                  (nouveau)
  actions/scheduleTemplates/
    save.ts                                             (nouveau)
    apply.ts                                            (nouveau)
    rename.ts                                           (nouveau)
    delete.ts                                           (nouveau)
  app/(dashboard)/templates/
    page.tsx                                            (nouveau)
    _components/
      TemplatesList.tsx                                 (nouveau)
      RenameTemplateDialog.tsx                          (nouveau)
      DeleteTemplateDialog.tsx                          (nouveau)
  app/(dashboard)/schedules/_components/
    ScheduleToolbar.tsx                                 (modifié — 2 boutons)
    SaveTemplateDialog.tsx                              (nouveau)
    ApplyTemplateDialog.tsx                             (nouveau)
```

## Risks & Mitigations

- **R1 : Migration touche un schéma stable.** Mitigation : 2 tables nouvelles, aucune colonne ajoutée aux tables existantes. `prisma migrate dev` standard.
- **R2 : Insertion massive si la semaine est très chargée.** Mitigation : `createMany` en 1 round-trip ; pas de boucle awaitée.
- **R3 : Décalage timezone à l'application.** Mitigation : `weekStart` reçu en local côté serveur (cohérent avec `WeekRange`), `dayOfWeek-1` et `startHour minutes` ajoutés à `weekStart` via `new Date()` constructor — pas de conversion UTC explicite.

## Quickstart

1. `npm run dev`
2. MANAGER se connecte, ouvre `/schedules` semaine du 1er juin (déjà peuplée).
3. Clique « Sauvegarder comme modèle » → saisit « Type été ».
4. Navigue à la semaine du 15 juin (vide).
5. Clique « Appliquer un modèle » → choisit « Type été ».
6. 12 shifts DRAFT apparaissent. Publie la semaine pour valider l'intégration avec Phase 9.
7. Va sur `/templates`, renomme « Type été » → « Rotation 4-jours ». Supprime un autre modèle.

## Phase 0 — Research

Aucune décision externe nécessaire ; tout est déjà choisi par les phases précédentes. Pas de dépendance npm nouvelle.

## Phase 1 — Design

Voir sections ci-dessus. `data-model.md` et `contracts/` ne sont pas dupliqués — ce plan suffit pour le travail (cohérent avec la pratique des phases 11–13).

## Constitution Recheck (post-design)

- ✅ Aucune décision viole les invariants tenant/MANAGER.
- ✅ Aucun accès Prisma direct hors repositories.
- ✅ Stack respecte les choix consolidés.

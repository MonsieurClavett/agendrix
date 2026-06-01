# Implementation Plan: Approbation hiérarchique des heures

**Feature**: 028-timesheet-approval

## Technical Context

Une nouvelle entité `TimesheetApproval` scoped per company, une nouvelle valeur d'enum `NotificationType.TIMESHEET_DECIDED`, une nouvelle page MANAGER `/approbation`, un nouveau repo `timesheetApproval.ts`, et une extension du route handler CSV de la Phase 23. Aucune nouvelle dépendance npm. Les calculs de snapshots réutilisent `getReportForRange()` (Phase 23) restreint à une semaine.

## Architecture

### Entities

```prisma
enum TimesheetApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}

model TimesheetApproval {
  id                        String   @id @default(cuid())
  companyId                 String
  weekStart                 DateTime @db.Date
  employeeId                String
  status                    TimesheetApprovalStatus @default(PENDING)
  scheduledMinutesSnapshot  Int
  workedMinutesSnapshot     Int
  varianceMinutesSnapshot   Int
  managerNote               String?
  decidedByUserId           String?
  decidedAt                 DateTime?
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt

  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  employee  User    @relation("TimesheetApprovalEmployee", fields: [employeeId], references: [id], onDelete: Cascade)
  decidedBy User?   @relation("TimesheetApprovalDecider", fields: [decidedByUserId], references: [id], onDelete: SetNull)

  @@unique([companyId, weekStart, employeeId])
  @@index([companyId, weekStart, status])
}
```

Extension de `NotificationType` : `TIMESHEET_DECIDED`.

### Repository (`src/lib/repositories/timesheetApproval.ts`)

MANAGER-only context, tenant-scoped, throws `Error("CODE")` pour les cas d'erreur connus :

- `listForWeek(ctx, weekStart)` : `MANAGER`. Retourne `{ employeeId, name, email, scheduledMinutes, workedMinutes, varianceMinutes, approval: TimesheetApproval | null }[]`. Compose une `Map` des approbations existantes + résultat de `getReportForRange()` restreint au `[weekStart, weekStart+7j)`.
- `decideForEmployee(ctx, { weekStart, employeeId, status, managerNote? })` : `MANAGER`. Upsert. Calcule snapshot via `getReportForRange()`. Émet `Notification(TIMESHEET_DECIDED)` dans la même transaction via `createNotificationsInTx()`. Throw si `weekStart` n'est pas un lundi, si `employeeId` n'est pas dans la company, si `status=REJECTED` sans `managerNote`, ou si `managerNote.length > 500`.
- `decideForAllPendingInWeek(ctx, { weekStart, status })` : `MANAGER`. `$transaction` unique. Liste les employés actifs de la company sans approbation OU avec status `PENDING` pour cette `weekStart`. Crée/upserte chacun avec snapshot. Émet N notifications. Retourne `{ decidedCount }`.
- `getApprovalStatus(ctx, { weekStart, employeeId })` : single read pour le CSV (`onlyApproved`).
- `listApprovedEmployeeIdsForRange(ctx, { startDate, endDate })` : helper pour le CSV — retourne `Set<string>` des `employeeId` ayant au moins une `APPROVED` sur la plage de semaines.

Helper interne `normalizeWeekStart(date)` qui rejette si pas un lundi 00:00 local.

### Server Actions

- `src/actions/timesheetApproval/decideOne.ts` :
  - Zod : `{ weekStart: z.coerce.date(), employeeId: z.string().cuid(), status: z.enum(["APPROVED","REJECTED"]), managerNote: z.string().max(500).optional() }`.
  - `useActionState` pattern → `{ error?: string, success?: boolean }`.
  - Error map FR : `INVALID_WEEK_START` → « La semaine doit commencer un lundi », `EMPLOYEE_NOT_FOUND` → « Employé introuvable », `MOTIF_REQUIRED` → « Une raison est requise pour un refus », `MOTIF_TOO_LONG` → « La raison ne peut dépasser 500 caractères ».
- `src/actions/timesheetApproval/decideAll.ts` :
  - Zod : `{ weekStart: z.coerce.date(), status: z.enum(["APPROVED"]) }` (refus en masse non offert dans cette phase).
  - Appelle `decideForAllPendingInWeek` + revalide `/approbation`.

### Route Handlers

Extension de `src/app/api/reports/csv/route.ts` :
- Parse `onlyApproved` query param (`"true"` / absent).
- Si actif : `listApprovedEmployeeIdsForRange(ctx, { startDate, endDate })` → filtre `perEmployee` à ce set.
- Si actif : ajoute la colonne « Statut approbation » (toujours `APPROVED` pour les lignes restantes).
- Helper CSV `src/lib/csv.ts` inchangé.

### UI Pages

- `src/app/(dashboard)/approbation/page.tsx` (Server Component) :
  - `requireManagerContext()`.
  - Parse `?weekStart=YYYY-MM-DD` query param, fallback au lundi de la semaine précédente.
  - Appelle `listForWeek(ctx, weekStart)` → passe à `<ApprovalGrid>`.
- `src/app/(dashboard)/approbation/_components/ApprovalGrid.tsx` (Server Component, accepte la liste + `weekStart`) :
  - `PageHeader` avec titre « Approbation hebdomadaire ».
  - `WeekPicker` (Client Component) qui change `?weekStart`.
  - Bouton « Approuver tout » (Client Component, désactivé si aucune ligne `PENDING` ou si la semaine est dans le futur).
  - Table avec 1 `<ApprovalRow>` par ligne.
  - `EmptyState` si la company n'a aucun employé actif.
- `src/app/(dashboard)/approbation/_components/ApprovalRow.tsx` (Client Component) :
  - Affiche : nom, prévu (formaté `h:mm`), travaillé, écart coloré (vert/rouge), badge statut.
  - Boutons « Approuver » / « Refuser » → ouvrent dialogs respectifs.
  - `RejectDialog` interne avec champ `managerNote`.
- Page utilise classe CSS `page-enter` (animation standard).

### Notifications

Extension de `src/lib/notifications.ts` :
- Ajouter à l'union Zod discriminée :
  ```ts
  z.object({
    type: z.literal("TIMESHEET_DECIDED"),
    weekStart: z.string(), // ISO date
    status: z.enum(["APPROVED", "REJECTED"]),
    managerNote: z.string().optional(),
  })
  ```
- Ajouter branche dans `renderNotificationLabel` : « Semaine du DD/MM approuvée » / « Semaine du DD/MM refusée — voir détails ».
- Ajouter branche dans `renderNotificationHref` : `/me/pointage?week=YYYY-MM-DD`.
- Ajouter branche dans `renderNotificationEmailSubject` : « Décision sur votre semaine du DD/MM ».
- Émission dans `decideForEmployee` et `decideForAllPendingInWeek` via `createNotificationsInTx()`. Emails envoyés en post-commit avec try/catch swallow (pattern Phase 11/13).

### Sidebar entries

`src/components/shell/SidebarNav.tsx` : nouvelle entrée `{ href: "/approbation", label: "Approbation", icon: BadgeCheck, roles: ["MANAGER"] }`.

## File Tree

```
prisma/schema.prisma                                                     (modifié — TimesheetApproval + enum + NotificationType.TIMESHEET_DECIDED)
prisma/migrations/<timestamp>_add_timesheet_approval/migration.sql       (nouveau)

src/lib/repositories/timesheetApproval.ts                                (nouveau)
src/lib/notifications.ts                                                  (modifié — payload + render branches)
src/lib/csv.ts                                                            (modifié — support colonne optionnelle)

src/actions/timesheetApproval/decideOne.ts                                (nouveau)
src/actions/timesheetApproval/decideAll.ts                                (nouveau)

src/app/(dashboard)/approbation/page.tsx                                  (nouveau)
src/app/(dashboard)/approbation/_components/ApprovalGrid.tsx              (nouveau)
src/app/(dashboard)/approbation/_components/ApprovalRow.tsx               (nouveau)
src/app/(dashboard)/approbation/_components/WeekPicker.tsx                (nouveau)
src/app/(dashboard)/approbation/_components/ApproveAllButton.tsx          (nouveau)
src/app/(dashboard)/approbation/_components/RejectDialog.tsx              (nouveau)

src/app/api/reports/csv/route.ts                                          (modifié — onlyApproved + colonne)

src/proxy.ts                                                              (modifié — protéger /approbation)
src/components/shell/SidebarNav.tsx                                       (modifié — entrée "Approbation")
```

## Risks & Mitigations

- **R1 : Dérive des snapshots** — un pointage tardif après approbation ne met PAS à jour le snapshot. Mitigation : c'est le comportement souhaité (figer pour la paie). Documenté dans `spec.md` Assumptions.
- **R2 : Race sur « Approuver tout »** — deux MANAGERs cliquent simultanément. Mitigation : la contrainte unique `(companyId, weekStart, employeeId)` rejette les doublons au niveau DB ; le second `$transaction` rollback proprement.
- **R3 : Performance de `listForWeek`** — appel à `getReportForRange()` peut coûter 2 requêtes Prisma (shifts + punches). Mitigation : la plage est limitée à 7 jours, déjà testée Phase 23 avec ≤ 100 employés → < 500 ms.
- **R4 : Normalisation timezone de `weekStart`** — le client peut envoyer une date dans une autre TZ. Mitigation : `normalizeWeekStart()` côté repo rejette toute valeur dont la composante heure n'est pas 00:00 OU dont le jour de semaine n'est pas un lundi (`getDay() === 1`).
- **R5 : Cross-tenant via le CSV** — `onlyApproved=true` doit filtrer par `companyId` aussi. Mitigation : `listApprovedEmployeeIdsForRange()` filtre par `ctx.companyId` intrinsèquement.

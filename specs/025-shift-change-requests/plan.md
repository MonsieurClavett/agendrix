# Implementation Plan: Demandes de modification de shift

**Feature**: 025-shift-change-requests

## Technical Context

Pattern multi-tenant strict, reprise quasi-intégrale du squelette de la Phase 13 (shift swaps) : un workflow d'approbation avec notifications transactionnelles. Pas de nouvelle dépendance npm. Une migration Prisma (nouveau modèle + enum + partial unique index). Le système de notifications de la Phase 11 (`notifications.ts`, `email.ts`) est étendu avec deux nouveaux types.

## Architecture

### Entités

**`ShiftChangeRequest`** (modèle Prisma) :

```prisma
enum ShiftChangeRequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELED_BY_EMPLOYEE
}

model ShiftChangeRequest {
  id                  String   @id @default(cuid())
  companyId           String
  company             Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  shiftId             String
  shift               Shift    @relation(fields: [shiftId], references: [id], onDelete: Cascade)
  employeeId          String
  employee            User     @relation("ShiftChangeRequestEmployee", fields: [employeeId], references: [id], onDelete: Cascade)
  requestedStartsAt   DateTime
  requestedEndsAt     DateTime
  reason              String?
  status              ShiftChangeRequestStatus @default(PENDING)
  decidedAt           DateTime?
  decidedByUserId     String?
  decidedBy           User?    @relation("ShiftChangeRequestDecider", fields: [decidedByUserId], references: [id], onDelete: SetNull)
  managerNote         String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([companyId, status])
  @@index([employeeId, status])
}
```

Partial unique index (édité à la main dans `migration.sql`, Prisma ne sait pas l'exprimer) :

```sql
CREATE UNIQUE INDEX "ShiftChangeRequest_shiftId_pending_unique"
  ON "ShiftChangeRequest"("shiftId")
  WHERE "status" = 'PENDING';
```

Extension de `NotificationType` enum : `SHIFT_CHANGE_REQUESTED`, `SHIFT_CHANGE_DECIDED`.

### Repository (`src/lib/repositories/shiftChangeRequest.ts`)

Toutes les fonctions prennent un `TenantContext` et filtrent sur `companyId`. Les notifications sont émises dans la même transaction via `createNotificationsInTx`.

- `listPendingForCompany(ctx)` — MANAGER : toutes les demandes PENDING de la company avec `shift` + `employee` includés.
- `listRecentDecidedForCompany(ctx, limit)` — MANAGER : 50 dernières décisions (APPROVED + REJECTED).
- `listMyRequests(ctx, limit)` — EMPLOYEE : ses propres demandes (PENDING en haut + historique).
- `createRequest(ctx, { shiftId, requestedStartsAt, requestedEndsAt, reason? })` — Bob crée pour lui :
  1. Charge le shift, vérifie `companyId` + `employeeId === ctx.userId` + `status === "PUBLISHED"`.
  2. Insert la `ShiftChangeRequest` (le partial unique index garantit l'unicité PENDING par shift — catch P2002).
  3. Charge tous les MANAGERs de la company.
  4. `createNotificationsInTx` pour chacun avec payload `SHIFT_CHANGE_REQUESTED`.
  5. Retourne les ids notifications pour `sendNotificationEmail` post-commit.
- `approveRequest(ctx, requestId)` — MANAGER :
  1. `findFirst({ where: { id, companyId, status: "PENDING" }, include: { shift: true } })`. Throw `Error("REQUEST_NOT_FOUND")` sinon.
  2. Re-check overlap : `tx.shift.findFirst({ where: { companyId, employeeId: shift.employeeId, id: { not: shift.id }, AND: [{ startsAt: { lt: requestedEndsAt } }, { endsAt: { gt: requestedStartsAt } }] } })`. Si trouvé, throw `Error("OVERLAP_DETECTED")`.
  3. `tx.shift.update({ where: { id }, data: { startsAt: requestedStartsAt, endsAt: requestedEndsAt } })`.
  4. `tx.shiftChangeRequest.update({ where: { id, status: "PENDING" }, data: { status: "APPROVED", decidedAt: now, decidedByUserId: ctx.userId } })`.
  5. `createNotificationsInTx` pour l'employé avec payload `SHIFT_CHANGE_DECIDED { status: "APPROVED" }`.
- `rejectRequest(ctx, requestId, { managerNote? })` — MANAGER :
  1. Idem find PENDING.
  2. `tx.shiftChangeRequest.update({ status: "REJECTED", managerNote, decidedAt, decidedByUserId })`.
  3. `createNotificationsInTx` payload `SHIFT_CHANGE_DECIDED { status: "REJECTED", managerNote }`.
- `cancelRequest(ctx, requestId)` — EMPLOYEE :
  1. `findFirst({ where: { id, companyId, employeeId: ctx.userId, status: "PENDING" } })`. Throw `REQUEST_NOT_FOUND` sinon.
  2. Update `status: "CANCELED_BY_EMPLOYEE"`. Pas de notification.

Codes d'erreur normalisés (mappés en français côté action) : `REQUEST_NOT_FOUND`, `SHIFT_NOT_PUBLISHED`, `NOT_SHIFT_OWNER`, `INVALID_TIMES`, `DURATION_OUT_OF_BOUNDS`, `PENDING_REQUEST_EXISTS`, `OVERLAP_DETECTED`, `ALREADY_DECIDED`.

### Server Actions (`src/actions/shiftChangeRequests/`)

Tous les actions suivent le pattern `useActionState` retournant `{ error?, success? }`.

- `create.ts` — schéma Zod : `{ shiftId, requestedStartsAt: z.coerce.date(), requestedEndsAt: z.coerce.date(), reason: z.string().max(280).optional() }`. Validation côté action : start < end, 15 min ≤ duration ≤ 24h. Appelle `createRequest`. Post-commit : envoie un email à chaque MANAGER.
- `approve.ts` — schéma `{ requestId }`. `requireManagerContext`. Appelle `approveRequest`. Post-commit email à l'employé.
- `reject.ts` — schéma `{ requestId, managerNote: z.string().max(280).optional() }`. `requireManagerContext`. Idem post-commit.
- `cancel.ts` — schéma `{ requestId }`. `requireTenantContext`. Appelle `cancelRequest`.

### Notifications (`src/lib/notifications.ts`)

Étendre la discriminated union :

```ts
const shiftChangeRequestedPayload = z.object({
  type: z.literal("SHIFT_CHANGE_REQUESTED"),
  requestId: z.string(),
  shiftId: z.string(),
  employeeName: z.string(),
  currentStartsAt: z.string(),
  currentEndsAt: z.string(),
  requestedStartsAt: z.string(),
  requestedEndsAt: z.string(),
});

const shiftChangeDecidedPayload = z.object({
  type: z.literal("SHIFT_CHANGE_DECIDED"),
  requestId: z.string(),
  shiftId: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
  managerNote: z.string().nullish(),
});
```

Branches ajoutées dans `renderNotificationLabel`, `renderNotificationHref` (→ `/modifications`), `renderNotificationEmailSubject`, `renderNotificationEmailBody`.

### UI Pages

**`/modifications/page.tsx`** (Server Component, branche sur `ctx.role`) :

- Si `MANAGER` : 2 sections — « Demandes en attente » (PENDING) + « Historique récent » (50 dernières décisions).
- Si `EMPLOYEE` : 1 section — « Mes demandes » (PENDING + historique).
- Si `MANAGER` ET propriétaire de shifts (cas rare où un MANAGER serait aussi assigné) : sa section « Mes demandes » s'affiche en plus si non-vide.

Composants client :

- `_components/PendingRequestsList.tsx` — table + boutons Approuver / Refuser pour MANAGER.
- `_components/DecidedHistoryList.tsx` — table read-only.
- `_components/MyRequestsList.tsx` — table employé avec bouton Annuler sur les PENDING.
- `_components/ApproveDialog.tsx` — confirme l'approbation (simple).
- `_components/RejectDialog.tsx` — input note (optional) + confirm.
- `_components/CancelRequestDialog.tsx` — confirmation.

**`/schedules/_components/ShiftDialog.tsx`** (modifié) :

Ajout d'une entrée « Demander un changement d'horaire » visible UNIQUEMENT si :
- `shift.employeeId === ctx.userId`
- `shift.status === "PUBLISHED"`
- pas de `ShiftChangeRequest` PENDING existante sur ce shift (passé en prop depuis la page).

Le bouton ouvre `ChangeRequestDialog.tsx` (nouveau Client Component dans `_components/`) avec : 2 datetime inputs pré-remplis avec les heures actuelles + textarea raison + submit via `useActionState(createAction)`.

La page `/schedules` charge un `Set<string> pendingChangeRequestShiftIds` (1 requête additionnelle `findMany` qui sélectionne uniquement `shiftId` filtré status=PENDING) et le passe à `ShiftDialog`.

### Proxy

`src/proxy.ts` : ajouter `/modifications` aux `PROTECTED_PREFIXES` et au `matcher`. Pas de gating MANAGER au niveau du proxy — la page décide elle-même (EMPLOYEE peut voir ses propres demandes).

### Sidebar

`src/components/shell/SidebarNav.tsx` : ajouter entrée « Modifications » → `/modifications`, visible pour TOUS, icône `Edit` (lucide).

### Emails

`src/lib/email.ts` est déjà type-driven (lit le `type` du payload). Aucune modification structurelle — il suffit que `renderNotificationEmailSubject` / `renderNotificationEmailBody` couvrent les 2 nouveaux types. Sujets proposés :
- `SHIFT_CHANGE_REQUESTED` : « Nouvelle demande de modification d'horaire de {employeeName} »
- `SHIFT_CHANGE_DECIDED` (APPROVED) : « Votre demande de modification a été approuvée »
- `SHIFT_CHANGE_DECIDED` (REJECTED) : « Votre demande de modification a été refusée »

## File Tree

```
prisma/schema.prisma                                              (modifié — modèle + enum + extension NotificationType)
prisma/migrations/.../migration.sql                               (nouveau — partial unique edité à la main)

src/lib/repositories/shiftChangeRequest.ts                        (nouveau)
src/lib/notifications.ts                                          (modifié — 2 payloads ajoutés à l'union)
src/lib/email.ts                                                  (modifié — branches subject/body pour les 2 types)

src/actions/shiftChangeRequests/create.ts                         (nouveau)
src/actions/shiftChangeRequests/approve.ts                        (nouveau)
src/actions/shiftChangeRequests/reject.ts                         (nouveau)
src/actions/shiftChangeRequests/cancel.ts                         (nouveau)

src/app/(dashboard)/modifications/page.tsx                        (nouveau)
src/app/(dashboard)/modifications/_components/PendingRequestsList.tsx   (nouveau)
src/app/(dashboard)/modifications/_components/DecidedHistoryList.tsx    (nouveau)
src/app/(dashboard)/modifications/_components/MyRequestsList.tsx        (nouveau)
src/app/(dashboard)/modifications/_components/ApproveDialog.tsx         (nouveau)
src/app/(dashboard)/modifications/_components/RejectDialog.tsx          (nouveau)
src/app/(dashboard)/modifications/_components/CancelRequestDialog.tsx   (nouveau)

src/app/(dashboard)/schedules/page.tsx                            (modifié — fetch pendingChangeRequestShiftIds)
src/app/(dashboard)/schedules/_components/ShiftDialog.tsx         (modifié — entrée « Demander un changement »)
src/app/(dashboard)/schedules/_components/ChangeRequestDialog.tsx (nouveau)

src/proxy.ts                                                      (modifié — /modifications)
src/components/shell/SidebarNav.tsx                               (modifié — entrée « Modifications »)
```

## Risks & Mitigations

- **R1 — Race sur création de demande PENDING** : deux tabs ouverts, deux soumissions simultanées. Mitigation : partial unique index `(shiftId) WHERE status='PENDING'` → la seconde insert échoue avec P2002, l'action renvoie `PENDING_REQUEST_EXISTS`.
- **R2 — Chevauchement créé par l'approbation** : entre la création et l'approbation, un autre shift peut être planifié. Mitigation : re-check overlap dans la même transaction que l'update du shift. Erreur `OVERLAP_DETECTED` claire côté MANAGER.
- **R3 — Approbation double-clic ou par deux MANAGERs simultanés** : Mitigation : l'update filtre `where: { id, status: "PENDING" }` — le second clic update 0 lignes, le repo détecte et renvoie `ALREADY_DECIDED`.
- **R4 — Cascade FK qui supprime l'historique d'approbation** : si le shift est supprimé après APPROVED, on perd la trace. Mitigation : acceptable pour MVP — la décision est immuable dans l'historique en pratique car les shifts publiés sont rarement supprimés. Une phase ultérieure pourrait soft-deleter.
- **R5 — Spam de demandes par un employé** : pas de rate-limit dans cette phase. Mitigation : 1 PENDING max par shift contraint déjà fortement. À surveiller.

## Quickstart

1. `npx prisma migrate dev --name add_shift_change_requests`.
2. `npm run dev`.
3. Connecté en EMPLOYEE : ouvrir `/schedules`, cliquer un shift PUBLISHED → « Demander un changement d'horaire » → soumettre 10h-18h.
4. Connecté en MANAGER (autre tab) : ouvrir `/modifications` → voir la demande → cliquer « Approuver ».
5. Retourner sur `/schedules` employé → le shift affiche 10h-18h.
6. Vérifier la notification dans la cloche + l'email Resend reçu.

## Constitution Check

- Multi-tenant strict : `companyId` sur l'entité, filtre partout, FK Cascade.
- Pas d'accès Prisma direct hors repo.
- Server-authoritative authorization : `employeeId = ctx.userId` forcé à la création ; `requireManagerContext` sur approve/reject ; `cancel` filtre `employeeId: ctx.userId`.
- Type safety end-to-end : enum Prisma, payloads Zod discriminated.
- YAGNI : 1 entité, 2 enum values, pas de versioning, pas d'auto-approval, pas de SLA.

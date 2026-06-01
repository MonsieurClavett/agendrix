# Implementation Plan: Audit log — historique des mutations sensibles

**Feature**: 026-audit-log

## Technical Context

Aucune nouvelle dépendance. Une migration Prisma ajoute la table `AuditLog` avec ses index. L'instrumentation est mécanique : appeler `writeAuditEventInTx(tx, …)` à l'intérieur de chaque `$transaction` existante des repos sensibles. L'écriture partage l'atomicité de la mutation : si l'audit échoue, la mutation rollback. Aucune notification, aucun email — silencieux par design.

## Architecture

### Entités

**`AuditLog`** :

```prisma
model AuditLog {
  id            String   @id @default(cuid())
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  actorUserId   String?
  actorUser     User?    @relation(fields: [actorUserId], references: [id], onDelete: SetNull)
  actorName     String
  action        String
  entityType    String
  entityId      String?
  payload       Json?
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime @default(now())

  @@index([companyId, createdAt(sort: Desc)])
  @@index([companyId, action])
  @@index([companyId, entityType, entityId])
}
```

Back-relations à ajouter dans `Company` (`auditLogs AuditLog[]`) et `User` (`auditLogs AuditLog[] @relation(name: "ActorLogs")` ou simple `auditLogs AuditLog[]`).

### Repository (`src/lib/repositories/auditLog.ts`)

Signatures :

```ts
type AuditEventInput = {
  companyId: string;
  actorUserId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: Prisma.JsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

// Used INSIDE an existing $transaction (rollback-safe).
writeAuditEventInTx(tx: Prisma.TransactionClient, input: AuditEventInput): Promise<void>;

// Standalone — wraps its own tx. For rare one-off captures outside a mutation transaction.
writeAuditEvent(ctx: TenantContext, input: Omit<AuditEventInput, "companyId">): Promise<void>;

// Paginated reads, MANAGER-only.
listForCompany(
  ctx: ManagerContext,
  opts: { limit?: number; action?: string; entityType?: string; beforeDate?: Date }
): Promise<AuditLog[]>;
```

La repo N'expose PAS `update` ni `delete`. Append-only par convention.

### Helper de capture des metadata HTTP (`src/lib/auditMeta.ts`)

```ts
import { headers } from "next/headers";
export async function readAuditMeta(): Promise<{ ipAddress: string | null; userAgent: string | null }>;
```

Lit `x-forwarded-for` / `user-agent` quand disponibles. Utilisé en amont des Server Actions qui veulent capturer ces champs.

### Instrumentation des repos existants

À chaque endroit identifié, ajouter UN appel `writeAuditEventInTx` à l'intérieur de la `$transaction` existante (ou la créer si la mutation tournait hors tx) :

| Fichier | Mutation | `action` | Payload snapshot |
|---|---|---|---|
| `src/lib/repositories/shift.ts` | `createShift` | `shift.created` | `{ shiftId, employeeId, startsAt, endsAt, positionId }` |
| `src/lib/repositories/shift.ts` | `updateShift` | `shift.updated` | `{ shiftId, changes: { …diff } }` |
| `src/lib/repositories/shift.ts` | `deleteShift` | `shift.deleted` | `{ shiftId, employeeId, startsAt }` |
| `src/actions/shifts/publishWeek.ts` | publish | `shift.published` | `{ weekStart, shiftCount }` |
| `src/lib/repositories/announcement.ts` | `createAnnouncement` | `announcement.created` | `{ announcementId, title }` |
| `src/lib/repositories/announcement.ts` | `deleteAnnouncement` | `announcement.deleted` | `{ announcementId }` |
| `src/lib/repositories/timeOff.ts` | `decideRequest` | `timeoff.decided` | `{ requestId, status }` |
| `src/lib/repositories/shiftClaim.ts` | `decideClaim` | `claim.decided` | `{ claimId, decision, shiftId }` |
| `src/lib/repositories/shiftSwap.ts` | `managerDecide` + `peerAccept` / `peerReject` | `swap.decided` | `{ swapId, decision }` |
| `src/lib/repositories/punchLocation.ts` | `createLocation` | `punchLocation.created` | `{ locationId, name }` |
| `src/lib/repositories/punchLocation.ts` | `deleteLocation` | `punchLocation.deleted` | `{ locationId, name }` |
| `src/actions/invitations/accept.ts` (existant Phase 11) | accept | `employee.invited` | `{ userId, email, role }` |
| `src/actions/team/setActive.ts` (à vérifier — sinon noter le gap) | désactivation | `employee.deactivated` | `{ userId }` |
| `src/actions/team/setRole.ts` (à vérifier — sinon noter le gap) | changement de rôle | `employee.role_changed` | `{ userId, from, to }` |

L'`actorName` est calculé au site d'appel : `actorName = ctx.user?.name ?? ctx.user?.email ?? "Système"`.

### Server Actions

Aucune nouvelle Server Action — la lecture passe par les Server Components de la page. L'écriture est intégrée aux mutations existantes.

### UI Pages

- **`/audit`** (`src/app/(dashboard)/audit/page.tsx`, Server Component, MANAGER-only) :
  - Parse `?action`, `?entityType`, `?beforeDate` depuis `searchParams`.
  - Appelle `listForCompany(ctx, { limit: 50, action, entityType, beforeDate })`.
  - Affiche `PageHeader` + `AuditFilters` (Client Component) + `AuditTable` (Server Component).
  - Pagination : si la liste retourne 50 lignes, affiche un lien `?beforeDate=<lastRow.createdAt>` « Plus anciens → ».

- **`_components/AuditFilters.tsx`** (Client) :
  - Select `action` (liste des actions connues), select `entityType`, input date `beforeDate`.
  - Bouton « Appliquer » qui pousse `router.push(/audit?…)`.

- **`_components/AuditTable.tsx`** (Server) :
  - Table avec colonnes : Date · Acteur · Action · Entité · Payload (aperçu).
  - Cliquer une ligne expand pour montrer payload formattée + IP + UA (`AuditRowDetail.tsx`).

- **`_components/AuditRowDetail.tsx`** (Client) :
  - Expand inline avec `<pre>{JSON.stringify(payload, null, 2)}</pre>`.
  - Si `entityType` connu et `entityId` existe, lien « Ouvrir » vers la ressource (best-effort).

- **EmptyState** si aucun résultat : « Aucune entrée pour ces critères ».

### Route Handlers

Aucun — la lecture est rendue côté Server Component.

### Notifications

Aucune. L'audit est silencieux par design (FR-009).

### Sidebar entries

- « Audit » (MANAGER uniquement) → `/audit`, icône `FileText` ou `ShieldCheck` (préférer `ShieldCheck` pour signaler la fonction de conformité).

### Proxy

- Ajouter `/audit` aux `PROTECTED_PREFIXES` et au matcher dans `src/proxy.ts`.

## File Tree

```
prisma/schema.prisma                                          (modifié — AuditLog + back-relations)
prisma/migrations/<add_audit_log>/migration.sql               (nouveau)

src/lib/repositories/auditLog.ts                              (nouveau)
src/lib/auditMeta.ts                                          (nouveau — read IP / UA from headers)

src/lib/repositories/shift.ts                                 (modifié — 3 calls writeAuditEventInTx)
src/lib/repositories/announcement.ts                          (modifié — 2 calls)
src/lib/repositories/timeOff.ts                               (modifié — 1 call dans decideRequest)
src/lib/repositories/shiftClaim.ts                            (modifié — 1 call dans decideClaim)
src/lib/repositories/shiftSwap.ts                             (modifié — 1 call par décision)
src/lib/repositories/punchLocation.ts                         (modifié — 2 calls)

src/actions/shifts/publishWeek.ts                             (modifié — 1 call dans la tx)
src/actions/invitations/accept.ts                             (modifié — 1 call)
src/actions/team/setRole.ts                                   (modifié OU créé si absent)
src/actions/team/setActive.ts                                 (modifié OU créé si absent)

src/app/(dashboard)/audit/page.tsx                            (nouveau)
src/app/(dashboard)/audit/_components/AuditFilters.tsx        (nouveau)
src/app/(dashboard)/audit/_components/AuditTable.tsx          (nouveau)
src/app/(dashboard)/audit/_components/AuditRowDetail.tsx      (nouveau)

src/proxy.ts                                                  (modifié — /audit)
src/components/shell/SidebarNav.tsx                           (modifié — entrée "Audit")
```

## Risks & Mitigations

- **R1 : Une erreur d'instrumentation casse une mutation critique.** Mitigation : l'`AuditLog` est intentionnellement simple (INSERT seul, pas de FK contrainte sur `entityId`, payload JSON non validée côté DB). La probabilité d'échec en pratique est très faible. Le rollback est intentionnel : « fail loud » plutôt que perdre silencieusement le trail.
- **R2 : Payload trop volumineuse alourdit la table.** Mitigation : discipline côté helpers — ne sérialiser que les champs identifiants + statut, jamais des collections. Soft cap ~1 KB.
- **R3 : Lecture lente quand la table grossit.** Mitigation : index `(companyId, createdAt desc)` couvre la lecture principale, plus `(companyId, action)` et `(companyId, entityType, entityId)` pour les filtres ciblés.
- **R4 : Acteur supprimé ferait perdre la traçabilité.** Mitigation : `actorName` dénormalisé à l'écriture + FK `SetNull` sur `actorUserId`.
- **R5 : Les actions team/setRole et team/setActive peuvent ne pas exister.** Mitigation : la tâche correspondante vérifie, sinon documente le gap et reporte l'instrumentation à une phase ultérieure (ne bloque pas la livraison du squelette).

## Constitution Check

- ✅ Multi-tenant strict : `companyId` sur toutes les entrées, filtre tenant à la lecture, FK Cascade sur `Company`.
- ✅ Pas d'accès Prisma direct hors repos : `writeAuditEventInTx` / `writeAuditEvent` / `listForCompany` exposés par `auditLog.ts`.
- ✅ MANAGER-only sur `/audit` (`requireManagerContext` + proxy + sidebar gating).
- ✅ Simplicité : une entité, append-only, pas de notifications, pas d'email.
- ✅ Type Safety : `action` et `entityType` typés via constantes (`AUDIT_ACTIONS`) côté lib pour autocomplétion et stricter callsite.

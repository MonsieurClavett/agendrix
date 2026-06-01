# Implementation Plan: Pointage QR (clock in/out)

**Feature**: 022-clock-in-out

## Technical Context

Pattern multi-tenant strict. Nouvelle dépendance npm : `qrcode` (génération QR côté serveur, output SVG/DataURL).

## Architecture

### Entités

**`PunchLocation`** :
- `id`, `companyId`, `name`, `token` (String unique, 16 chars), `isActive` (Boolean default true), timestamps.
- Unique : `(companyId, name)`.
- Index : `(companyId)`, unique sur `token`.

**`Punch`** :
- `id`, `companyId`, `employeeId` (FK Cascade), `locationId` (FK SetNull, nullable car location peut être supprimée), `type` (enum `PunchType { IN, OUT }`), `punchedAt` (DateTime), `notes` (String?).
- Index : `(companyId, punchedAt desc)`, `(employeeId, punchedAt desc)`.

### Bibliothèque QR

`npm install qrcode @types/qrcode`. Usage côté Server Component :
```ts
import QRCode from "qrcode";
const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
// inject as <img src={dataUrl} />
```

### Repository (`src/lib/repositories/punchLocation.ts`)

- `listLocations(ctx)` — liste tenant.
- `getLocationByToken(token)` — global lookup (le token est unique), retourne avec companyId pour validation.
- `createLocation(ctx, { name })` — génère token random 16 chars.
- `updateLocation(ctx, id, { name?, isActive? })`.
- `deleteLocation(ctx, id)` — cascade `Punch.locationId` à null.

### Repository (`src/lib/repositories/punch.ts`)

- `listPunchesForDay(ctx, date)` — MANAGER : tous les pointages du jour de la company.
- `listPunchesForUser(ctx, userId, sinceDate)` — historique employé.
- `getLastPunchOfDay(ctx, employeeId, date)` — pour déterminer si le prochain est IN ou OUT.
- `recordPunch(ctx, { locationId })` — :
  1. Charge la location (404 si autre company ou inactive).
  2. Détermine le type (IN si dernier punch du jour est OUT ou inexistant ; OUT si dernier est IN).
  3. Crée le `Punch` avec `employeeId = ctx.userId` (forcé serveur).
  4. Retourne `{ type, punchedAt, scheduledShift }` (le scheduled shift le plus proche pour calculer l'écart).

### Server Actions

- `actions/punchLocations/create.ts`, `update.ts`, `delete.ts` (MANAGER-only).
- `actions/punches/record.ts` — récupère `locationId` via le token, appelle `recordPunch`. ANY auth user.

### Pages

- **`/punch/[token]`** (Server Component, ANY auth) :
  - Charge la location via token.
  - Si non trouvée → 404.
  - Si désactivée → message « Poste désactivé ».
  - Sinon : affiche nom du poste + état du jour (IN attendu ou OUT attendu) + Server Action button.
  - Pas d'auth ? → redirect `/login?callbackUrl=/punch/<token>`.

- **`/punch-locations`** (MANAGER) :
  - Liste des postes avec leur QR code (image inline).
  - Boutons : Nouveau / Renommer / Activer-Désactiver / Supprimer.
  - Pour chaque poste : bouton « Télécharger QR » + bouton « Imprimer ».

- **`/pointage`** (MANAGER) :
  - Sélecteur de date (par défaut aujourd'hui).
  - Tableau : Employé | Poste | Heure | Type (IN/OUT) | Écart vs prévu.
  - Compteurs : nombre total de pointages, nombre d'employés présents actuellement (IN sans OUT).

- **`/me/pointage`** (EMPLOYEE et MANAGER) :
  - Liste des pointages de l'utilisateur, 30 derniers jours.
  - Apparies IN/OUT par jour, calcul de durée travaillée.
  - Indique « En cours » si IN sans OUT correspondant.

### Sidebar entries

- « Pointage » (MANAGER) → `/pointage` (icône `ScanLine` ou `Clock`).
- « Postes » (MANAGER) → `/punch-locations` (icône `MapPin`).
- « Mes pointages » (TOUS) → `/me/pointage` (icône `History`).

### Token generation

Crypto-secure random :
```ts
import { randomBytes } from "crypto";
function generateToken(): string {
  return randomBytes(12).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
}
```
Si collision détectée (P2002) au create, retry une fois.

## Risks & Mitigations

- **R1 : Bibliothèque QR ajoute bundle size.** Mitigation : `qrcode` est ~50KB, utilisée seulement côté serveur (SSR), pas dans le bundle client.
- **R2 : QR scanné quand le user n'est pas auth.** Mitigation : middleware redirect avec callbackUrl, classique.
- **R3 : Multiple pointages rapides (double-tap).** Mitigation : `disabled` button + post-action redirect. Pas critique, le MANAGER peut éditer (phase ultérieure).
- **R4 : Calcul d'écart vs shift prévu.** Mitigation : on cherche le shift le plus proche dans une fenêtre de ±6h autour du `punchedAt`.

## File Tree

```
prisma/schema.prisma                                            (modifié)
prisma/migrations/.../migration.sql                             (nouveau)

src/lib/repositories/punchLocation.ts                           (nouveau)
src/lib/repositories/punch.ts                                   (nouveau)
src/lib/qrcode.ts                                               (nouveau — helper)

src/actions/punchLocations/{create,update,delete}.ts            (nouveau)
src/actions/punches/record.ts                                   (nouveau)

src/app/punch/[token]/page.tsx                                  (nouveau — public auth)
src/app/punch/[token]/_components/PunchButton.tsx               (nouveau)
src/app/(dashboard)/punch-locations/page.tsx                    (nouveau)
src/app/(dashboard)/punch-locations/_components/*               (nouveau)
src/app/(dashboard)/pointage/page.tsx                           (nouveau)
src/app/(dashboard)/me/pointage/page.tsx                        (nouveau)

src/proxy.ts                                                    (modifié)
src/components/shell/SidebarNav.tsx                             (modifié)
```

## Constitution Check

- ✅ Multi-tenant strict (filtre `companyId` partout, token globalement unique mais validé par tenant à la lecture).
- ✅ Pas d'accès Prisma direct hors repos.
- ✅ MANAGER guards sur actions sensibles.
- ✅ Pas d'over-engineering : 2 entités, pas de géoloc, pas de biométrie.

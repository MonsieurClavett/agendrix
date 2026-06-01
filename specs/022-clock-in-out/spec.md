# Feature Specification: Pointage QR (clock in/out)

**Feature Branch**: `022-clock-in-out`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 22 — pointage clock in/out. Le MANAGER crée des « postes de pointage » (Restaurant, Cuisine, etc.) dans son entreprise. Chaque poste a un QR code unique qui peut être imprimé et affiché au mur. L'employé scanne le QR avec son tel → arrive sur une page qui demande connexion (s'il n'est pas déjà loggué) → voit l'état (« pas encore pointé aujourd'hui » / « pointé depuis 9h02 ») → clic sur « Pointer entrée » ou « Pointer sortie ». Chaque pointage est enregistré avec timestamp + location + employé. Le MANAGER voit un tableau de bord `/pointage` avec les pointages du jour, l'écart entre prévu et réel."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Le MANAGER crée un poste de pointage avec QR (Priority: P1)

Un MANAGER ouvre `/punch-locations`. Clique « Nouveau poste ». Saisit un nom (« Restaurant Main St »). Le système génère un token aléatoire et affiche le QR code correspondant à l'URL `https://app/punch/{token}`. Le MANAGER peut imprimer ou télécharger le QR pour l'afficher physiquement.

**Why this priority**: Sans poste = pas de QR à scanner. C'est le préalable absolu.

**Independent Test**: Connecté en MANAGER, ouvrir `/punch-locations`, créer « Test », vérifier : (a) `PunchLocation` créée en base avec `companyId = ctx.companyId`, `token = <random>`, (b) un QR code visible sur la page, (c) cliquer le QR ouvre/télécharge l'image.

**Acceptance Scenarios**:

1. **Given** MANAGER, **When** il crée un poste « Cuisine », **Then** une `PunchLocation` existe avec token unique et le QR s'affiche.
2. **Given** MANAGER, **When** il tente de créer un poste avec un nom existant dans sa company, **Then** refusé (unique sur `companyId, name`).
3. **Given** EMPLOYEE, **When** il essaie d'accéder à `/punch-locations`, **Then** redirigé (MANAGER-only).
4. **Given** MANAGER d'une autre company, **Then** ne voit aucun poste tiers.
5. **Given** un poste, **When** le MANAGER le désactive, **Then** scanner le QR affiche « Poste désactivé ».

---

### User Story 2 - L'employé pointe son entrée via QR (Priority: P1)

EMPLOYEE Bob arrive au travail. Il scanne le QR du poste « Restaurant Main St » avec son tel. Le navigateur s'ouvre sur `/punch/<token>`. S'il n'est pas connecté, redirigé vers `/login?callbackUrl=/punch/<token>`. Une fois connecté, page affiche « Restaurant Main St — Vous n'êtes pas encore pointé aujourd'hui. [Pointer entrée] ». Il clique. Un `Punch` est créé avec `type=IN`, `punchedAt=now`. Page affiche maintenant « Vous êtes pointé depuis 9h02 ».

**Why this priority**: C'est l'action principale de l'employé.

**Independent Test**: Bob connecté, ouvrir `/punch/<token>`, cliquer « Pointer entrée ». Vérifier : (a) `Punch` créé avec `employeeId=Bob`, `locationId=<location>`, `type=IN`, `punchedAt=now`, (b) page affiche le statut « pointé ».

**Acceptance Scenarios**:

1. **Given** Bob non pointé, **When** il scanne et clique « Pointer entrée », **Then** un `Punch IN` est créé.
2. **Given** Bob déjà pointé IN aujourd'hui sans OUT, **When** il scanne, **Then** la page affiche « Pointer sortie » au lieu de « Pointer entrée ».
3. **Given** Bob qui scanne un QR d'une autre company (token bidon), **Then** « Poste introuvable » 404.
4. **Given** un EMPLOYEE qui essaie de pointer pour un autre employé (formData truqué), **Then** le serveur force `employeeId = ctx.userId` — impossible de pointer pour quelqu'un d'autre.
5. **Given** Bob déjà pointé IN puis OUT aujourd'hui, **When** il rescann le QR, **Then** la page lui permet de pointer une NOUVELLE entrée (pause repas, etc.).

---

### User Story 3 - Le MANAGER consulte les pointages du jour (Priority: P1)

Le MANAGER ouvre `/pointage`. Voit la liste des pointages d'aujourd'hui : pour chaque pointage, employé + poste + heure pointée + type (IN/OUT) + (si applicable) écart par rapport au shift prévu. Filtre par date.

**Independent Test**: Avec 5 pointages du jour, ouvrir `/pointage` en MANAGER → voir les 5 lignes triées par heure descendante. Changer la date → liste différente.

**Acceptance Scenarios**:

1. **Given** 5 pointages du jour, **When** le MANAGER ouvre `/pointage`, **Then** voit les 5 lignes.
2. **Given** un pointage IN à 9h05 pour un shift prévu 9h00, **Then** la ligne affiche « +5 min » (retard).
3. **Given** un EMPLOYEE qui essaie d'accéder à `/pointage`, **Then** redirigé.
4. **Given** un MANAGER d'une autre company, **Then** ne voit pas les pointages tiers.

---

### User Story 4 - L'employé consulte son historique (Priority: P2)

EMPLOYEE Bob ouvre `/me/pointage`. Voit la liste de SES pointages des 30 derniers jours : poste, heure IN, heure OUT, durée travaillée.

**Independent Test**: Connecté en Bob avec 10 pointages, ouvrir `/me/pointage` → voir les 10.

**Acceptance Scenarios**:

1. **Given** Bob avec 10 pointages, **When** il ouvre la page, **Then** voit les 10 par paires IN/OUT avec durée.
2. **Given** un pointage IN sans OUT (oubli), **Then** la ligne affiche « En cours » avec durée live calculée.

---

### Edge Cases

- **Oubli de pointer la sortie** : le système N'auto-clôture PAS. La ligne reste « En cours ». Le MANAGER peut éditer manuellement dans une phase ultérieure (hors scope cette phase).
- **Suppression d'un poste de pointage** : les `Punch` historiques restent (`onDelete: SetNull` sur `locationId`).
- **Pointage hors planning** : autorisé. Le MANAGER voit l'écart dans `/pointage`. Pas de blocage côté employé.
- **Plusieurs paires IN/OUT le même jour** : autorisé (pause repas, sortie temporaire, etc.). L'algo apparie le dernier IN avec un OUT en attente.
- **Cross-tenant** : un QR d'une company A ne peut être utilisé par un employé d'une company B → 404.
- **Token long et imprimable** : 16 caractères alphanumériques, suffisant contre brute-force.
- **Désactivation d'un poste** : `isActive=false`. Scanner affiche « Ce poste est désactivé » et bloque le pointage.

## Requirements *(mandatory)*

- **FR-001**: Un MANAGER MUST pouvoir créer/éditer/désactiver des `PunchLocation` dans sa company.
- **FR-002**: Chaque `PunchLocation` MUST avoir un `token` aléatoire unique servant à construire l'URL du QR.
- **FR-003**: Le QR code MUST être généré côté serveur (ou affiché en SVG/data URL côté client) et téléchargeable.
- **FR-004**: La page `/punch/[token]` MUST être accessible à TOUT utilisateur authentifié de la company propriétaire du token.
- **FR-005**: Un utilisateur non authentifié sur `/punch/[token]` MUST être redirigé vers `/login?callbackUrl=/punch/[token]`.
- **FR-006**: Le serveur MUST forcer `employeeId = ctx.userId` lors de la création d'un `Punch`.
- **FR-007**: Le système MUST déterminer automatiquement si le prochain pointage est IN ou OUT en se basant sur le dernier pointage du jour.
- **FR-008**: Le MANAGER MUST pouvoir consulter les pointages de sa company sur `/pointage` (filtré par date).
- **FR-009**: L'EMPLOYEE MUST pouvoir consulter ses propres pointages sur `/me/pointage`.
- **FR-010**: Le calcul d'écart par rapport au shift prévu MUST être effectué côté serveur (en lisant le shift le plus proche du `punchedAt`).
- **FR-011**: Filtre tenant strict : `companyId` à toute lecture/écriture.
- **FR-012**: Un poste désactivé (`isActive=false`) MUST empêcher tout nouveau pointage à ce poste.

### Key Entities *(include if feature involves data)*

- **PunchLocation** : `id`, `companyId`, `name`, `token` (unique, 16 chars random), `isActive` (default true), `createdAt`, `updatedAt`. Unique sur `(companyId, name)`.
- **Punch** : `id`, `companyId`, `employeeId` (FK Cascade), `locationId` (FK SetNull), `type` (enum IN/OUT), `punchedAt` (DateTime), `notes` (String?), `createdAt`. Index `(companyId, punchedAt desc)`, `(employeeId, punchedAt desc)`.

## Success Criteria *(mandatory)*

- **SC-001**: Un MANAGER crée un poste et imprime son QR en moins de 60s.
- **SC-002**: Un EMPLOYEE pointe en moins de 5s (scan → page → 1 clic → confirmation).
- **SC-003**: Le système affiche le bon état (IN attendu vs OUT attendu) à 100 % des cas.
- **SC-004**: Aucun pointage cross-tenant possible (vérifié par filtre tenant).
- **SC-005**: Le MANAGER voit l'écart en minutes à côté de chaque pointage matché avec un shift.

## Assumptions

- Pas de géolocalisation dans cette phase — confiance dans le fait que le QR est physiquement au lieu de travail.
- Pas de validation biométrique (photo, empreinte) — Bob peut techniquement pointer pour quelqu'un d'autre s'il a son tel ; hors scope.
- Pas d'édition manuelle des pointages par le MANAGER dans cette phase (correction → phase ultérieure).
- Pas d'export CSV dans cette phase (sera dans la phase Rapports).
- Bibliothèque QR : `qrcode` npm package (battle-tested, génère SVG ou DataURL).
- L'URL d'app est lue depuis `APP_URL` env var (cohérent avec Phase 21).

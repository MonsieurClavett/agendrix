# Implementation Plan: Recherche globale (Cmd+K) — palette de commandes

**Feature**: 024-command-palette

## Technical Context

Aucune nouvelle entité, aucune migration, aucun Server Action. Pure UI Client Component lazy-monté dans `AppShell`. Une seule dépendance npm : `cmdk` (composant primitif piloté par clavier, déjà utilisé par shadcn). Un nouveau wrapper `src/components/ui/command.tsx` (style shadcn) expose les sous-composants stylés Tailwind v4. La palette consomme :

1. La liste statique `NAV_ITEMS` extraite de `SidebarNav.tsx` (refactor mineur : exporter la const).
2. Une liste hardcodée d'actions rapides MANAGER avec leur URL cible.
3. Une liste `employees: { id, name }[]` chargée côté serveur par `AppShell` et passée en prop.
4. Le `localStorage` côté client pour les 5 dernières navigations.

## Architecture

### Entities

Aucune. Pas de migration Prisma.

### Repository (`src/lib/repositories/users.ts`)

Réutiliser ou ajouter (si manquant) :

- `listEmployeesForPalette(ctx)` retourne `{ id: string; name: string; email: string }[]` filtré `where: { companyId: ctx.companyId }`, ordonné par `name asc`. Cap à 200 résultats (palette mémoire).

### Server Actions

Aucun. La palette ne mute rien — elle navigue uniquement.

### Route Handlers

Aucun.

### UI

**Refactor — `src/components/shell/SidebarNav.tsx`**

Extraire la const `NAV_ITEMS` vers un fichier partagé `src/components/shell/nav-items.ts` exportant :

```ts
export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  managerOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [/* déplacé tel quel */];
```

`SidebarNav.tsx` importe depuis ce fichier ; pas de changement de comportement.

**Nouveau — `src/components/ui/command.tsx`**

Wrapper shadcn autour de `cmdk` exposant : `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandShortcut`, `CommandSeparator`. Styles Tailwind v4 cohérents avec les autres `ui/` (Dialog, etc.).

**Nouveau — `src/components/CommandPalette.tsx`** (Client Component)

Props :

```ts
type Props = {
  role: Role;
  employees: { id: string; name: string }[];
};
```

Comportement :

- État local `open` (boolean), `query` (string).
- `useEffect` clavier global : `keydown` sur `window`, détecte `(metaKey || ctrlKey) && key === "k"` → `preventDefault()` + `setOpen((o) => !o)`.
- Rend `<CommandDialog open={open} onOpenChange={setOpen}>`.
- Trois `CommandGroup` conditionnels :
  - `Navigation` : map sur `NAV_ITEMS` filtrés par `role`.
  - `Actions rapides` (si `role === "MANAGER"`) : 4 items hardcodés.
  - `Employés` (si `role === "MANAGER"` ET `query.length >= 1`) : map sur `employees`, label `Voir le profil de ${name}`, href `/team#${id}`.
  - `Récents` : lit `localStorage` au montage (via `useEffect`), affiche max 5.
- Chaque `CommandItem` reçoit `onSelect={() => { router.push(href); setOpen(false); persistRecent({ href, label }); }}`.
- Helper `persistRecent` (in-file ou `src/lib/command-palette-recents.ts`) : lit le tableau localStorage, déduplique sur `href`, prepend, slice(0, 5), réécrit.
- Try/catch silencieux autour de toute interaction `localStorage` (mode privé).

**Nouveau — `src/components/CommandPaletteTrigger.tsx`** (Client Component)

Bouton stylé qui ouvre la palette via un événement custom (`window.dispatchEvent(new CustomEvent("agendrix:open-command-palette"))`) écouté par `CommandPalette`. Affiche :

- Mobile (< 768 px) : icône loupe seule.
- Desktop : `"Rechercher… "` + badge `⌘K` ou `Ctrl K` selon `navigator.platform`.

Placé dans le `header` de `AppShell`.

**Modification — `src/components/shell/AppShell.tsx`** (Server Component)

- Appelle `listEmployeesForPalette(ctx)` (uniquement si role MANAGER — sinon array vide).
- Passe `<CommandPalette role={role} employees={employees} />` en root (peut être à côté du `<main>`, hors de `<aside>` et `<header>`).
- Insère `<CommandPaletteTrigger />` dans la zone droite du header.

### Notifications

Aucune.

### Sidebar entries

Aucune (la palette n'a pas d'entrée sidebar dédiée — elle est ubiquitaire via Cmd+K et le bouton header).

### Quick actions cibles

| Action | href cible |
|---|---|
| Créer un shift cette semaine | `/schedules?createShift=1` |
| Nouvelle annonce | `/annonces?new=1` |
| Nouveau poste de pointage | `/punch-locations?new=1` |
| Inviter un employé | `/team?invite=1` |

Les pages cibles peuvent ignorer le query param si elles ne le supportent pas encore (dégradation acceptable, sera affiné dans une phase ultérieure).

## File Tree

```
src/components/ui/command.tsx                       (nouveau — wrapper shadcn/cmdk)
src/components/CommandPalette.tsx                   (nouveau — Client Component principal)
src/components/CommandPaletteTrigger.tsx            (nouveau — bouton header)
src/lib/command-palette-recents.ts                  (nouveau — helpers localStorage)
src/components/shell/nav-items.ts                   (nouveau — const NAV_ITEMS extraite)

src/components/shell/SidebarNav.tsx                 (modifié — import NAV_ITEMS)
src/components/shell/AppShell.tsx                   (modifié — monte palette + trigger)
src/lib/repositories/users.ts                       (modifié — ajoute listEmployeesForPalette si absent)

package.json                                        (modifié — npm install cmdk)
```

## Risks & Mitigations

- **R1 : Conflit raccourci navigateur** — `Cmd+K` cible la barre d'URL dans Firefox. Mitigation : `preventDefault` systématique sur le `keydown` matché ; tester sur Chrome/Firefox/Safari avant merge.
- **R2 : Hydration mismatch sur le badge `⌘K` vs `Ctrl K`** — la détection plateforme dépend de `navigator`. Mitigation : rendre le badge dans un `useEffect` après mount (état initial vide) ; pas de divergence SSR.
- **R3 : Liste d'employés volumineuse** — pour 500+ employés, le payload Client gonfle. Mitigation : cap à 200 dans `listEmployeesForPalette` ; phase ultérieure pourra introduire une recherche serveur live si nécessaire.
- **R4 : localStorage indisponible** — mode privé strict, quota dépassé. Mitigation : try/catch silencieux sur toute opération, la palette dégrade proprement sans groupe « Récents ».
- **R5 : EMPLOYEE qui aurait stocké des routes MANAGER-only en récents (changement de rôle)** — Mitigation : filtre les items « Récents » contre la liste `NAV_ITEMS` autorisée au moment de l'affichage.

## Quickstart

1. `npm install cmdk`
2. `npm run dev`
3. Connecté en EMPLOYEE, appuyer `Cmd+K` → palette ouverte, seulement entrées EMPLOYEE.
4. Connecté en MANAGER, `Cmd+K` → toutes les entrées + actions rapides.
5. Taper « bob » → groupe « Employés » apparaît.
6. Naviguer entre 6 routes, rouvrir la palette → groupe « Récents » liste les 5 dernières.
7. Sur mobile (DevTools responsive), constater le bouton header tappable.

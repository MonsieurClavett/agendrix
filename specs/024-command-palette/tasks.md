# Tasks: Recherche globale (Cmd+K) — palette de commandes

**Feature**: 024-command-palette

## Phase 1 — Dépendance & primitives UI

- [X] T001 Installer la dépendance : `npm install cmdk`. Vérifier dans [package.json](package.json) que `cmdk` est listé.
- [X] T002 Créer [src/components/ui/command.tsx](src/components/ui/command.tsx) — wrapper shadcn autour de `cmdk` exposant `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandShortcut`, `CommandSeparator`. Styles Tailwind v4 cohérents avec `src/components/ui/dialog.tsx`.

## Phase 2 — Refactor navigation partagée

- [X] T003 Créer [src/components/shell/nav-items.ts](src/components/shell/nav-items.ts) qui exporte `type NavItem` et la const `NAV_ITEMS` (copiée depuis `SidebarNav.tsx`).
- [X] T004 Modifier [src/components/shell/SidebarNav.tsx](src/components/shell/SidebarNav.tsx) pour importer `NAV_ITEMS` et `NavItem` depuis `./nav-items` ; supprimer la duplication locale.

## Phase 3 — Repository employés (P1)

- [X] T005 Modifier [src/lib/repositories/users.ts](src/lib/repositories/users.ts) — ajouter `listEmployeesForPalette(ctx)` retournant `{ id, name, email }[]` filtré `companyId`, ordonné `name asc`, cap 200.

## Phase 4 — Palette client (P1)

- [X] T006 Créer [src/lib/command-palette-recents.ts](src/lib/command-palette-recents.ts) — helpers `readRecents()`, `pushRecent({ href, label })`. Try/catch silencieux. Cap à 5 items, dédup sur `href`. Clé localStorage `agendrix:command-palette:recent`.
- [X] T007 Créer [src/components/CommandPalette.tsx](src/components/CommandPalette.tsx) (Client Component) — props `{ role, employees }`. État `open`/`query`. `useEffect` keydown global avec `preventDefault` sur `Cmd/Ctrl+K`. Rend `<CommandDialog>` avec groupes conditionnels Navigation, Actions rapides (MANAGER), Employés (MANAGER + query ≥ 1), Récents. `onSelect` → `router.push(href)` + `setOpen(false)` + `pushRecent`.
- [X] T008 Créer [src/components/CommandPaletteTrigger.tsx](src/components/CommandPaletteTrigger.tsx) (Client Component) — bouton qui dispatch un `CustomEvent("agendrix:open-command-palette")`. Affiche loupe seule sur mobile, texte + badge `⌘K`/`Ctrl K` sur desktop (détection plateforme dans `useEffect` pour éviter hydration mismatch).
- [X] T009 Modifier [src/components/CommandPalette.tsx](src/components/CommandPalette.tsx) pour écouter `window.addEventListener("agendrix:open-command-palette", ...)` et faire `setOpen(true)`.

## Phase 5 — Intégration AppShell (P1)

- [X] T010 Modifier [src/components/shell/AppShell.tsx](src/components/shell/AppShell.tsx) (Server Component) — appeler `listEmployeesForPalette(ctx)` (vide si role !== MANAGER), monter `<CommandPalette role={role} employees={employees} />` à la racine du shell, insérer `<CommandPaletteTrigger />` dans la zone droite du header.

## Phase 6 — Polish

- [X] T011 Tester manuellement : MANAGER → toutes entrées + 4 actions rapides + recherche employé fonctionne ; EMPLOYEE → seulement navigation autorisée, pas d'actions rapides, pas de groupe Employés.
- [X] T012 Tester clavier : `Cmd+K` toggle ouvre/ferme, `Esc` ferme, `↑`/`↓` + `Entrée` navigue.
- [X] T013 Tester mobile (DevTools responsive) : bouton trigger tappable, palette s'ouvre au tap.
- [X] T014 Tester `localStorage` désactivé (mode privé strict Safari) : palette fonctionne sans crash, groupe Récents absent.
- [X] T015 Mettre à jour [CLAUDE.md](CLAUDE.md) — pointeur `Active feature` vers `024-command-palette`, ajouter `024-command-palette` à la liste des phases shippées.
- [X] T016 `npx tsc --noEmit` + `npm run build` — aucune erreur.

## Dependencies

- T002 dépend de T001 (cmdk installé).
- T004 dépend de T003 (NAV_ITEMS extraite).
- T007 dépend de T002, T003, T006 (primitive UI + nav-items + helpers récents).
- T008 et T009 dépendent de T007 (palette principale créée).
- T010 dépend de T005, T007, T008 (repo employés + palette + trigger).
- T011–T014 dépendent de T010 (intégration complète).
- T015 dépend de T011–T014 (validation manuelle OK avant pointeur).
- T016 dépend de tout le reste.

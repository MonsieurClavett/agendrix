# Implementation Plan: Annonces internes

**Feature**: 018-announcements
**Spec**: [spec.md](./spec.md)

## Architecture

### Entité

`Announcement` : `id`, `companyId`, `authorUserId` (SetNull), `title`, `body`, `isPinned`, `createdAt`, `updatedAt`.
Index : `(companyId, isPinned, createdAt desc)`.

### Repository (`src/lib/repositories/announcement.ts`)

- `listForCompany(ctx)` — ordre `isPinned desc, createdAt desc`.
- `listForDashboard(ctx)` — top 3 (épinglées + dernières).
- `createAnnouncement(ctx, { title, body })` — transaction : crée annonce + N notifications `ANNOUNCEMENT_POSTED` pour chaque employé actif ≠ auteur.
- `updateAnnouncement(ctx, id, { title?, body? })`.
- `togglePin(ctx, id)`.
- `deleteAnnouncement(ctx, id)`.

### NotificationType

Ajouter `ANNOUNCEMENT_POSTED` à l'enum, payload Zod `{ type, announcementId, title, authorName }`.
`renderNotificationHref` retourne `/annonces`.

### Server Actions (`src/actions/announcements/`)

- `create.ts`, `update.ts`, `delete.ts`, `togglePin.ts` — toutes MANAGER-only.

### UI

- `/annonces` page : Server Component, MANAGER voit les boutons d'action, EMPLOYEE en lecture seule.
- `_components/AnnouncementCard.tsx`, `AnnouncementDialog.tsx`, `DeleteAnnouncementDialog.tsx`.
- Sidebar : entrée « Annonces » (icône Megaphone — déjà utilisée pour quarts-à-combler, choisir `Newspaper`).
- Dashboard : widget « Annonces » (liste compacte de 3 cards), placé en colonne droite à côté de l'équipe.
- proxy.ts : `/annonces` protégé.

## Risks & Mitigations

- **R1 : Notifications en masse**. Mitigation : `createMany` dans la même transaction, 1 round-trip.
- **R2 : Conflit d'icône `Megaphone`**. Mitigation : utiliser `Newspaper` pour les annonces, garder `Megaphone` pour quarts-à-combler.

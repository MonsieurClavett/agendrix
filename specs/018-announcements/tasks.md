# Tasks: Annonces internes

**Feature**: 018-announcements

## Phase 1 — Schema

- [X] T001 Ajouter `model Announcement` à [prisma/schema.prisma](prisma/schema.prisma) + back-relations Company, User.
- [X] T002 Ajouter `ANNOUNCEMENT_POSTED` à enum `NotificationType`.
- [X] T003 `npx prisma migrate dev --name add_announcements`.

## Phase 2 — Repository + Notifications

- [X] T004 Étendre [src/lib/notifications.ts](src/lib/notifications.ts) avec schema Zod `ANNOUNCEMENT_POSTED_PAYLOAD` et branches dans `renderNotificationLabel`, `renderNotificationHref`, `renderNotificationEmailSubject`.
- [X] T005 Créer [src/lib/repositories/announcement.ts](src/lib/repositories/announcement.ts) avec `listForCompany`, `listForDashboard`, `createAnnouncement` (tx + createMany notifications), `updateAnnouncement`, `togglePin`, `deleteAnnouncement`.

## Phase 3 — Server Actions (P1)

- [X] T006 [P] Créer [src/actions/announcements/create.ts](src/actions/announcements/create.ts) — MANAGER-only.
- [X] T007 [P] Créer [src/actions/announcements/update.ts](src/actions/announcements/update.ts).
- [X] T008 [P] Créer [src/actions/announcements/delete.ts](src/actions/announcements/delete.ts).
- [X] T009 [P] Créer [src/actions/announcements/togglePin.ts](src/actions/announcements/togglePin.ts).

## Phase 4 — UI (P1)

- [X] T010 Créer [src/app/(dashboard)/annonces/page.tsx](src/app/(dashboard)/annonces/page.tsx).
- [X] T011 Créer [src/app/(dashboard)/annonces/_components/AnnouncementsList.tsx](src/app/(dashboard)/annonces/_components/AnnouncementsList.tsx).
- [X] T012 Créer [src/app/(dashboard)/annonces/_components/AnnouncementCard.tsx](src/app/(dashboard)/annonces/_components/AnnouncementCard.tsx).
- [X] T013 Créer [src/app/(dashboard)/annonces/_components/AnnouncementDialog.tsx](src/app/(dashboard)/annonces/_components/AnnouncementDialog.tsx) (create + edit).
- [X] T014 Créer [src/app/(dashboard)/annonces/_components/DeleteAnnouncementDialog.tsx](src/app/(dashboard)/annonces/_components/DeleteAnnouncementDialog.tsx).

## Phase 5 — Integration

- [X] T015 Modifier [src/proxy.ts](src/proxy.ts) : ajouter `/annonces`.
- [X] T016 Modifier [src/components/shell/SidebarNav.tsx](src/components/shell/SidebarNav.tsx) : ajouter « Annonces » (icône Newspaper).
- [X] T017 Modifier [src/app/(dashboard)/dashboard/page.tsx](src/app/(dashboard)/dashboard/page.tsx) : ajouter widget « Annonces » (3 dernières/épinglées).

## Phase 6 — Polish

- [X] T018 CLAUDE.md pointeur → 018.
- [X] T019 `npx tsc --noEmit` + `npm run build`.

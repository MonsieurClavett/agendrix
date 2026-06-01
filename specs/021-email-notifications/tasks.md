# Tasks: Notifications par email

**Feature**: 021-email-notifications

## Phase 1 — Repository

- [X] T001 Modifier `createAnnouncement` dans [src/lib/repositories/announcement.ts](src/lib/repositories/announcement.ts) pour retourner `recipients: { email, name }[]`.

## Phase 2 — Server Action

- [X] T002 Modifier [src/actions/announcements/create.ts](src/actions/announcements/create.ts) pour itérer sur les recipients et fire un email via `sendNotificationEmail` (Promise.allSettled).

## Phase 3 — Template HTML

- [X] T003 Améliorer `renderNotificationHtml` dans [src/lib/email.ts](src/lib/email.ts) avec design brandé Agendrix (header, CTA, footer).

## Phase 4 — Documentation

- [X] T004 Créer `.env.example` à la racine du projet documentant les variables `RESEND_API_KEY`, `RESEND_FROM`, `APP_URL`.

## Phase 5 — Polish

- [X] T005 CLAUDE.md pointeur → 021.
- [X] T006 `npx tsc --noEmit` + `npm run build`.

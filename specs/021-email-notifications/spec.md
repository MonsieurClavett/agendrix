# Feature Specification: Notifications par email

**Feature Branch**: `021-email-notifications`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 21 — wirer les notifications par email. Toutes les notifications in-app existantes (shifts publiés, congés décidés, claims décidés, échanges, annonces) doivent maintenant aussi être envoyées par email via Resend, avec un rendu HTML cohérent et brandé Agendrix."

## User Scenarios & Testing

### User Story 1 - Tous les types de notif déclenchent un email (Priority: P1)

Quand un événement crée une `Notification` in-app pour un utilisateur, le système doit ALSO envoyer un email à l'adresse de ce destinataire (via Resend si `RESEND_API_KEY` est défini, ou log console en dev). Les emails ratés ne doivent PAS bloquer l'action utilisateur.

**Independent Test**: En MANAGER, publier une annonce → vérifier que `sendNotificationEmail` est appelée pour chaque employé actif (≠ auteur). Avec `RESEND_API_KEY` configuré : email reçu en boîte. Sans clé : log `[email dev fallback]` apparaît dans la console serveur.

**Acceptance Scenarios**:

1. **Given** une annonce publiée par le MANAGER, **When** la transaction commit, **Then** chaque employé actif reçoit un email (ou log dev).
2. **Given** Resend qui retourne une erreur HTTP 500, **When** l'envoi échoue, **Then** l'action utilisateur réussit quand même (try/catch swallow) et un `console.warn` est émis.
3. **Given** un `RESEND_API_KEY` invalide, **When** l'API rejette, **Then** même comportement — pas d'impact utilisateur.

---

### User Story 2 - Rendu HTML brandé (Priority: P2)

Tous les emails ont un header avec le nom Agendrix + nom de la company, un corps avec le message, un bouton vers le lien pertinent, et un footer.

**Independent Test**: Recevoir un email d'annonce → vérifier visuel cohérent (header, bouton, footer).

---

### Edge Cases

- **Utilisateur sans email** : impossible — `email` est `@unique` non-null sur User.
- **Email avec caractères spéciaux dans titre/corps** : échappés via `escapeHtml`.
- **Resend non configuré** : log dev fallback, return `{ delivered: false }`.

## Requirements

- **FR-001**: La création d'une annonce DOIT déclencher l'envoi d'un email à chaque destinataire de la notification.
- **FR-002**: Les emails ratés DOIVENT être swallow (`try/catch` + `console.warn`) — jamais bloquer la mutation.
- **FR-003**: Le template HTML DOIT inclure : header avec nom Agendrix, message, bouton vers `/annonces` (ou autre href selon type), footer.
- **FR-004**: Le sujet d'email DOIT être unique par type de notif (déjà implémenté).
- **FR-005**: Le contenu email DOIT s'auto-adapter au type via `renderNotificationLabel`/`renderNotificationEmailSubject`/`renderNotificationHref`.

## Success Criteria

- **SC-001**: Tous les 8 types de notifs déclenchent un email (audit grep `createNotificationsInTx` + `sendNotificationEmail`).
- **SC-002**: Avec `RESEND_API_KEY` invalide, aucune action utilisateur ne casse.
- **SC-003**: En dev, log `[email dev fallback]` apparaît pour chaque tentative d'envoi.

## Assumptions

- Le helper `sendNotificationEmail` existant (Phase 11) gère déjà : dev fallback, Resend, escape HTML, link absolu.
- Pas d'opt-out par utilisateur dans cette phase.
- Pas de batching/queue — chaque notif émet un email synchrone post-commit.

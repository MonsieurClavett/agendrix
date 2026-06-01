# Implementation Plan: Notifications par email

**Feature**: 021-email-notifications

## Audit (état avant)

| Type | Action | Email send |
|------|--------|------------|
| SHIFT_PUBLISHED | `actions/shifts/publishWeek.ts` | ✅ |
| TIME_OFF_DECIDED | `actions/timeOff/decide.ts` | ✅ |
| CLAIM_DECIDED | `actions/openShifts/assignOpenShift.ts` | ✅ |
| SWAP_PROPOSED | `actions/shiftSwaps/propose.ts` | ✅ |
| SWAP_ACCEPTED_BY_PEER | `actions/shiftSwaps/peerAccept.ts` | ✅ |
| SWAP_REJECTED_BY_PEER | `actions/shiftSwaps/peerReject.ts` | ✅ |
| SWAP_DECIDED_BY_MANAGER | `actions/shiftSwaps/managerDecide.ts` | ✅ |
| **ANNOUNCEMENT_POSTED** | `actions/announcements/create.ts` | ❌ |

## Architecture

### 1. Wire l'envoi d'email pour annonces (manquant)

Le repo `createAnnouncement` renvoie déjà l'`id` mais pas la liste des recipients. Étendre :
- `createAnnouncement` renvoie `{ id, recipientCount, recipients: { email, name }[] }` pour que l'action puisse boucler.
- L'action `createAnnouncementAction` itère sur `result.recipients`, fire un email par destinataire via `sendNotificationEmail`, swallow individuels.

### 2. Améliorer le template HTML

Le `renderNotificationHtml` actuel (Phase 11) est minimaliste. L'enrichir :
- Header avec brand Agendrix + accent color.
- Card centrale avec border + shadow.
- Bouton CTA stylé.
- Footer avec lien de désinscription (placeholder pour future).

### 3. Documentation .env

Ajouter dans CLAUDE.md ou dans `.env.example` (si existe) :
```
# Email (optionnel, dev fallback = console log)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM=onboarding@resend.dev   # ou hello@yourdomain.com une fois domaine vérifié
APP_URL=http://localhost:3000        # pour construire les liens absolus dans les emails
```

## Risks

- **R1 : N emails synchrones bloquent l'UI** — pour une annonce avec 20 employés, 20 appels Resend séquentiels = ~2s. Mitigation : `Promise.allSettled` pour paralléliser.
- **R2 : Resend rate limit** — Resend free = 100/jour. Pas mitigé dans cette phase (largement suffisant pour démo).

## Files

```
src/lib/email.ts                            (modifié — template HTML amélioré)
src/lib/repositories/announcement.ts        (modifié — retourne recipients)
src/actions/announcements/create.ts         (modifié — wire emails)
.env.example                                (nouveau — doc setup)
```

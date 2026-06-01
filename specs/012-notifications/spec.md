# Feature Specification: Notifications

**Feature Branch**: `012-notifications`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 11 — notifications in-app + email. Quand un événement important affecte un utilisateur (ses shifts sont publiés, sa demande de congé est décidée, sa demande de quart à combler est approuvée ou refusée), il reçoit (a) une notification dans l'app accessible via une cloche dans l'en-tête, et (b) un email récapitulatif."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - L'EMPLOYEE est notifié de ses nouveaux shifts (Priority: P1)

Quand un MANAGER clique « Publier la semaine », chaque EMPLOYEE concerné (qui a au moins un shift publié dans la transaction) reçoit immédiatement une notification in-app et un email récapitulatif (« Vous avez 5 nouveaux shifts publiés cette semaine »). La notification reste dans la liste tant que l'EMPLOYEE ne l'a pas marquée comme lue. La cloche dans l'en-tête affiche un point ou un compteur tant qu'il reste des notifications non lues.

**Why this priority**: C'est le cas d'usage central. Sans notification de publication, un employé doit checker manuellement son calendrier — la valeur produit s'effondre.

**Independent Test**: MANAGER publie une semaine de 5 shifts pour Bob. Vérifier : (a) une notification existe en base pour Bob de type `SHIFT_PUBLISHED`, (b) la cloche de Bob affiche un badge, (c) ouvrir la cloche montre la notification avec le bon contenu, (d) marquer lu → la notification reste dans la liste mais n'est plus comptée dans le badge, (e) en dev, le contenu de l'email est loggé dans la console serveur.

**Acceptance Scenarios**:

1. **Given** un MANAGER avec 5 shifts DRAFT assignés à Bob pour la semaine du 13 juillet, **When** il clique « Publier la semaine » et confirme, **Then** une seule notification `SHIFT_PUBLISHED` est créée pour Bob avec un payload contenant le nombre de shifts (5) et la plage de semaine.
2. **Given** la même publication concernant 3 employés différents, **When** la transaction se complète, **Then** exactement 3 notifications sont créées (une par employé) et 3 emails sont envoyés.
3. **Given** une publication qui ne touche aucun shift DRAFT (`count === 0`), **When** elle se termine, **Then** aucune notification n'est créée.
4. **Given** Bob avec une notification non lue, **When** il ouvre la cloche et clique « Marquer comme lue », **Then** `readAt` est défini et la notification disparaît du compteur du badge (mais reste visible dans la liste).
5. **Given** une notification non lue d'il y a 5 jours, **When** Bob ouvre la cloche, **Then** elle apparaît avec une indication de date relative (« il y a 5 jours »).

---

### User Story 2 - L'EMPLOYEE est notifié de la décision sur ses congés (Priority: P1)

Quand un MANAGER approuve ou refuse une demande de congé, l'EMPLOYEE demandeur reçoit immédiatement une notification in-app et un email récapitulatif (« Votre demande de congé du 15 au 22 juillet a été approuvée. »). Le type de notification est `TIME_OFF_DECIDED` et le payload contient la plage de dates et la décision.

**Why this priority**: C'est la fermeture du workflow de congés. Sans cette notification, l'EMPLOYEE doit consulter `/conges` manuellement — friction inacceptable.

**Independent Test**: Bob soumet une demande PENDING. Alice clique « Approuver ». Vérifier : (a) une notification `TIME_OFF_DECIDED` est créée pour Bob avec payload `{ status: "APPROVED", startDate, endDate, type }`, (b) la cloche de Bob s'allume, (c) un email a été envoyé avec le sujet « Votre demande de congé a été approuvée. »

**Acceptance Scenarios**:

1. **Given** une demande de congé PENDING de Bob, **When** Alice clique « Approuver » et confirme, **Then** une notification `TIME_OFF_DECIDED` avec `status: "APPROVED"` est créée pour Bob et un email est envoyé.
2. **Given** la même demande, **When** Alice clique « Refuser » à la place, **Then** la notification est `status: "REJECTED"`.
3. **Given** une demande déjà APPROVED, **When** Alice la modifie ou la supprime (pas une nouvelle décision), **Then** aucune notification de re-décision n'est envoyée — seules les transitions PENDING → APPROVED/REJECTED déclenchent l'envoi.
4. **Given** un MANAGER qui s'auto-approuve sa propre demande, **When** la transaction se complète, **Then** une notification est quand même créée pour lui (cohérence — il est aussi le destinataire).

---

### User Story 3 - L'EMPLOYEE est notifié de la décision sur sa demande de quart à combler (Priority: P2)

Quand un MANAGER attribue un quart à combler, le demandeur choisi (APPROVED) ET tous les demandeurs refusés (REJECTED) reçoivent chacun une notification in-app + email avec leur résultat respectif (« Votre demande pour le quart du mercredi 16 juillet a été approuvée. » / « refusée. »).

**Why this priority**: Ferme le workflow Phase 9. P2 car le calendrier reste consultable manuellement par chaque demandeur ; mais sans cette US les employés ne savent pas qu'ils ont gagné ou perdu.

**Independent Test**: Un quart à combler avec 2 demandeurs (Bob, Carol). MANAGER attribue à Bob. Vérifier : (a) Bob reçoit une notification `CLAIM_DECIDED` `status: "APPROVED"`, (b) Carol reçoit une notification `CLAIM_DECIDED` `status: "REJECTED"`, (c) deux emails sont envoyés.

**Acceptance Scenarios**:

1. **Given** un quart à combler avec 3 demandes PENDING, **When** le MANAGER attribue à l'un des trois, **Then** 1 notification `APPROVED` est créée pour le gagnant et 2 notifications `REJECTED` pour les autres.
2. **Given** un quart à combler avec 1 seule demande PENDING, **When** l'attribution se fait, **Then** 1 notification `APPROVED` est créée et aucune notification `REJECTED`.
3. **Given** un EMPLOYEE qui annule sa propre claim avant attribution, **When** la suppression se fait, **Then** aucune notification n'est créée (l'annulation est silencieuse).

---

### User Story 4 - L'utilisateur consulte et gère ses notifications (Priority: P2)

Un utilisateur (n'importe quel rôle) peut cliquer sur la cloche dans l'en-tête pour ouvrir un panneau déroulant qui montre ses 10 notifications les plus récentes (lues et non lues mélangées, triées par date desc). Chaque notification montre une icône selon son type, un libellé court généré côté serveur, et la date relative. Un bouton « Marquer toutes comme lues » est disponible quand au moins une notification est non lue. Une notification peut aussi être marquée individuellement comme lue en cliquant dessus. La cloche affiche un point coloré ou un compteur quand il y a des notifications non lues.

**Why this priority**: C'est le UI principal de consommation. Sans cette US les notifications existent en base mais sont invisibles. P2 car techniquement US1 et US2 fonctionnent même sans UI (les emails partent), mais l'expérience produit reste boiteuse.

**Independent Test**: Bob a 3 notifications non lues + 2 lues. Cliquer sur la cloche → vérifier que les 5 apparaissent triées par date, les non lues en gras. Cliquer sur « Marquer toutes comme lues » → vérifier que le badge disparaît.

**Acceptance Scenarios**:

1. **Given** Bob avec 12 notifications (8 non lues, 4 lues), **When** il ouvre la cloche, **Then** seules les 10 plus récentes apparaissent, triées par date desc.
2. **Given** Bob avec 3 non lues, **When** il clique « Marquer toutes comme lues », **Then** chaque `readAt` est défini à `now` et le badge disparaît.
3. **Given** une notification non lue, **When** Bob clique dessus, **Then** son `readAt` est défini et elle apparaît comme lue. Si la notification a un lien (par exemple vers `/schedules?week=...`), le clic navigue aussi vers ce lien.
4. **Given** Bob n'a aucune notification, **When** il ouvre la cloche, **Then** un état vide cordial est affiché (« Pas de notifications pour le moment. »).
5. **Given** un MANAGER de la company A, **When** il consulte ses notifications, **Then** aucune notification destinée à un utilisateur de la company B n'apparaît.

---

### Edge Cases

- **`RESEND_API_KEY` non défini** : la notification in-app est créée comme d'habitude, l'email est loggé en console (même fallback que Phase 10). Le flow ne plante PAS.
- **Échec d'envoi d'email** : la notification in-app reste créée. L'erreur email est loggée mais n'aboutit pas dans une 500 visible côté MANAGER (la publication, l'approbation, etc. réussissent quand même).
- **Suppression d'un utilisateur destinataire** : ses notifications sont supprimées en cascade (FK ON DELETE CASCADE).
- **Notification très vieille** (> 30 jours) : reste en base, reste consultable dans la liste. Pas de purge automatique dans cette phase.
- **Plusieurs publications successives sur la même semaine** : chaque publication non vide crée une notification distincte (l'utilisateur peut voir « 3 shifts publiés », puis « 2 shifts publiés » comme deux lignes).
- **Drag-and-drop d'un shift PUBLISHED** : aucune notification (FR-009 de Phase 8 — la modification d'un shift PUBLISHED reste PUBLISHED, pas de re-notification).
- **Email avec caractères spéciaux dans le payload** (apostrophes, accents) : échappés correctement dans le HTML.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: À chaque transition `DRAFT → PUBLISHED` d'un ou plusieurs shifts dans une opération atomique (la Server Action `publishWeekAction`), le système MUST créer exactement une notification de type `SHIFT_PUBLISHED` par EMPLOYEE distinct concerné, avec un payload contenant le nombre de shifts publiés pour cet employé et la `weekStartISO`.
- **FR-002**: À chaque transition `PENDING → APPROVED` ou `PENDING → REJECTED` d'une demande de congé, le système MUST créer une notification de type `TIME_OFF_DECIDED` pour le demandeur, avec un payload contenant `{ status, startDate, endDate, type }`.
- **FR-003**: À chaque attribution d'un quart à combler, le système MUST créer exactement une notification de type `CLAIM_DECIDED` par claim affectée (APPROVED pour le gagnant, REJECTED pour les peers).
- **FR-004**: Pour chaque notification créée, le système MUST envoyer un email à l'adresse de l'utilisateur destinataire (sauf si `RESEND_API_KEY` est absent, auquel cas le contenu est loggé en console — même fallback que Phase 10).
- **FR-005**: Un échec d'envoi d'email MUST NOT empêcher la création de la notification in-app ni faire échouer la Server Action déclencheuse.
- **FR-006**: Chaque notification MUST avoir un champ `readAt` nullable. À la création, `readAt = NULL`. La notification est considérée « non lue » tant que `readAt IS NULL`.
- **FR-007**: Un utilisateur MUST pouvoir consulter ses 10 notifications les plus récentes via un panneau déroulant accessible depuis une cloche dans l'en-tête de l'application.
- **FR-008**: Un utilisateur MUST pouvoir marquer une notification individuellement comme lue (clic sur la notification) ou toutes en une fois (bouton « Marquer toutes comme lues »).
- **FR-009**: La cloche MUST afficher un indicateur visuel (point ou compteur) quand au moins une notification du destinataire connecté est non lue.
- **FR-010**: Un utilisateur MUST NOT pouvoir lire, modifier ou supprimer les notifications d'un autre utilisateur — même au sein de la même company.
- **FR-011**: Aucun utilisateur MUST pouvoir accéder à des notifications appartenant à une autre company.
- **FR-012**: Chaque notification MUST porter un type (enum) et un champ payload JSON typé par l'application. Le rendu côté UI (libellé, icône, lien optionnel) MUST être dérivé du type + payload, pas stocké en base.
- **FR-013**: La suppression d'un utilisateur MUST entraîner la suppression de toutes ses notifications.

### Key Entities *(include if feature involves data)*

- **Notification** : Représente une notification destinée à un utilisateur.
  - Attributs : entreprise propriétaire, utilisateur destinataire, type (`SHIFT_PUBLISHED` / `TIME_OFF_DECIDED` / `CLAIM_DECIDED`), payload (JSON), date de création, date de lecture (nullable).
  - Contraintes : `companyId` toujours présent (tenant key) ; index sur `(recipientUserId, createdAt desc)` pour la requête principale du panneau ; cascade sur suppression de l'utilisateur et de la company.
  - Le payload est typé côté application par `NotificationType` mais stocké comme `Json` en base.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Une publication touchant 10 employés crée 10 notifications + déclenche 10 envois email en moins de 3 secondes côté MANAGER (perçu).
- **SC-002**: Le panneau de notifications s'ouvre et affiche la liste en moins de 200 ms après le clic sur la cloche.
- **SC-003**: 100 % des décisions de congé (APPROVED / REJECTED) génèrent exactement une notification.
- **SC-004**: 100 % des attributions de quart à combler génèrent exactement (1 + N) notifications, où N est le nombre de demandeurs refusés.
- **SC-005**: 0 fuite cross-tenant : un utilisateur de la company A ne MUST jamais voir une notification destinée à un utilisateur de la company B, ni la marquer comme lue, ni recevoir son email.
- **SC-006**: 0 plantage de Server Action déclencheuse en cas d'échec d'email (le fallback est robuste).
- **SC-007**: La cloche MUST refléter exactement le nombre de notifications non lues du destinataire connecté — vérifiable en créant N notifications et en lisant le badge.

## Assumptions

- **Pas de notifications push** (web push, mobile push). Hors-scope.
- **Pas de canaux configurables par utilisateur** (« je veux les emails mais pas l'in-app »). Tous les utilisateurs reçoivent tout ; la désactivation est une feature de prefs ultérieure.
- **Pas de digest hebdomadaire** ni de regroupement « 5 décisions cette semaine » dans un seul email. Chaque événement = un email.
- **Pas de purge automatique** des vieilles notifications. Une feature de housekeeping ultérieure.
- **Pas de notification temps-réel** (WebSocket / SSE). Le panneau se rafraîchit à l'ouverture et après chaque action client (`router.refresh()`).
- **Pas de localisation par utilisateur** — les libellés sont en français pour tout le monde, cohérent avec le reste de l'app.
- **Les emails de Phase 10 (invitations) sont indépendants** — ils ne passent pas par le système de notifications introduit ici (ils sont déjà des « emails directs » sans entrée en base).
- L'invariant tenant et les helpers de session des phases précédentes s'appliquent intégralement à cette feature, sans exception.

# Feature Specification: Invitations email

**Feature Branch**: `011-email-invitations`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Phase 10 — invitations email. Remplacer le flow d'invitation actuel (création directe d'un User avec mot de passe temporaire affiché au MANAGER) par un flow B2B classique : MANAGER saisit email + nom + rôle, l'EMPLOYEE reçoit un email avec un lien à usage unique, clique dessus, choisit son mot de passe, son compte devient actif."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Le MANAGER envoie une invitation par email (Priority: P1)

Un MANAGER va sur la page « Équipe », clique « Inviter un employé », saisit l'email, le nom et le rôle (MANAGER ou EMPLOYEE) de la personne à inviter. Le système crée une invitation en attente, génère un lien à usage unique, et envoie un email à l'adresse fournie. Le MANAGER reçoit une confirmation visuelle ; l'invitation apparaît sur la page « Équipe » dans une section « Invitations en attente ».

**Why this priority**: C'est le point d'entrée de la feature. Sans cette US, rien n'est invité.

**Independent Test**: Connecté en MANAGER, ouvrir le dialog « Inviter », saisir `bob@acme.test` / `Bob Builder` / EMPLOYEE, valider. Vérifier : (a) une invitation `bob@acme.test` apparaît dans la section « Invitations en attente » avec un statut « En attente », (b) un email a été envoyé (ou un lien visible côté MANAGER en mode dev sans Resend configuré), (c) aucun User n'est créé en base à ce stade.

**Acceptance Scenarios**:

1. **Given** un MANAGER sur `/team`, **When** il invite `bob@acme.test`, **Then** une `Invitation` est créée avec `status = PENDING`, le token est généré côté serveur, et un email est envoyé contenant un lien `${APP_URL}/accept-invitation/${token}`.
2. **Given** une invitation déjà PENDING pour `bob@acme.test` dans la company A, **When** le MANAGER tente d'envoyer une seconde invitation au même email, **Then** le système refuse avec un message clair (« Une invitation pour cet email est déjà en attente. ») et n'envoie pas de second email.
3. **Given** un User existant `bob@acme.test` dans une company, **When** un MANAGER (n'importe laquelle company) tente de l'inviter, **Then** le système refuse avec « Cet email est déjà associé à un compte. »
4. **Given** une invitation envoyée, **When** le MANAGER consulte `/team`, **Then** elle apparaît dans la section « Invitations en attente » avec l'email, le rôle, la date d'envoi et la date d'expiration.
5. **Given** la variable d'environnement `RESEND_API_KEY` n'est PAS définie (mode dev), **When** le MANAGER invite quelqu'un, **Then** l'action réussit, l'email n'est pas réellement envoyé, et le lien d'invitation est affiché au MANAGER (toast + section « Invitations en attente ») pour qu'il puisse le copier manuellement.

---

### User Story 2 - L'invité active son compte via le lien (Priority: P1)

Un EMPLOYEE reçoit l'email d'invitation et clique sur le lien. Le navigateur l'amène sur une page `/accept-invitation/[token]` qui affiche son email (pré-rempli, non éditable), son nom (pré-rempli, éditable), et un champ « Mot de passe » + « Confirmer le mot de passe ». Il saisit son mot de passe, soumet. Le compte est créé immédiatement avec le rôle prévu, l'invitation est marquée acceptée, l'EMPLOYEE est redirigé vers `/login` avec un message de bienvenue. Il peut ensuite se connecter normalement.

**Why this priority**: Sans cette US, les invitations restent inutilisées. C'est l'autre moitié obligatoire du workflow.

**Independent Test**: Avec une invitation PENDING dont le token est connu, ouvrir `/accept-invitation/<token>` en mode anonyme (sans session). Vérifier : (a) le formulaire montre l'email pré-rempli, (b) saisir un mot de passe valide soumet l'invitation, (c) un User est créé avec les bons company + role, (d) l'invitation passe en ACCEPTED et son `acceptedAt` est défini, (e) un nouveau login avec cet email + nouveau mot de passe fonctionne.

**Acceptance Scenarios**:

1. **Given** une invitation PENDING valide non expirée, **When** l'invité ouvre `/accept-invitation/<token>`, soumet `password = "..."`, **Then** un `User` est créé avec `email`, `name`, `role`, `companyId` de l'invitation et `passwordHash = bcrypt(password)`, l'invitation passe en ACCEPTED.
2. **Given** une invitation déjà ACCEPTED, **When** quelqu'un ouvre `/accept-invitation/<token>`, **Then** la page affiche « Cette invitation a déjà été utilisée. Connectez-vous avec votre compte existant. » et NE crée pas de second compte.
3. **Given** une invitation EXPIRED (au-delà de la date d'expiration), **When** quelqu'un ouvre `/accept-invitation/<token>`, **Then** la page affiche « Cette invitation a expiré. Demandez à votre gestionnaire d'en envoyer une nouvelle. »
4. **Given** un token inconnu ou malformé, **When** quelqu'un ouvre `/accept-invitation/<inconnu>`, **Then** la page affiche « Cette invitation est introuvable. » sans dévoiler la cause exacte.
5. **Given** un mot de passe trop court (< 8 caractères), **When** l'invité soumet le formulaire, **Then** le système refuse avec un message de validation et n'altère pas l'invitation.

---

### User Story 3 - Le MANAGER gère ses invitations en attente (Priority: P2)

Sur la page « Équipe », sous la section « Invitations en attente », le MANAGER peut pour chaque invitation : (a) renvoyer l'email (refresh le lien sans changer le token ni la date d'expiration), (b) révoquer l'invitation (supprime la ligne, le lien devient invalide). Les invitations expirées apparaissent avec un statut visuel distinct et peuvent uniquement être révoquées (le « Renvoyer » est désactivé pour les expirées — il faut envoyer une nouvelle invitation).

**Why this priority**: Confort opérationnel — utile pour relancer un employé qui n'a pas vu l'email, ou pour annuler une invitation envoyée par erreur. P2 car le workflow fonctionne sans (US1+US2 suffisent au MVP).

**Independent Test**: Avec une invitation PENDING : cliquer « Renvoyer » → vérifier qu'un email est envoyé et que le toast confirme. Cliquer « Révoquer » sur une autre → la ligne disparaît, et le lien correspondant retourne « invitation introuvable ».

**Acceptance Scenarios**:

1. **Given** une invitation PENDING, **When** le MANAGER clique « Renvoyer », **Then** un nouvel email est envoyé avec le même token et la même date d'expiration, et un toast confirme.
2. **Given** une invitation PENDING, **When** le MANAGER clique « Révoquer », **Then** la ligne est supprimée et `/accept-invitation/<token>` retourne « invitation introuvable ».
3. **Given** une invitation EXPIRED, **When** le MANAGER ouvre la section, **Then** le bouton « Renvoyer » est désactivé et le statut affiche « Expirée ».
4. **Given** un MANAGER de la company A, **When** il consulte les invitations, **Then** seules les invitations de A apparaissent. Aucune fuite cross-tenant.

---

### Edge Cases

- **Token tronqué dans le lien email** : la page de tokens inconnus s'affiche, pas d'erreur 500.
- **Tentative de POST sur `/accept-invitation/[token]` sans token** : refusée côté Server Action.
- **Plusieurs invitations PENDING pour le MÊME email dans DIFFÉRENTES companies** : autorisé. L'email peut être invité par plusieurs entreprises tant qu'il n'a pas créé son compte. Une fois `User` créé pour cet email (acceptation de l'une), les autres invitations restent PENDING mais leur acceptation échoue avec « Cet email a déjà un compte ».
- **Invitation acceptée mais l'utilisateur se trompe dans son mot de passe au moment de la création** : retry sur la même page (le token n'est consommé que sur succès).
- **Re-invitation après révocation** : la nouvelle invitation est traitée comme un nouveau cas — token et expiration neufs.
- **MANAGER supprimé entre la création de l'invitation et son acceptation** : l'invitation reste valide (elle est rattachée à la company, pas au MANAGER). `invitedByUserId` devient NULL via FK SET NULL.
- **EMPLOYEE qui se désactive puis qu'on ré-invite** : l'email d'un User désactivé reste pris ; il faut le réactiver depuis `/team`, pas le réinviter. L'invitation échoue avec « Cet email est déjà associé à un compte. »
- **Email avec casse différente** (`Bob@Acme.test` vs `bob@acme.test`) : le système normalise en minuscules pour la comparaison ET le stockage.
- **Variable d'environnement `RESEND_API_KEY` absente en prod** : le bouton fonctionne quand même, le lien est loggé en console et affiché au MANAGER. Pas de plantage.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Un MANAGER MUST pouvoir créer une invitation à partir d'un email, d'un nom et d'un rôle. Le système MUST normaliser l'email en minuscules avant validation et stockage.
- **FR-002**: Le système MUST refuser une invitation lorsqu'un User actif ou inactif existe déjà avec le même email (toutes companies confondues).
- **FR-003**: Le système MUST refuser une seconde invitation PENDING pour le même `(companyId, email)`.
- **FR-004**: À la création d'une invitation, le système MUST générer un token cryptographiquement aléatoire (au moins 32 octets), MUST stocker uniquement son hash (par exemple SHA-256), et MUST envoyer le token en clair UNIQUEMENT dans le lien d'email et la confirmation immédiate au MANAGER.
- **FR-005**: Chaque invitation MUST avoir une date d'expiration. La durée par défaut MUST être de 7 jours après la création.
- **FR-006**: Le système MUST envoyer un email à l'adresse invitée contenant un lien absolu vers `${APP_URL}/accept-invitation/${token}`. Si la variable `RESEND_API_KEY` n'est pas définie, le système MUST logger le lien en console serveur ET MUST le retourner dans la réponse pour affichage côté MANAGER. Le flow MUST réussir dans les deux cas.
- **FR-007**: La page `/accept-invitation/[token]` MUST être publique (sans session). Elle MUST montrer l'email (lecture seule) et le nom (éditable), et MUST demander un mot de passe (avec confirmation) d'au moins 8 caractères.
- **FR-008**: À la soumission valide, le système MUST en une transaction : (a) vérifier que l'invitation existe par hash de token, est PENDING, et n'est pas expirée ; (b) re-vérifier qu'aucun User n'existe pour cet email ; (c) créer le `User` avec `companyId`, `role`, `name`, `passwordHash = bcrypt(password)`, `isActive = true` ; (d) marquer l'invitation `status = ACCEPTED` avec `acceptedAt = now`.
- **FR-009**: Après acceptation, le système MUST rediriger vers `/login` avec un message de succès et NE doit PAS connecter automatiquement l'utilisateur (étape suivante explicite, plus sûr).
- **FR-010**: Un MANAGER MUST pouvoir consulter les invitations PENDING et EXPIRED de sa company sur `/team`.
- **FR-011**: Un MANAGER MUST pouvoir renvoyer l'email d'une invitation PENDING (mêmes token, mêmes dates).
- **FR-012**: Un MANAGER MUST pouvoir révoquer (supprimer) une invitation PENDING ou EXPIRED.
- **FR-013**: Aucun MANAGER MUST pouvoir lister, renvoyer ou révoquer les invitations d'une autre company.
- **FR-014**: Le bouton existant « Inviter un employé » sur `/team` MUST être remplacé par le nouveau flow d'invitation email. L'ancien flow « mot de passe temporaire affiché en clair » MUST être retiré.
- **FR-015**: La création initiale d'une company (signup du premier MANAGER via `/signup`) MUST rester inchangée — le flow d'invitation s'applique seulement aux ajouts d'employés ou de MANAGERs supplémentaires.

### Key Entities *(include if feature involves data)*

- **Invitation** : Représente une invitation en attente ou expirée.
  - Attributs : entreprise propriétaire, email (normalisé), nom proposé, rôle proposé, hash du token, date d'expiration, statut (PENDING / ACCEPTED), date d'acceptation (nullable), identifiant du MANAGER inviteur (nullable, SET NULL en cascade).
  - Contraintes : unique partielle sur `(companyId, email)` pour les statuts PENDING ; le hash du token est unique en base ; relation FK avec `Company` (CASCADE) et `User` (SET NULL pour l'inviteur).
  - Le token en clair n'est JAMAIS stocké en base — seul son hash SHA-256.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un MANAGER peut envoyer une invitation en moins de 15 secondes (ouvrir le dialog, taper email + nom, valider).
- **SC-002**: Un invité peut créer son compte depuis le lien email en moins de 30 secondes (page → mot de passe → soumission → redirection vers /login).
- **SC-003**: 100 % des invitations expirent automatiquement après 7 jours sans intervention (vérifiable en avançant l'horloge ou en simulant `expiresAt` dans le passé).
- **SC-004**: 0 token en clair stocké en base, 0 token loggé hors de la console serveur en mode dev.
- **SC-005**: 0 fuite cross-tenant : un MANAGER de la company A ne peut jamais lister, renvoyer ou révoquer une invitation de la company B.
- **SC-006**: 100 % des invitations PENDING acceptées résultent en un `User` actif avec le bon rôle et la bonne company.
- **SC-007**: Le flow fonctionne entièrement en mode dev (sans `RESEND_API_KEY`) : l'invitation est créée, le lien est affiché au MANAGER, l'invité l'utilise et active son compte.

## Assumptions

- **Service email** : Resend est l'option principale (free tier généreux, API simple). En l'absence de `RESEND_API_KEY`, le système se rabat sur un log console + affichage du lien dans le toast du MANAGER — utile en dev et en cas de panne du service.
- **Durée d'expiration fixe** : 7 jours. Pas de personnalisation par company ni par invitation dans cette phase.
- **Pas de renvoi automatique** quand une invitation expire — le MANAGER doit en créer une nouvelle.
- **Pas de notification de bienvenue** envoyée à l'invité après l'acceptation. Hors-scope.
- **Pas d'invitation de plusieurs personnes en une fois** (batch invitation). Hors-scope.
- **Pas de personnalisation du contenu de l'email** (template fixe, en français, avec le nom de la company de l'inviteur). Hors-scope.
- **Stockage du nom** : pré-rempli depuis l'invitation au moment de l'acceptation, l'invité peut le modifier avant de soumettre.
- **L'auto-connexion après acceptation** n'est PAS faite dans cette phase. L'invité doit explicitement se connecter via `/login`. Réduit la surface d'attaque (un accès au lien email ne donne pas accès direct à la session).
- L'invariant tenant et la séparation MANAGER/EMPLOYEE déjà établis par les phases précédentes s'appliquent intégralement à cette feature, sans exception. L'acceptation est l'unique endroit où une mutation tenant-scopée se fait sans `TenantContext` préalable — protégée par la validité du token uniquement.

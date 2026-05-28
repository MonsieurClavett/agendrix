# Feature Specification: Employee Management

**Feature Branch**: `002-employee-management`

**Created**: 2026-05-28

**Status**: Draft

**Input**: User description: "Phase 1 — gestion des employés. Un MANAGER connecté peut inviter de nouveaux employés en saisissant leur email + nom + rôle (MANAGER ou EMPLOYEE), ce qui leur crée un compte avec un mot de passe temporaire affiché une seule fois après création (ou envoyé par email plus tard). Le MANAGER voit la liste de tous les employés de son entreprise dans une page dédiée, peut éditer leur nom et leur rôle, et peut désactiver un employé (soft delete : il ne peut plus se connecter, mais l'historique reste). Un employé désactivé qui essaie de se connecter reçoit le même message d'erreur générique qu'un mauvais mot de passe. Seuls les MANAGER peuvent accéder à ces fonctionnalités ; un EMPLOYEE qui tente d'y accéder est redirigé vers son dashboard avec un message. Toute opération continue de passer par la couche tenant — un MANAGER ne peut jamais voir/éditer un employé d'une autre entreprise."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Invite a new employee (Priority: P1)

A manager needs to onboard a new team member. They open the team-management page, click "Add an employee", fill in the person's email, display name, and role (MANAGER or EMPLOYEE), and submit. The system creates the account, generates a temporary password, and displays that temporary password to the manager **exactly once** — the manager copies it and communicates it to the new team member out of band (Slack, in person, etc.). The new employee can then sign in immediately using their email and that temporary password.

**Why this priority**: Without inviting anyone, the manager is alone in their company. Every other team-management capability (list, edit, deactivate) becomes meaningful only after at least one invite has been made. This is the entry point of the entire phase.

**Independent Test**: A signed-in manager opens the team-management page, submits the invite form for a new email, sees a temporary password displayed once, signs out, then signs in as the new user with that temporary password and lands on the dashboard.

**Acceptance Scenarios**:

1. **Given** a signed-in MANAGER, **When** they submit the invite form with email "bob@acme.example", name "Bob", role EMPLOYEE, **Then** the system creates a User with those values attached to the manager's company, generates a temporary password, and displays it once in the response (Bob does not exist before; Bob exists after).
2. **Given** the same MANAGER, **When** they submit the invite form using an email that is already registered (in any company), **Then** the system rejects the invite with a user-facing "email already in use" message and creates no record.
3. **Given** a MANAGER, **When** they submit the invite form with a malformed email, an empty name, or no role selected, **Then** the system rejects the submission with a field-level validation message and creates no record.
4. **Given** a freshly invited employee, **When** they sign in with their email and the temporary password the manager gave them, **Then** they are signed in and reach the dashboard.

---

### User Story 2 - View and edit the team (Priority: P2)

A manager needs to keep their team roster accurate: promote an employee to manager, fix a typo in someone's name, demote a manager back to employee, etc. They open the team-management page, see the list of all people in their company (with name, email, role, status), select one, edit their display name or role, and save.

**Why this priority**: After invites exist (P1), the manager needs to maintain them. P2 because changing a name or role is non-urgent compared to "we cannot add anyone at all".

**Independent Test**: With at least two users in the company (manager + one invited employee), the manager opens the team page, edits the employee's display name from "Bob" to "Robert", saves, refreshes, and verifies the new name is shown. Then the manager changes that user's role from EMPLOYEE to MANAGER, saves, and verifies the role badge updates.

**Acceptance Scenarios**:

1. **Given** a MANAGER whose company has users {Alice (MANAGER, self), Bob (EMPLOYEE)}, **When** they open the team-management page, **Then** the page lists exactly {Alice, Bob} with name, email, role, and active/inactive status visible for each.
2. **Given** a MANAGER editing Bob, **When** they change his name to "Robert" and save, **Then** the system persists the new name and subsequent views of the team page show "Robert".
3. **Given** a MANAGER editing Bob, **When** they change his role from EMPLOYEE to MANAGER and save, **Then** the system persists the new role and on Bob's next sign-in he gains access to the team-management page himself.
4. **Given** a MANAGER who is the **only** active MANAGER of their company, **When** they attempt to demote themselves to EMPLOYEE, **Then** the system rejects the change with a message stating the company must always have at least one active MANAGER, and Alice's role remains MANAGER.

---

### User Story 3 - Deactivate (and reactivate) an employee (Priority: P3)

When a team member leaves the company or temporarily steps away, the manager needs to revoke their access while keeping the historical record (their past scheduled shifts, past time-off requests in future phases). The manager opens the team page, clicks "Deactivate" on the person's row, confirms, and the user is marked inactive. From that moment forward, that user cannot sign in. The user's row still appears in the team list with a "deactivated" badge, and the manager can reactivate them later if circumstances change.

**Why this priority**: Important for cleanliness and security, but lower priority than invites and edits — you can run a small team without ever needing to deactivate anyone, especially early.

**Independent Test**: With a company containing {Alice (MANAGER), Bob (EMPLOYEE)}, the manager deactivates Bob. The team page still shows Bob with a "deactivated" badge. Bob then attempts to sign in with his correct password and is rejected with the same generic "invalid credentials" message as a wrong password. The manager reactivates Bob; Bob can sign in again.

**Acceptance Scenarios**:

1. **Given** a MANAGER and an active EMPLOYEE Bob in the same company, **When** the MANAGER deactivates Bob, **Then** Bob's row remains in the team list (now flagged "deactivated") and Bob is no longer able to sign in.
2. **Given** a deactivated user, **When** they submit the login form with their correct email and password, **Then** the system returns the same uniform "invalid credentials" message used for wrong-password and no-such-email — no indication that the account exists but is disabled (no enumeration via login response).
3. **Given** the **only** active MANAGER of a company, **When** they attempt to deactivate their own account, **Then** the system rejects the action with a message stating they cannot deactivate themselves (and there must always be at least one active MANAGER).
4. **Given** a deactivated user, **When** the MANAGER clicks "Reactivate" on their row, **Then** the user becomes active and is able to sign in again with their existing password.

---

### Edge Cases

- **Manager invites someone using their own email**: rejected as duplicate (their own account exists).
- **Two managers of the same company simultaneously invite the same new email**: at most one invite succeeds; the loser receives the same "email already in use" message.
- **Manager submits the invite form with no role selected**: rejected with a validation message; no record created.
- **Manager closes the browser before reading the temporary password**: the password is lost. They MUST delete and re-invite (or trigger a password-reset in a future phase). The system MUST NOT offer a "show me that password again" path.
- **EMPLOYEE navigates directly to the team-management URL** (bookmark, manual address-bar entry, deep link from an email): redirected to their dashboard with a one-time message such as "Vous n'avez pas accès à cette page." No 500 error, no blank page.
- **MANAGER edits another user simultaneously with that user editing themselves** (theoretical, since employees can't edit their own profile in Phase 1): not applicable until self-edit exists; out of scope.
- **MANAGER attempts to deactivate the only active MANAGER (themselves OR another last-remaining manager)**: rejected with a message about the company invariant.
- **MANAGER attempts to delete (hard) a user**: not supported in Phase 1; only deactivation exists. Hard delete would lose historical data and is intentionally out of scope.
- **Deactivated user has an active session at the moment of deactivation**: their current session continues until natural expiry or browser close, but they cannot sign in again afterward (Phase 1 does not include forced session revocation; that comes when the schedule feature needs hard cut-off).

## Requirements *(mandatory)*

### Functional Requirements

**Team-management access**

- **FR-001**: System MUST provide a dedicated team-management page accessible only to users whose role is MANAGER.
- **FR-002**: System MUST redirect any EMPLOYEE-role user who attempts to navigate to the team-management page to their dashboard, displaying a one-time message indicating they lack access.
- **FR-003**: System MUST reject any Server Action invoked by an EMPLOYEE that performs a team-management operation (invite, edit, deactivate, reactivate) with an authorization error and create/modify no records.

**Invitation**

- **FR-004**: System MUST allow a MANAGER to submit an invite form requesting at minimum: email, display name, role (MANAGER or EMPLOYEE).
- **FR-005**: On successful invite submit, system MUST create exactly one User attached to the inviting manager's company, with the requested email, name, role, status=active, and a freshly generated temporary password (stored as a hash).
- **FR-006**: System MUST display the plaintext temporary password to the inviting MANAGER exactly once in the response that confirms the creation; no UI path or stored data MUST allow retrieving the plaintext temporary password again.
- **FR-007**: System MUST reject invite submissions whose email is already registered (in any company) with a user-facing "email already in use" message; no record MUST be created.
- **FR-008**: System MUST reject invite submissions with a malformed email or an empty display name with a field-level validation message; no record MUST be created.

**Listing and editing**

- **FR-009**: System MUST display, on the team-management page, the full list of users (active AND deactivated) belonging to the requesting MANAGER's company — and ONLY those users — showing at minimum each user's name, email, role, and active/deactivated status.
- **FR-010**: System MUST allow a MANAGER to edit any user in their company's display name and role.
- **FR-011**: System MUST persist edits and reflect them on the next render of the team-management page.

**Deactivation and reactivation**

- **FR-012**: System MUST allow a MANAGER to deactivate any active user in their company; deactivation MUST NOT delete the user row (soft delete only).
- **FR-013**: System MUST allow a MANAGER to reactivate any previously deactivated user in their company.
- **FR-014**: System MUST reject login attempts for deactivated users with the SAME uniform "invalid credentials" message used for wrong-password and no-such-email cases (no account-enumeration via the login response).

**Last-MANAGER invariant**

- **FR-015**: System MUST reject any operation that would leave the requesting MANAGER's company with zero active MANAGER users. Specifically: deactivating the last active MANAGER, OR demoting the last active MANAGER to EMPLOYEE. The operation MUST be rejected with a user-facing message stating the invariant, and no records MUST be modified.

**Tenant isolation (carry-over from Phase 0)**

- **FR-016**: All team-management reads and writes MUST be scoped to the MANAGER's companyId derived from the verified session; no team-management operation MUST be able to read or modify users belonging to any other company under any circumstances.

### Key Entities

- **User** (extended from Phase 0): Same identity as before. Gains an **active status** (boolean — active or deactivated). Deactivation does NOT delete the row; it sets the status to deactivated. The user's role and display name are editable by a MANAGER of the same company. The user's email and companyId remain immutable in Phase 1.
- **Temporary Password** (transient — not a stored entity): A one-time plaintext value displayed only at the moment of user creation. Only its hash is persisted on the User. No table or audit log records the plaintext.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A MANAGER can invite a new employee end-to-end (open team page, submit form, copy displayed temporary password) in under 60 seconds median, on a typical broadband desktop browser.
- **SC-002**: In adversarial testing, 100% of attempts by an EMPLOYEE-role user to reach the team-management page (via direct URL, bookmark, or programmatic request) result in a redirect to the dashboard or an authorization-denied response — zero successful loads of the team page.
- **SC-003**: 100% of login attempts by deactivated users fail and return the EXACT SAME error message as wrong-password / no-such-email — no measurable difference in response content or timing that could expose account-deactivation status.
- **SC-004**: The "company always has ≥1 active MANAGER" invariant holds across the full test suite: no sequence of MANAGER operations is able to leave a company with zero active managers (target: zero invariant violations across all team-management tests).
- **SC-005**: 100% of team-management reads return only users belonging to the requesting MANAGER's company; zero cross-tenant leaks across the full adversarial test corpus.
- **SC-006**: The plaintext temporary password is displayed exactly once per invitation. Across the test suite, zero re-retrievals of any previously generated temporary password are observable via any UI path, Server Action, or stored field.

## Assumptions

- **Email-based invitations are out of scope for Phase 1.** The MANAGER receives the temporary password in-app and communicates it to the invitee out of band (Slack, in person, etc.). Sending invitation emails is a later phase.
- **Password reset / "set your own password" flow is out of scope.** Once the invitee signs in with the temporary password, they continue using it until a password-reset feature exists. The expected behaviour is the user keeps the temporary password, which is acceptable for the MVP given the team is small and the temporary password is generated with sufficient entropy.
- **Reactivation is in scope** even though the original description only mentioned deactivation. The deactivate primitive naturally implies an inverse; including it now costs essentially nothing extra and avoids leaving the manager stuck with no recovery path for accidental deactivations.
- **Hard deletion is out of scope.** Phase 1 supports only soft deletion (deactivate). Hard deletion is intentionally deferred because it destroys historical context that future phases (schedules, time-off requests, payroll exports) will need.
- **Self-edit by employees is out of scope** for Phase 1. Employees cannot change their own display name or password from inside the application. The MANAGER edits names; the password remains the one issued at invite time (until a future password-reset feature).
- **Forced session revocation on deactivation is out of scope.** A deactivated user keeps any currently active session until natural expiry; they only lose the ability to sign in again. A "kick all sessions" feature is deferred until a later phase needs it (e.g., when schedule data starts moving money).
- **Email remains globally unique across the entire system** (carry-over from Phase 0). Inviting an email that already exists in another company is rejected with the same uniform message as inviting a duplicate within the same company.
- **No bulk-invite or CSV import in Phase 1.** Invitations are one at a time.
- **No audit log of "who invited whom / who deactivated whom" in Phase 1.** A small team can rely on tribal memory; an audit trail is added when the team or compliance posture warrants it.

## Dependencies

- Phase 0 (Multi-Tenant Foundations) MUST be in place and operational: `Company`, `User`, the tenant-context helper, the central repository layer, the authentication flow, and the protected `/dashboard` route. Phase 1 extends `User` with an active-status field and adds a new MANAGER-only route group; everything else builds on Phase 0's primitives.
- A working hosted relational database with credentials available to the application's runtime environment (carry-over).
- A modern browser supporting cookies for session continuity (carry-over).

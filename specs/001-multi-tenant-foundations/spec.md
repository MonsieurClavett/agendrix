# Feature Specification: Multi-Tenant Foundations

**Feature Branch**: `001-multi-tenant-foundations`

**Created**: 2026-05-28

**Status**: Draft

**Input**: User description: "Phase 0 — fondations multi-tenant. Une visiteuse peut créer un compte entreprise (formulaire avec nom de société, son nom, email, mot de passe) ; cette action crée la Company et la première User MANAGER en une seule opération atomique. Un compte existant peut se connecter via email + mot de passe. Une fois connecté, l'utilisateur accède à un tableau de bord protégé qui affiche le nom de son entreprise, son rôle, et la liste des employés de sa Company uniquement. Toute tentative d'accès au dashboard sans session redirige vers /login. Une déconnexion termine la session et redirige vers /login. La couche d'accès aux données impose à tout query tenant-scopé un filtre companyId provenant de la session vérifiée — aucune route ou Server Action ne peut contourner ce filtre."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Found a new company (Priority: P1)

A prospective customer (the "founder") arrives on the public landing page wanting to start using the product for their business. They click "Create a company account", fill in their company name, their personal name, an email, and a password. On submission, the system creates their company and their personal account (with the MANAGER role) together as a single inseparable operation, signs them in, and drops them on the company dashboard.

**Why this priority**: Without this story, no one can ever get into the product. It is the entire entry point. It also exercises the most critical invariant of the product (a company and its founding manager always come into existence together — partial states are forbidden).

**Independent Test**: A visitor with no prior account opens the app, completes the signup form with valid information, and arrives on a dashboard that names their newly created company. Delivers value: a usable company workspace exists.

**Acceptance Scenarios**:

1. **Given** a visitor on the landing page, **When** they submit the signup form with company name "Acme", their name "Jane", email "jane@acme.example", password meeting the minimum policy, **Then** the system creates Company "Acme" and User "Jane" with role MANAGER, signs Jane in, and shows the dashboard for "Acme".
2. **Given** an email that is already registered, **When** the visitor submits signup with that email, **Then** the system rejects the submission with a clear message and creates no Company and no User.
3. **Given** the signup operation fails part-way through (e.g., a transient database error after Company is provisionally created), **When** the failure occurs, **Then** the system leaves no orphan Company without a founding MANAGER and no User without a Company.
4. **Given** a visitor submits a password that does not meet the minimum policy, **When** they submit, **Then** the system rejects the submission with a user-facing error explaining the requirement, and creates no records.

---

### User Story 2 - Sign in to an existing account (Priority: P2)

A returning user (founder or, in later phases, an employee) needs to access their company workspace. They visit the login screen, enter their email and password, and on success land on the dashboard. They can also sign out from the dashboard to end their session.

**Why this priority**: Without this story, users can sign up once but can never return — the product becomes a one-time experience. P2 because it logically depends on at least one account existing (created via P1 or seeded for test).

**Independent Test**: With one pre-existing valid account on the system, an unauthenticated user opens the login screen, supplies correct credentials, and arrives on the dashboard. Then they activate sign-out and are returned to the login screen with no active session.

**Acceptance Scenarios**:

1. **Given** an existing user with known credentials, **When** they submit the login form with the correct email and password, **Then** the system establishes an authenticated session and shows the dashboard.
2. **Given** an existing user, **When** they submit the login form with the correct email but the wrong password, **Then** the system rejects the attempt with a generic "invalid credentials" message that does not reveal whether the email exists.
3. **Given** an email that is not registered, **When** any password is submitted, **Then** the system returns the same generic "invalid credentials" message (no account-enumeration via response).
4. **Given** an authenticated user on the dashboard, **When** they activate the sign-out action, **Then** the system ends the session and returns them to the login screen; subsequent attempts to reach the dashboard require fresh authentication.

---

### User Story 3 - View only my own company's data (Priority: P3)

An authenticated user opens the dashboard. They see the name of their company, their own role, and the list of users belonging to their company. Under no circumstance does the dashboard reveal any information about another company or its users. This story is what demonstrates the tenant isolation guarantee in action — the foundation everything else in the product is built on.

**Why this priority**: This is the visible proof of the multi-tenant safety promise. It can be implemented after P1 and P2 because the underlying tenant-scoping infrastructure is shared groundwork that the team builds once and re-uses everywhere.

**Independent Test**: With two pre-existing companies, each containing distinct users, a member of Company A logs in and verifies that the dashboard shows only Company A's users — not Company B's. Repeated for a member of Company B in the opposite direction.

**Acceptance Scenarios**:

1. **Given** a user belongs to Company A, **When** they view their dashboard, **Then** the page displays "Company A" as the company name, their own role, and exactly the set of users whose company is A.
2. **Given** Company A has users {Alice, Bob} and Company B has users {Carol, Dan}, **When** Alice views her dashboard, **Then** the user list shows {Alice, Bob} and never includes Carol or Dan, regardless of any URL manipulation or request crafting Alice could attempt from the browser.
3. **Given** an authenticated user, **When** any code path in the application attempts to read tenant-scoped data without specifying a company scope derived from the verified session, **Then** the request fails — bypassing the tenant filter is structurally impossible, not merely discouraged.

---

### Edge Cases

- **Concurrent signups with the same email**: only one MUST succeed; the loser receives the same "email already registered" message as a sequential duplicate.
- **Direct URL access to a protected page without a session** (e.g., user bookmarks the dashboard and visits while signed out): system redirects to the login screen and, after successful login, returns the user to the originally requested page.
- **Tampered or expired session token**: treated as no session; user is redirected to login.
- **Empty or whitespace-only company name or user name**: rejected at signup with a validation error.
- **Malformed email at signup or login**: rejected before any account lookup.
- **Server-side failure mid-signup**: no partial Company-without-MANAGER state is ever observable to the user or to any other request.
- **User attempts to enumerate accounts via login error messages**: login responses for "wrong password on valid email" and "no such email" are indistinguishable from outside the system.

## Requirements *(mandatory)*

### Functional Requirements

**Account creation**

- **FR-001**: System MUST present a signup form requesting at minimum: company name, user's display name, email, password.
- **FR-002**: On valid signup, system MUST create exactly one Company and exactly one User (with role MANAGER) in a single atomic operation; on any failure neither MUST be persisted.
- **FR-003**: System MUST reject signup with a clear user-facing message when the supplied email is already registered, and MUST create no records in that case.
- **FR-004**: System MUST hash passwords using a modern adaptive password hashing function before storage; raw passwords MUST never be persisted.
- **FR-005**: On successful signup, system MUST establish an authenticated session for the newly created user and redirect them to the dashboard.
- **FR-006**: System MUST reject passwords shorter than 8 characters at signup with a user-facing message explaining the rule.
- **FR-007**: System MUST reject signup submissions where the email is not a syntactically valid email address.

**Authentication & session**

- **FR-008**: System MUST present a login form requesting email and password.
- **FR-009**: System MUST authenticate the user when supplied credentials match a stored account and reject otherwise.
- **FR-010**: System MUST return a uniform "invalid credentials" response for both "wrong password on existing email" and "no such email" cases — no account-enumeration via responses.
- **FR-011**: On successful login, system MUST establish an authenticated session and redirect the user to the dashboard.
- **FR-012**: System MUST provide a sign-out action that terminates the active session and returns the user to the login screen.
- **FR-013**: System MUST treat tampered, missing, or expired session tokens as no session.

**Authorization & access control**

- **FR-014**: System MUST redirect any unauthenticated request for a protected page to the login screen, preserving the originally requested URL so the user is returned there after successful login.
- **FR-015**: The dashboard MUST display the company name of the currently signed-in user and the user's role.
- **FR-016**: The dashboard MUST list users belonging to the currently signed-in user's company, and ONLY those users.

**Tenant isolation (the load-bearing invariant)**

- **FR-017**: All reads and writes to tenant-scoped data MUST be scoped to the company identified by the verified session; the company identifier MUST NOT be sourced from any request input outside the verified session envelope.
- **FR-018**: Application code paths that access tenant-scoped data MUST flow through a single, central scoping mechanism such that bypassing the tenant filter is structurally prevented (not merely conventional).
- **FR-019**: Under adversarial testing in which one company's user attempts via URL manipulation, request crafting, or any other client-side action to retrieve another company's data, the system MUST return no data belonging to the other company.

### Key Entities

- **Company**: Represents a customer organization. Carries a name, a creation timestamp, and is the owner of zero or more Users. The Company is the unit of tenant isolation throughout the application.
- **User**: Represents an individual with login credentials. Carries an email (unique across the entire system), a display name, a password hash, and a role (MANAGER or EMPLOYEE). Each User belongs to exactly one Company.
- **Session**: Represents proof that a User has authenticated. Carries the User's identity, role, and the Company they belong to. The Session is the authoritative source of "who is asking" and "for which company" on every protected request.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new visitor can complete the signup flow and arrive on a working dashboard in under 90 seconds (median, measured on a typical broadband connection on a modern desktop browser).
- **SC-002**: A returning user can sign in and arrive on the dashboard in under 30 seconds (median, same conditions).
- **SC-003**: In adversarial testing with at least two seeded companies each holding distinct users, 100% of authenticated requests return data tagged exclusively to the requester's company; zero leak events across the test corpus.
- **SC-004**: 99% of unauthenticated requests to a protected page are redirected to the login screen in under 500 milliseconds.
- **SC-005**: Login responses for "wrong password on registered email" and "no such email" are byte-for-byte indistinguishable, preventing account enumeration via response inspection.
- **SC-006**: No partial-state record is ever observed in the system after a failed signup operation (target: zero orphan Companies, zero orphan Users across the full test suite).

## Assumptions

- Phase 0 targets desktop and mobile web browsers; native mobile apps are out of scope.
- The user interface is delivered in French; localization to additional languages is out of scope for Phase 0.
- Email verification at signup is out of scope for Phase 0 (a registered email is trusted on its face); a verification flow will be revisited in a later phase if compliance demands it.
- Password reset / "forgot password" flow is out of scope for Phase 0.
- Manager-initiated invitation of EMPLOYEE users is out of scope for Phase 0; therefore the dashboard's "users in my company" list in Phase 0 will, for any given company, contain exactly the founding MANAGER. The list is included now to prove the tenant-isolation mechanism end-to-end, not to display many rows.
- A single global namespace for email addresses is acceptable (an email maps to exactly one User across the whole system).
- Session persistence across browser restarts is acceptable (standard "stay signed in" behaviour); session expiration policy defaults to a reasonable industry-standard duration.
- The product is hosted as a single web application backed by a single shared database; tenant separation is logical (via the companyId column), not physical (no per-tenant database).
- Concurrent signups, while supported correctly, are not a heavy-traffic scenario in Phase 0; no special rate-limiting is in scope yet.

## Dependencies

- A working hosted relational database with credentials available to the application's runtime environment.
- A modern browser supporting cookies for session continuity.
- No external identity provider or third-party authentication service is required for Phase 0.

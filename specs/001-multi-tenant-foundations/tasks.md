---
description: "Task list for the Multi-Tenant Foundations feature"
---

# Tasks: Multi-Tenant Foundations

**Input**: Design documents from `/specs/001-multi-tenant-foundations/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: The Phase 0 spec did NOT request automated tests. Per Constitution III, testing posture is manual smoke (see `quickstart.md`). No test tasks are included below.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Setup, Foundational, and Polish phases have no `[Story]` label
- Include exact file paths in descriptions

## Path Conventions

Single Next.js project — paths are relative to the repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the Next.js app and install all dependencies.

- [X] T001 Scaffold a Next.js 16 app at the repository root with TypeScript + Tailwind v4 + ESLint + App Router + `src/` dir + `@/*` alias. Workaround: `create-next-app` rejects capital letters in folder names, so scaffold into a lowercase temp folder then move contents up; edit `package.json` to set `"name": "agendrix"`.
- [X] T002 [P] Install runtime dependencies: `npm install @prisma/client@^6 next-auth@beta bcryptjs zod`
- [X] T003 [P] Install Prisma CLI as dev dep: `npm install -D prisma@^6`
- [X] T004 [P] Install shadcn runtime deps: `npm install clsx tailwind-merge class-variance-authority lucide-react tw-animate-css @radix-ui/react-slot @radix-ui/react-label`
- [X] T005 [P] Create shadcn config file at `components.json` with new-york style, neutral base color, RSC enabled, css at `src/app/globals.css`, aliases `@/components`, `@/lib/utils`, `@/components/ui`
- [X] T006 [P] Create `src/lib/utils.ts` exporting the `cn()` helper (clsx + tailwind-merge)
- [X] T007 [P] Replace `src/app/globals.css` with the shadcn new-york theme tokens (oklch colors, radius vars, dark mode block, `@theme inline` mapping, `@layer base` resets)
- [X] T008 [P] Add `src/components/ui/button.tsx` (Slot + cva variants per shadcn new-york)
- [X] T009 [P] Add `src/components/ui/input.tsx`
- [X] T010 [P] Add `src/components/ui/label.tsx` (Radix Label primitive)
- [X] T011 [P] Add `src/components/ui/card.tsx` (Card + Header/Title/Description/Content/Footer)
- [X] T012 Update `.gitignore` to include `/src/generated`, `dev.log`, `.env*` (Spec Kit's git init may have created one; verify these entries exist)
- [X] T013 Create `.env.example` with placeholder `DATABASE_URL` and `AUTH_SECRET`; ensure real `.env` already exists with working values (do NOT commit `.env`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, auth wiring, and the central tenant layer. ALL user stories depend on this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Database & Prisma

- [X] T014 Write `prisma/schema.prisma` with `Company`, `User`, and `Role` enum per `data-model.md`. Generator block uses `provider = "prisma-client-js"` and `output = "../src/generated/prisma"`. Datasource is `postgresql` reading `env("DATABASE_URL")`.
- [X] T015 Run `npx prisma migrate dev --name init` to create the initial migration and apply it against the configured Neon database. Verify migration file at `prisma/migrations/<timestamp>_init/migration.sql`.
- [X] T016 [P] Create `src/lib/db.ts` exporting a `PrismaClient` singleton (with a `globalThis` cache so HMR does not leak connections). Import `PrismaClient` from `@/generated/prisma`.

### Auth.js v5 configuration

- [X] T017 Create `src/auth.ts` exporting `{ handlers, auth, signIn, signOut }` from `NextAuth({...})` with: `session.strategy: "jwt"`, `pages.signIn: "/login"`, Credentials provider (Zod-validated email+password, `bcryptjs.compare`), and `callbacks.jwt` + `callbacks.session` that carry `id`, `companyId`, `role`. Include `declare module "next-auth"` and `declare module "@auth/core/jwt"` augmentations inside this file (NOT a separate `.d.ts`).
- [X] T018 [P] Create `src/app/api/auth/[...nextauth]/route.ts` that re-exports `GET` and `POST` from `@/auth`.

### Tenant context layer (the load-bearing piece — Principle I)

- [X] T019 [P] Create `src/lib/session.ts` exporting `TenantContext` type and `requireTenantContext()` / `requireManagerContext()`. Both call `await auth()`; throw `"UNAUTHENTICATED"` / `"FORBIDDEN"` on failure; return `{ userId, companyId, role }` derived ONLY from `session.user.*`.
- [X] T020 [P] Create `src/lib/repositories/company.ts` exporting `getCurrentCompany(ctx: TenantContext)` that selects `{ id, name, createdAt }` from `db.company.findUniqueOrThrow({ where: { id: ctx.companyId } })`.
- [X] T021 [P] Create `src/lib/repositories/user.ts` exporting `listUsersInCompany(ctx)` (`db.user.findMany({ where: { companyId: ctx.companyId } })`) and `getCurrentUser(ctx)` (`db.user.findUniqueOrThrow({ where: { id: ctx.userId } })`). These are the ONLY functions allowed to call `db.user.*`.

### Route protection (Next 16 proxy)

- [X] T022 Create `src/proxy.ts` (the Next 16 rename of `middleware.ts`) wrapping `auth((req) => ...)` to redirect to `/login?callbackUrl=<original>` when `req.auth` is missing on any `/dashboard/:path*` match. Export `config.matcher = ["/dashboard/:path*"]`.

### Landing + root layout cleanup

- [X] T023 [P] Update `src/app/layout.tsx` metadata: `title: "Agendrix"`, `description: "Gestion d'horaires d'employés"`. Keep Geist fonts if present.
- [X] T024 [P] Replace `src/app/page.tsx` with a minimal landing: heading "Agendrix", links to `/signup` (primary Button) and `/login` (outline Button).

**Checkpoint**: Foundation ready — DB up, auth wired, tenant layer in place, proxy guarding `/dashboard`. User story implementation can begin in parallel.

---

## Phase 3: User Story 1 - Found a new company (Priority: P1) 🎯 MVP

**Goal**: A visitor can submit the signup form; the system creates `Company` + first `MANAGER` `User` atomically and lands them on the dashboard.

**Independent Test**: Open `/signup`, fill the form with valid data, submit, verify redirect to `/dashboard` and that the dashboard names the new company. See `quickstart.md` SC-001.

### Implementation for User Story 1

- [X] T025 [P] [US1] Create `src/actions/signup.ts` Server Action `signupAction(prev, formData)`. Zod schema validates `companyName ≥ 2`, `name ≥ 1`, `email .email()`, `password ≥ 8`. Check `db.user.findUnique({ where: { email } })` for duplicate; return `{ error: "Cet email est déjà utilisé." }` on conflict. Hash with `bcryptjs.hash(password, 10)`. Run `db.$transaction` containing `company.create({ data: { name } })` then `user.create({ data: { email, name, passwordHash, role: "MANAGER", companyId: company.id } })`. Then `await signIn("credentials", { email, password, redirect: false })` and `redirect("/dashboard")`.
- [X] T026 [P] [US1] Create `src/components/SignupForm.tsx` (`"use client"`): client form using React 19 `useActionState(signupAction, initial)`. Renders Label+Input pairs for `companyName`, `name`, `email`, `password`. Displays `state.error` and per-field `state.fieldErrors[*]`. Submit button shows "Création…" when `pending`.
- [X] T027 [US1] Create `src/app/(auth)/signup/page.tsx`: Server Component rendering a centered Card containing `<SignupForm />` and a link back to `/login`.
- [X] T028 [US1] Create `src/app/(dashboard)/layout.tsx`: async Server Component that `await requireTenantContext()` + `await getCurrentCompany(ctx)`, then renders a header showing the company name (so signup can finish on a working dashboard).
- [X] T029 [US1] Create `src/app/(dashboard)/dashboard/page.tsx`: minimal Server Component using `requireTenantContext()` that displays "Bienvenue dans {company.name}. Votre rôle : {ctx.role}." (US1 only needs the page to exist and render — US3 will enrich it).
- [ ] T030 [US1] Manual smoke per quickstart.md SC-001: sign up "Acme" + Jane, confirm landing on `/dashboard` with header "Acme" and role "MANAGER" displayed.

**Checkpoint**: US1 is fully functional. A new visitor can found a company and reach a working dashboard. This is the MVP.

---

## Phase 4: User Story 2 - Sign in to an existing account (Priority: P2)

**Goal**: An existing user can sign in with email + password and sign out from the dashboard.

**Independent Test**: With an account already created (via US1), open `/login`, enter correct credentials, verify redirect to `/dashboard`. Click "Se déconnecter", verify return to `/login`. See `quickstart.md` SC-002 + SC-005.

### Implementation for User Story 2

- [X] T031 [P] [US2] Create `src/actions/login.ts` Server Action `loginAction(prev, formData)`. Calls `signIn("credentials", { email, password, redirectTo: "/dashboard" })` inside try/catch. On `AuthError` (CredentialsSignin), return `{ error: "Email ou mot de passe invalide." }` — same message for wrong-password and no-such-email (enforces FR-010 / SC-005). Re-throw on any non-`AuthError`.
- [X] T032 [P] [US2] Create `src/actions/logout.ts` Server Action `logoutAction()` calling `await signOut({ redirectTo: "/login" })`.
- [X] T033 [P] [US2] Create `src/components/LoginForm.tsx` (`"use client"`): React 19 `useActionState(loginAction, initial)` rendering Label+Input for `email` + `password`, surface `state.error`, submit button "Se connecter" / "Connexion…" when pending. Email field gets `autoFocus`.
- [X] T034 [P] [US2] Create `src/components/LogoutButton.tsx`: a Server Component wrapping `<form action={logoutAction}>` with an outline Button "Se déconnecter".
- [X] T035 [US2] Create `src/app/(auth)/login/page.tsx`: Server Component rendering a Card with `<LoginForm />` and a link to `/signup`.
- [X] T036 [US2] Update `src/app/(dashboard)/layout.tsx` to include `<LogoutButton />` in the header next to the company name.
- [ ] T037 [US2] Manual smoke per quickstart.md SC-002: sign out, sign back in with the same credentials, verify dashboard reappears. Also SC-005: try the form with wrong password and with a non-existent email; verify the exact same error message appears in both cases.

**Checkpoint**: US1 + US2 work. Full signup → logout → login → dashboard loop is functional.

---

## Phase 5: User Story 3 - View only my own company's data (Priority: P3)

**Goal**: The dashboard shows the company name, current user's role, AND the list of users belonging to the current user's company — and ONLY those users. This is the visible proof of the tenant isolation invariant.

**Independent Test**: Create two companies (Acme + Globex) each with their own founding manager. Log in as Acme's manager and verify the user list contains only Acme members. Log in as Globex's manager and verify the same in reverse. See `quickstart.md` SC-003.

### Implementation for User Story 3

- [X] T038 [US3] Update `src/app/(dashboard)/dashboard/page.tsx` to: call `requireTenantContext()`, then in parallel fetch `getCurrentCompany(ctx)` + `listUsersInCompany(ctx)`. Render: page heading, welcome line with company name and role, then a Card titled "Employés ({users.length})" containing the user list (name + email + role badge per row). Add a brief comment naming Principle I as the security guarantee.
- [ ] T039 [US3] Manual smoke per quickstart.md SC-003: sign up a second company "Globex". Verify Globex's dashboard shows only Globex's user (not Acme's). Sign back in as Acme — verify Acme's dashboard shows only Acme's user. Adversarial check: attempt no URL trickery is possible because `companyId` comes from the verified JWT session only — confirm by code inspection of `src/lib/session.ts`.

**Checkpoint**: All three user stories are independently functional. The tenant isolation invariant (Constitution Principle I) is demonstrably enforced.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the whole increment and prepare for commit.

- [X] T040 [P] Run `npx tsc --noEmit` and confirm zero TypeScript errors across the project.
- [X] T041 [P] Run `npm run dev`. Visit `/`, `/signup`, `/login`, `/dashboard` in a browser; verify no runtime errors in the dev console and no warnings beyond the expected Next 16 deprecation notices.
- [ ] T042 Walk through every smoke step in `quickstart.md` (SC-001 → SC-006) end-to-end with the dev server live. Record any deviations as new tasks.
- [X] T043 Stage and commit the implementation under a single SDD commit (suggested: `[Spec Kit] Implementation progress`). Push to `origin/001-multi-tenant-foundations`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — **BLOCKS all user stories**.
- **User Story 1 / 2 / 3 (Phase 3+)**: All depend on Foundational. Once Foundational is done, US1 → US2 → US3 in priority order is the cleanest sequential path for a solo dev.
- **Polish (Phase 6)**: Depends on whichever user stories you want shipped.

### Within Each User Story

- Server Actions and components marked [P] (different files) can be written in parallel.
- The page file usually depends on its action(s) and component(s) being available — finish those before wiring the page.
- Manual smoke tasks (e.g., T030, T037, T039) close out each story.

### Parallel Opportunities

- All Setup tasks except T001 are [P] (T001 must come first because everything else writes into the scaffolded tree).
- Within Foundational: T016, T018, T019, T020, T021, T023, T024 are [P] — different files, no shared mutation.
- Within US1: T025 and T026 are [P]. T027/T028/T029 depend on them.
- Within US2: T031, T032, T033, T034 are [P]. T035/T036 depend on them.
- US3 has only one implementation task (T038), then the smoke.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational — DB, auth, tenant layer, proxy, landing).
3. Complete Phase 3 (User Story 1 — signup → dashboard).
4. **STOP and VALIDATE**: a visitor can found a company and see a working dashboard with their company name.
5. Deploy / demo if ready. This is a defensible MVP.

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready.
2. + Phase 3 (US1) → MVP shipped.
3. + Phase 4 (US2) → users can come back.
4. + Phase 5 (US3) → tenant isolation visibly demonstrated.
5. + Phase 6 (Polish) → typecheck + smoke + commit.

### Solo Developer Strategy (this project)

Sequential is the right shape. Inside each story, batch the [P] tasks into single edit sessions (write all Server Actions in one go, all components in one go, then wire the pages). Do not skip the manual smoke tasks — they are the only test coverage Phase 0 has.

---

## Notes

- `[P]` = different files, no dependency on incomplete tasks.
- `[Story]` label maps tasks to a user story for traceability.
- Each user story should be independently completable and testable.
- Commit after each completed story (Spec Kit's `after_implement` optional hook offers to do this for you).
- The Phase 0 spec did NOT request automated tests; manual smoke through `quickstart.md` is the testing posture (per Constitution III).
- The tenant isolation guarantee (Principle I) is structural: it lives in the fact that every page/action goes through `requireTenantContext()` and every read goes through a repository function. Reviewers can verify it with `grep` for `db.user.` outside `src/lib/repositories/` returning zero hits.

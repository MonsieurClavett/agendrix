---
description: "Task list for the Employee Management feature (Phase 1)"
---

# Tasks: Employee Management

**Input**: Design documents from `/specs/002-employee-management/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md. Phase 0 (`001-multi-tenant-foundations`) MUST be in place and merged.

**Tests**: The Phase 1 spec did NOT request automated tests. Per Constitution III, testing posture remains manual smoke (see `quickstart.md`). No test tasks are included below.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Setup, Foundational, and Polish phases have no `[Story]` label
- Include exact file paths in descriptions

## Path Conventions

Single Next.js project — paths relative to the repository root (`Agendrix/`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the only new dependency Phase 1 needs (Radix dialog primitive).

- [ ] T001 [P] Install Radix dialog dep: `npm install @radix-ui/react-dialog`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema migration + auth-side rejection of deactivated users + repository extensions + role-based proxy update. ALL user stories depend on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Database

- [ ] T002 Update `prisma/schema.prisma`: add `isActive Boolean @default(true)` to the `User` model.
- [ ] T003 Generate migration: `npx prisma migrate dev --name add_user_is_active`. Verify the SQL adds the column with `DEFAULT true NOT NULL` so existing Phase 0 rows backfill as active.

### Auth + proxy updates

- [ ] T004 [P] Edit `src/auth.ts` `Credentials.authorize()`: after the `bcrypt.compare` success branch, add `if (!user.isActive) return null;`. This routes deactivated users through the existing uniform "invalid credentials" error path (FR-014, SC-003).
- [ ] T005 [P] Edit `src/proxy.ts`: extend `PROTECTED_PREFIXES` and `config.matcher` to also cover `/team/:path*`.

### Repository extensions (the load-bearing layer — Principle I)

- [ ] T006 [P] Extend `src/lib/repositories/user.ts` with `listAllUsersInCompany(ctx)` returning every user (active + deactivated) of `ctx.companyId`, selecting `{ id, email, name, role, isActive, createdAt }`, ordered by `createdAt` asc.
- [ ] T007 [P] Add `createInvitedUser(ctx, { email, name, role, passwordHash })` to `src/lib/repositories/user.ts`. Inserts a `User` with `companyId: ctx.companyId, isActive: true`. Let Prisma surface the unique-email constraint error; callers map it.
- [ ] T008 Add `updateUserById(ctx, userId, { name, role })` to `src/lib/repositories/user.ts`. Wrap in `db.$transaction`: (a) load the target user scoped by `id AND companyId` — if not found throw `NOT_FOUND`; (b) if `role` is being changed from MANAGER to EMPLOYEE, count other active MANAGERs in the same company (`WHERE companyId = ctx.companyId AND id != userId AND role = "MANAGER" AND isActive = true`) — if 0 throw `LAST_MANAGER`; (c) perform the update.
- [ ] T009 Add `setUserActiveStatus(ctx, userId, isActive)` to `src/lib/repositories/user.ts`. Wrap in `db.$transaction`: (a) load target scoped by `id AND companyId` — if not found throw `NOT_FOUND`; (b) if going to `isActive=false` AND target is a MANAGER, count other active MANAGERs — if 0 throw `LAST_MANAGER`; (c) update `isActive`.

### Temp password helper

- [ ] T010 [P] Create `src/lib/temp-password.ts` exporting `generateTempPassword()` that returns a 16-character base32 (Crockford alphabet — no 0/O/I/L) string derived from `crypto.randomBytes(10)`. Pure function, no IO.

### shadcn components added in this phase

- [ ] T011 [P] Add `src/components/ui/dialog.tsx` (shadcn new-york Dialog wrapping `@radix-ui/react-dialog` — Root, Trigger, Content, Header, Title, Description, Footer, Close).
- [ ] T012 [P] Add `src/components/ui/badge.tsx` (shadcn new-york Badge — cva variants: `default`, `secondary`, `destructive`, `outline`).
- [ ] T013 [P] Add `src/components/ui/table.tsx` (shadcn new-york Table — Table, Header, Body, Row, Head, Cell, Caption — styled HTML primitives).

**Checkpoint**: schema migrated, auth rejects deactivated users, proxy covers `/team`, repository has the 4 new functions, temp password generator ready, base UI components in place. User story work can begin.

---

## Phase 3: User Story 1 - Invite a new employee (Priority: P1) 🎯 MVP

**Goal**: A MANAGER can submit the invite form on `/team` and receive a temp password displayed once.

**Independent Test**: Sign in as a MANAGER, open `/team`, submit invite form for `bob@acme.example`, copy displayed temp password, sign out, sign in as Bob with the temp password, land on dashboard. See `quickstart.md` SC-001.

### Implementation for User Story 1

- [ ] T014 [P] [US1] Create `src/actions/team/invite.ts` `inviteEmployeeAction(prev, formData)`. Begin with `await requireManagerContext()`. Zod schema: `email .email()`, `name .min(1)`, `role z.enum(["MANAGER", "EMPLOYEE"])`. Lookup existing user by email; if found return `{ error: "Cet email est déjà utilisé." }`. Call `generateTempPassword()`. `await bcrypt.hash(temp, 10)`. `await createInvitedUser(ctx, { email, name, role, passwordHash })`. Catch Prisma unique-violation as the same "email already in use" message (race with concurrent invite). Return `{ success: { email, tempPassword } }`.
- [ ] T015 [P] [US1] Create `src/app/(dashboard)/team/_components/InviteEmployeeDialog.tsx` (`"use client"`): Dialog wrapping a form using `useActionState(inviteEmployeeAction, initial)`. Fields: email, name, role (Select with MANAGER/EMPLOYEE). On `state.success`, replace the form with a one-time card showing the temp password + a "Copier" button (uses `navigator.clipboard.writeText`) and a "Fermer" button that closes the dialog. Dialog open state held in local React state — closing discards the success card.
- [ ] T016 [US1] Create `src/app/(dashboard)/team/layout.tsx`: async Server Component. Use `requireTenantContext()` and if `ctx.role !== "MANAGER"` call `redirect("/dashboard?error=forbidden")`. Otherwise render `{children}` inside a wrapper.
- [ ] T017 [US1] Create `src/app/(dashboard)/team/page.tsx`: async Server Component. Re-check `requireManagerContext()` (the layout already redirects EMPLOYEEs, but layered defense). Fetch users via `listAllUsersInCompany(ctx)`. Render heading "Équipe", an `InviteEmployeeDialog` trigger button, and `<TeamTable users={users} currentUserId={ctx.userId} />`.
- [ ] T018 [P] [US1] Create `src/app/(dashboard)/team/_components/TeamTable.tsx`: client component receiving `users` + `currentUserId`. Renders a `Table` with columns: Nom, Email, Rôle, Statut, Actions. Each row shows name (fallback "(sans nom)"), email, role badge, status badge (`Actif` / `Désactivé`). Actions column placeholder for now — will be filled in US2/US3. Highlight the row matching `currentUserId` with a "(vous)" suffix on the name.
- [ ] T019 [US1] Update `src/app/(dashboard)/layout.tsx`: in the header next to the company name, render a nav link to `/team` ONLY when `ctx.role === "MANAGER"`. Use a simple `Link` styled as a Button outline.
- [ ] T020 [US1] Update `src/app/(dashboard)/dashboard/page.tsx`: read `searchParams.error` (it's an async server prop in Next 16; await `props.searchParams`). If equal to `"forbidden"`, render a one-time banner above the rest of the page: "Vous n'avez pas accès à la gestion d'équipe." (a `<div>` with destructive styling).
- [ ] T021 [US1] Manual smoke per quickstart.md SC-001: invite `bob@acme.example` / "Bob" / EMPLOYEE. Verify temp password card shows. Copy it. Sign out and sign in as Bob — land on `/dashboard`. Header shows "Acme" + role badge "EMPLOYEE". Header has NO `/team` link.

**Checkpoint**: US1 fully functional. A MANAGER can invite a new employee end-to-end. This is the Phase 1 MVP.

---

## Phase 4: User Story 2 - View and edit the team (Priority: P2)

**Goal**: A MANAGER can edit any team member's name and role from `/team`.

**Independent Test**: With at least two users in the company, the MANAGER opens `/team`, clicks edit on a row, renames the user and changes their role, saves, and sees the change reflected in the table. Last-MANAGER demotion is rejected. See `quickstart.md` US2 acceptance scenarios + SC-004.

### Implementation for User Story 2

- [ ] T022 [P] [US2] Create `src/actions/team/update.ts` `updateEmployeeAction(prev, formData)`. Begin with `await requireManagerContext()`. Zod schema: `userId .min(1)`, `name .min(1)`, `role z.enum(["MANAGER", "EMPLOYEE"])`. Call `updateUserById(ctx, userId, { name, role })`. Catch thrown errors: `LAST_MANAGER` → `{ error: "Une entreprise doit toujours avoir au moins un gestionnaire actif." }`; `NOT_FOUND` → `{ error: "Utilisateur introuvable." }`. Return `{ success: true }` on success.
- [ ] T023 [P] [US2] Create `src/app/(dashboard)/team/_components/EditEmployeeDialog.tsx` (`"use client"`): Dialog with a form. Props: `user` (id, name, role). `useActionState(updateEmployeeAction, initial)`. Hidden `userId` input. Editable `name` Input and `role` Select. On `state.success`, close the dialog (router.refresh()).
- [ ] T024 [US2] Wire the Edit affordance into `TeamTable`: add a "Modifier" button to each row's Actions column that opens an `EditEmployeeDialog` pre-populated with that row's user.
- [ ] T025 [US2] Manual smoke per quickstart.md US2: rename Bob → Robert, save, refresh, confirm. Then promote Robert to MANAGER, save, sign out, sign in as Robert — verify `/team` link now appears in the header. Then sign back in as Jane, demote yourself to EMPLOYEE — confirm rejection with the last-MANAGER error.

**Checkpoint**: US1 + US2 work. Manager can invite + edit.

---

## Phase 5: User Story 3 - Deactivate / reactivate users (Priority: P3)

**Goal**: A MANAGER can deactivate a user (soft delete: cannot sign in) and reactivate them later. Login response remains uniform for deactivated users.

**Independent Test**: MANAGER deactivates an employee; that employee cannot sign in (uniform error). MANAGER reactivates; they can sign in again. Self-deactivate and last-MANAGER deactivate are both rejected. See `quickstart.md` SC-003 + SC-004 + edge cases.

### Implementation for User Story 3

- [ ] T026 [P] [US3] Create `src/actions/team/set-active.ts` `setUserActiveAction(prev, formData)`. Begin with `await requireManagerContext()`. Zod schema: `userId .min(1)`, `isActive` coerced from `"true" | "false"`. If `isActive === false && userId === ctx.userId` return `{ error: "Vous ne pouvez pas désactiver votre propre compte." }`. Call `setUserActiveStatus(ctx, userId, isActive)`. Catch `LAST_MANAGER` → same message as in `updateEmployeeAction`. Return `{ success: true }`.
- [ ] T027 [P] [US3] Create `src/app/(dashboard)/team/_components/SetActiveConfirmDialog.tsx` (`"use client"`): a Dialog used for both deactivate and reactivate. Props: `user`, `desiredActive: boolean`. Body text adapts to the desired action. `useActionState(setUserActiveAction, initial)`. Confirm button submits the form. On success, close + `router.refresh()`.
- [ ] T028 [US3] Wire deactivate/reactivate affordances into `TeamTable`: a "Désactiver" button on active rows (other than self — hidden when `user.id === currentUserId`), a "Réactiver" button on inactive rows. Both open the `SetActiveConfirmDialog` with the appropriate `desiredActive`. Update the Status badge to render `Désactivé` in the destructive variant when `!user.isActive`.
- [ ] T029 [US3] Manual smoke per quickstart.md SC-003 + SC-004: deactivate Bob; try to sign in as Bob — confirm uniform error matches the "wrong password" wording. Reactivate Bob — confirm he can sign in. Try to deactivate yourself (as Jane) — confirm rejection. With only Jane as MANAGER, try to demote yourself — confirm rejection.

**Checkpoint**: All three Phase 1 user stories functional. The team-management flow is complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the increment and prepare commits.

- [ ] T030 [P] Run `npx tsc --noEmit`. Fix any TypeScript error introduced by the new files / type augmentations.
- [ ] T031 [P] Run `npm run dev`. Visit `/`, `/login`, `/signup`, `/dashboard`, `/team` in a browser as both a MANAGER and an EMPLOYEE. Check no runtime errors in the dev console.
- [ ] T032 Walk through every smoke step in `quickstart.md` (SC-001 through SC-006 + edge cases) end-to-end with the dev server live.
- [ ] T033 Stage and commit the Phase 1 work in four SDD-narrative commits on the `002-employee-management` branch, matching Phase 0's pattern:
   - `[Spec Kit] Add specification` — spec.md + checklists
   - `[Spec Kit] Add implementation plan` — plan.md + research.md + data-model.md + contracts/ + quickstart.md + CLAUDE.md update
   - `[Spec Kit] Add tasks` — tasks.md
   - `[Spec Kit] Implementation progress` — schema migration + all `src/` changes + new shadcn components + the Radix dialog dep
- [ ] T034 Push the branch: `git push -u origin 002-employee-management`. Optionally open a PR.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: just one `npm install` — runs immediately, parallel with Foundational schema changes if you like.
- **Foundational (Phase 2)**: depends on Setup. **BLOCKS all user stories.** Within Phase 2, T002→T003 are sequential (migration depends on schema edit); T004/T005/T006/T007/T010/T011/T012/T013 are independent of each other. T008 and T009 share `src/lib/repositories/user.ts` (sequential edits to the same file unless batched into one write).
- **US1 → US2 → US3**: each user story depends on Phase 2. Within a story, [P] tasks can run in parallel.
- **Polish (Phase 6)**: depends on whichever user stories you want to ship.

### Within Each User Story

- The Server Action and its client form are [P] (different files).
- The page file that consumes them depends on both being available.
- Manual smoke task closes the story.

### Parallel Opportunities

- Phase 2: T004, T005, T006, T007, T010, T011, T012, T013 are all [P] (different files).
- US1: T014 + T015 + T018 all [P].
- US2: T022 + T023 [P].
- US3: T026 + T027 [P].

### Same-file sequencing

- T008 + T009 both edit `src/lib/repositories/user.ts` — combine into one edit pass.
- T016 + T017 + T019 + T020 each touch different files in `src/app/(dashboard)/...` — independent.
- T018 + T024 + T028 all extend `TeamTable.tsx` — combine into one edit pass at the very end of each story (or write the final form once with all affordances and skip the intermediate states).

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2 done → Foundation ready.
2. Phase 3 (US1) → MVP shipped: a MANAGER can invite employees.
3. **STOP and VALIDATE** the invite flow end-to-end.

### Incremental Delivery

1. Setup + Foundational → ready.
2. + US1 → invite works, ship.
3. + US2 → edit works, ship.
4. + US3 → deactivate/reactivate works, ship.
5. + Polish → typecheck + full smoke + commits + push.

### Solo Developer Strategy (this project)

Sequential. Inside each story, batch all the [P] tasks into a single edit pass per file. Do not skip the manual smoke tasks — they are the Phase 1 testing posture.

---

## Notes

- `[P]` = different files, no dependency on incomplete tasks.
- `[Story]` label maps tasks to a user story for traceability.
- Each user story should be independently completable and testable from a Phase-0-shipped baseline.
- Phase 1 commit narrative mirrors Phase 0: spec → plan → tasks → implementation in that order on the feature branch.
- The constitutional load-bearing piece (Principle I) remains the same: `db.user.*` and `db.company.*` calls are forbidden outside `src/lib/repositories/`. A grep at the end of T032 confirms the rule still holds.

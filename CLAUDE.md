# Agendrix — Project Context

## What this project is
B2B multi-tenant SaaS for employee scheduling (style: Agendrix.com). Single database, every tenant-scoped table carries `companyId`. A `Company` has many `User`s; users have a `Role` (`MANAGER` | `EMPLOYEE`).

## User profile
- Solo developer, knows React/Next.js.
- This is an academic project — **Specification-Driven Development is a hard requirement** (graded). Always follow the `/speckit-*` workflow: constitution → specify → (clarify) → plan → tasks → implement.
- Prefers simple, standard solutions. No over-engineering.
- Speaks French; respond in French.

## Environment already prepared
- Git repo initialized; remote `origin` = `https://github.com/MonsieurClavett/agendrix.git` (currently empty branch). Use `git push --force` for the first push since we wiped a previous experimental commit.
- `.env` is populated and gitignored. It contains a working `DATABASE_URL` (Neon Postgres) and `AUTH_SECRET`. **Do not ask the user for these — read `.env` if needed.**
- Node v24, npm available. `pnpm` and `Docker` are NOT installed (corepack hits EPERM on Program Files; user declined Docker).
- `uv` is installed at `C:\Users\alexm\AppData\Local\Microsoft\WinGet\Packages\astral-sh.uv_*\uv.exe`; `specify` CLI at `C:\Users\alexm\.local\bin\specify.exe`.

## Confirmed stack decisions (from prior planning)
- **Next.js 16 + TypeScript + Tailwind v4** (App Router, Turbopack, `src/` dir, `@/*` alias).
- **Postgres on Neon** (DATABASE_URL already in `.env`).
- **Prisma 6** (NOT 7 — v7 removed `url` from datasource and requires driver adapters; way too much MVP friction).
- **Auth.js v5 (next-auth@beta)** with Credentials provider, JWT strategy.
- **shadcn/ui** — install components manually (the CLI hangs on interactive prompts in Claude Code's non-interactive shell).
- **bcryptjs** (NOT native bcrypt) — pure JS, no node-gyp pain on Windows.

## Multi-tenant architecture (non-negotiable)
- One central session helper: `requireTenantContext()` (and `requireManagerContext()`) returning `{ userId, companyId, role }`.
- ALL data access lives in `src/lib/repositories/*` functions that take a `TenantContext` and inject `where: { companyId: ctx.companyId }`.
- Pages, Server Actions, and route handlers MUST NOT call Prisma directly — they go through repositories.
- Signup creates `Company` + first MANAGER user in a single Prisma transaction.

## Implementation gotchas to avoid (already paid for in pain)
- `create-next-app .` fails with "Agendrix" because npm forbids capitals — scaffold into a lowercase temp folder then move contents up, then edit `package.json` to set `"name": "agendrix"`.
- Next.js 16 renamed `src/middleware.ts` → `src/proxy.ts`. Same content, new filename.
- Auth.js v5: augment `@auth/core/jwt` (not `next-auth/jwt`, TS can't resolve the latter). Keep the `declare module` blocks in `src/auth.ts` itself, not in a separate `.d.ts` (less brittle).
- Prisma 6 generator config: use `output = "../src/generated/prisma"` to keep the client out of node_modules and gitignored.
- `.env` (not `.env.local`) — Prisma CLI only auto-loads `.env`.
- `shadcn init` CLI hangs in non-interactive PowerShell — create `components.json`, `src/lib/utils.ts`, and write component files by hand.
- For PowerShell calling Python CLIs (specify), set `$env:PYTHONIOENCODING="utf-8"` and `$env:PYTHONUTF8="1"` or you'll hit cp1252 UnicodeEncodeError.

## Workflow
1. `/speckit-constitution` — define project principles
2. `/speckit-specify` — Phase 0: multi-tenant foundations (signup, login, protected dashboard demonstrating the tenant layer)
3. `/speckit-clarify` (optional) — de-risk ambiguities
4. `/speckit-plan` — implementation plan using the stack above
5. `/speckit-tasks` — break down into actionable tasks
6. `/speckit-implement` — execute

<!-- SPECKIT START -->
**Active feature**: `005-agendrix-shell`
**Plan**: [specs/005-agendrix-shell/plan.md](specs/005-agendrix-shell/plan.md)

For technical context, structure decisions, the constitution check, and the
project tree, read the plan above. Companion artifacts in the same folder:
`spec.md` (what), `research.md` (why this stack), `data-model.md` (entities),
`contracts/` (component contracts), `quickstart.md` (run + smoke).

Previous: `001-multi-tenant-foundations`, `002-employee-management`,
`003-schedules`, `004-calendar-ux` shipped.
<!-- SPECKIT END -->

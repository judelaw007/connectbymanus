# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install                          # Install dependencies (pnpm is the package manager)
npm run dev                           # Start dev server on port 5000 (tsx watch mode)
npm run build                         # Build frontend (Vite) + backend (esbuild) to dist/
npm run start                         # Run production server
npm run check                         # TypeScript type checking (tsc --noEmit)
npm run format                        # Format all files with Prettier
npm run test                          # Run all tests (Vitest)
npx vitest run server/messages.test.ts  # Run a single test file
```

## Architecture

Full-stack TypeScript monorepo (ESM throughout — `"type": "module"`):

- **`client/`** — React 19 frontend built with Vite. Uses Wouter for routing, shadcn/ui (Radix UI + TailwindCSS v4) for components, React Query for server state.
- **`server/`** — Express backend with tRPC for type-safe API (mounted at `/api/trpc`) and Socket.io for real-time messaging/presence. Entry point: `server/_core/index.ts`.
- **`shared/`** — Types and constants shared between client and server.
- **`supabase/migrations/`** — SQL migration files for the Supabase (PostgreSQL) database.

**Path aliases:** `@/*` → `client/src/*`, `@shared/*` → `shared/*`

### API Layer (tRPC)

All API routes are defined in `server/routers.ts`. Three procedure levels enforce access control:

- `publicProcedure` — no auth required
- `protectedProcedure` — requires logged-in user
- `adminProcedure` — requires admin role

Procedures are defined in `server/_core/trpc.ts`. Context creation (user resolution from JWT cookie) is in `server/_core/context.ts`.

### Database

`server/db.ts` contains all Supabase query functions. The database uses snake_case column names; TypeScript uses camelCase. Conversion helpers (`snakeToCamel`, `camelToSnake`) are in db.ts. Input validation uses Zod schemas.

### Authentication

Two auth paths: members authenticate via email verification codes (tRPC `memberAuth` router), admins authenticate via OAuth (`server/_core/oauth.ts`). Sessions are stored as JWT in an HTTP-only cookie (`app_session_id`).

### Real-time

Socket.io handles live chat, typing indicators, and user presence. Server setup is in `server/_core/socket.ts`. Rooms follow the pattern `channel:{id}` and `user:{id}`.

### Tests

Server-side only, located at `server/*.test.ts`. Tests use Vitest with the tRPC router called directly (no HTTP). Vitest config is in `vitest.config.ts`.

## Code Style

Prettier only (no ESLint). Key settings: double quotes, semicolons, 2-space indent, ES5 trailing commas, LF line endings, `arrowParens: "avoid"`.

## Project Tracking

- **`PLAN.md`** — The canonical project plan. Read this first to know what to build and in what order.
- **`.claude/settings.json`** — Hook configuration that auto-loads context on session start, auto-logs progress on stop, and auto-formats files after edits.
- **`.claude/progress.log`** — Auto-generated session activity log (not committed to git).
- If you change architectural files (`server/_core/`, `routers.ts`, `db.ts`, `App.tsx`, `package.json`), update this file to reflect structural changes.

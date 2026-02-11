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
- **`shared/`** — Types, constants, and error classes shared between client and server.
- **`supabase/migrations/`** — SQL migration files for the Supabase (PostgreSQL) database (currently 9 migrations, 001–009).

**Path aliases:** `@/*` → `client/src/*`, `@shared/*` → `shared/*`

### Server Structure

**`server/_core/`** — Core infrastructure (do not modify without updating this file):

| File              | Purpose                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `index.ts`        | Express app entry point; initializes HTTP server, Socket.io, OAuth routes, tRPC middleware    |
| `trpc.ts`         | tRPC init + procedure definitions (`publicProcedure`, `protectedProcedure`, `adminProcedure`) |
| `context.ts`      | tRPC context creation; resolves user from JWT cookie                                          |
| `oauth.ts`        | OAuth callback handler (`/api/oauth/callback`)                                                |
| `socket.ts`       | Socket.io server setup; JWT auth middleware, online user tracking, real-time events           |
| `sdk.ts`          | Auth SDK: JWT creation/verification, OAuth token exchange, user info retrieval                |
| `env.ts`          | Centralized environment variable exports                                                      |
| `cookies.ts`      | Session cookie options helper                                                                 |
| `vite.ts`         | Vite dev server setup for frontend                                                            |
| `systemRouter.ts` | System-level tRPC routes (health checks)                                                      |
| `llm.ts`          | LLM integration for @moji chatbot                                                             |
| `notification.ts` | In-app notification system                                                                    |

**`server/`** — Top-level business logic:

| File          | Purpose                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| `routers.ts`  | **Main tRPC router** — all API routes defined here (auth, channels, messages, posts, support, admin)       |
| `db.ts`       | **Supabase database layer** — 100+ query functions, TypeScript interfaces, snake_case↔camelCase conversion |
| `messages.ts` | Message creation/emission logic, Socket.io event integration                                               |
| `chatbot.ts`  | @moji AI chatbot: knowledge base search, LLM calls, escalation logic                                       |
| `storage.ts`  | File storage proxy (S3 via Forge API)                                                                      |

**`server/services/`** — External service integrations:

| File             | Purpose                                                                            |
| ---------------- | ---------------------------------------------------------------------------------- |
| `email.ts`       | SendGrid email service (supports TEST_MODE to redirect all mail to test recipient) |
| `learnworlds.ts` | Learnworlds API integration for member authentication verification                 |

**Test files:** `server/*.test.ts` (7 test files: analytics, auth.logout, channels, chatbot, messages, posts, support)

### Client Structure

**`client/src/pages/`** — Route-level page components:

| File                 | Route             | Purpose                                                              |
| -------------------- | ----------------- | -------------------------------------------------------------------- |
| `Home.tsx`           | `/`               | Main dashboard; shows ChatLayout for authenticated users             |
| `MemberLogin.tsx`    | `/login`          | Member login (Learnworlds email verification)                        |
| `AdminLogin.tsx`     | `/admin/login`    | Admin login (OAuth)                                                  |
| `AdminCallback.tsx`  | `/admin/callback` | OAuth callback → redirects to /admin                                 |
| `Admin.tsx`          | `/admin`          | Admin dashboard (tabs: Moji Settings, Email Logs, Platform Settings) |
| `TermsOfService.tsx` | `/terms`          | Legal page                                                           |
| `PrivacyPolicy.tsx`  | `/privacy`        | Legal page                                                           |
| `NotFound.tsx`       | `*`               | 404 page                                                             |

**`client/src/components/`** — Feature components:

| File                   | Purpose                                                                       |
| ---------------------- | ----------------------------------------------------------------------------- |
| `ChatLayout.tsx`       | **Main chat UI** — channel list, message display, input (three-column layout) |
| `MessageList.tsx`      | Paginated message thread rendering                                            |
| `MessageInput.tsx`     | Text input with rich formatting                                               |
| `AIChatBox.tsx`        | Reusable AI chat widget (used in ComponentShowcase; @moji uses MessageInput)  |
| `CreatePostModal.tsx`  | Modal for creating posts (Events, Announcements, Articles, Newsletters)       |
| `CreateGroupModal.tsx` | Modal for creating study groups                                               |
| `SupportInbox.tsx`     | Admin support ticket inbox                                                    |
| `UserSupportChat.tsx`  | User-facing support chat interface                                            |
| `ChatAnalytics.tsx`    | Channel analytics dashboard                                                   |
| `AdminAuthGuard.tsx`   | Route guard — redirects non-admins                                            |
| `DashboardLayout.tsx`  | Admin dashboard wrapper layout                                                |
| `EmailLogs.tsx`        | Admin email log viewer                                                        |
| `MojiSettings.tsx`     | Admin @moji configuration                                                     |
| `PlatformSettings.tsx` | Global platform settings UI                                                   |
| `UserManagement.tsx`   | Admin user list + detail + moderation (suspend/unsuspend)                     |
| `ErrorBoundary.tsx`    | React error boundary                                                          |

**`client/src/components/ui/`** — 60+ shadcn/ui primitives (button, card, dialog, form, table, etc.). Do not modify directly; regenerate via shadcn CLI.

**`client/src/contexts/`**:

| File                | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `SocketContext.tsx` | Provides Socket.io client instance to component tree |
| `ThemeContext.tsx`  | Dark/light theme switching                           |

**`client/src/lib/`** — Utilities: `trpc.ts` (tRPC client), `supabase.ts` (Supabase client), `utils.ts` (general helpers).

**`client/src/hooks/`** — `useMobile.tsx` (viewport detection), `useComposition.ts` (IME input), `usePersistFn.ts` (memoized refs).

**`client/src/_core/hooks/useAuth.ts`** — Auth hook for current user from JWT cookie.

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

Server-side only, located at `server/*.test.ts`. Tests use Vitest with the tRPC router called directly (no HTTP). Vitest config is in `vitest.config.ts`. Currently 7 test files covering analytics, auth, channels, chatbot, messages, posts, and support.

## Environment Variables

See `.env.example` for the full list. Key groups:

- **Supabase**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Learnworlds**: `LEARNWORLDS_CLIENT_ID`, `LEARNWORLDS_CLIENT_SECRET`, `LEARNWORLDS_SCHOOL_ID`
- **Email**: `SENDGRID_API_KEY`, `EMAIL_FROM`, `TEST_MODE`, `TEST_EMAIL_RECIPIENT`
- **Auth**: `JWT_SECRET`, `SESSION_SECRET`, `OWNER_OPEN_ID`
- **App**: `NODE_ENV`, `PORT` (default 5000)

When `TEST_MODE=true`, all emails redirect to `TEST_EMAIL_RECIPIENT` with `[TEST]` subject prefix.

## Code Style

Prettier only (no ESLint). Key settings: double quotes, semicolons, 2-space indent, ES5 trailing commas, LF line endings, `arrowParens: "avoid"`.

## Project Tracking

- **`PLAN.md`** — The canonical project plan. Read this first to know what to build and in what order.
- **`.claude/settings.json`** — Hook configuration that auto-loads context on session start, auto-logs progress on stop, and auto-formats files after edits.
- **`.claude/progress.log`** — Auto-generated session activity log (not committed to git).
- If you change architectural files (`server/_core/`, `routers.ts`, `db.ts`, `App.tsx`, `package.json`), update this file to reflect structural changes.

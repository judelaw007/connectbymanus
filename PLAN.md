# MojiTax Connect — Development Plan

> Last updated: 2026-02-12
> Overall: ~92% complete | Backend core 100% | All CRITICAL + HIGH done | M5 + M6 done | Moving through MEDIUM tier
> Target: connect.mojitax.co.uk | ~1,800 expected users

## Current Sprint

Sprint 4: Polish, MEDIUM Priorities & Launch Prep
Goal: Address remaining MEDIUM items, harden for production, prepare for launch.
Estimated effort: 4-6 focused sessions.

## Priorities

### CRITICAL — Admin cannot function without these

- [x] C1. Admin user listing & details (#1, #9) ✓
  - `getAllUsers()` / `getUserDetails()` in db.ts with pagination, search, sort
  - `users` tRPC router (list, getById) with admin-only access
  - UserManagement component: searchable/sortable user table, detail view with channels/message count/tickets

- [x] C2. User moderation system (#8) ✓
  - Migration 010: `is_suspended`, `suspension_reason`, `suspended_at`, `suspended_until`, `suspended_by`
  - `suspendUser()`, `unsuspendUser()`, `isUserSuspended()` in db.ts (auto-unsuspend on expiry)
  - tRPC `users.suspend` / `users.unsuspend` endpoints (prevents suspending admins)
  - Suspension enforced on `messages.send` and `support.create`
  - Moderation UI: suspend dialog with reason + duration picker, unsuspend from list/detail

- [x] C3. Wire @moji into chat UI (#4) ✓
  - Backend was already wired (chatbot.ts → messages.ts → Socket.io)
  - Added @moji mention autocomplete popup in MessageInput (triggered by typing @)
  - Updated placeholder to hint "@moji" availability
  - Added "thinking" indicator in MessageList while bot processes response

### HIGH — Core feature gaps

- [x] H1. Rich post cards in chat + email distribution (#5) ✓
  - PostCard component with 4 styled card variants: Event (blue), Announcement (amber), Article (green), Newsletter (purple)
  - Cards show title, content, metadata (event date/location, tags, priority badge), author, timestamp
  - getChannelMessages LEFT JOINs posts table so message query includes full post metadata
  - Email distribution on post creation: General channel → all users, specific channel → channel members only
  - Email templates: sendAnnouncementEmail, sendEventEmail, sendNewsletterEmail, sendArticleEmail

- [x] H2. Unread message indicator / red badge (#7) ✓
  - Migration 013: `last_read_at` on channel_members + indexes
  - `updateChannelLastRead()`, `getUnreadCountsForUser()` in db.ts
  - tRPC `channels.getUnreadCounts` query + `channels.markAsRead` mutation
  - Socket.io: mark-read on channel:join, `emitUnreadUpdate` on new messages
  - Per-channel red badges in sidebar (Topic Channels + My Groups)
  - Admin "Go to Chat Mode" button turns red with count when unreads exist
  - Real-time: local tracking via Socket events + 60s polling safety net
  - **Bug fixes (3 rounds):**
    - Round 1: Fixed 5 issues — Socket handler joining wrong room, missing `emitUnreadUpdate` calls, sender self-notify, stale React Query cache, admin badge not wired
    - Round 2: Auto-create `channel_members` row on `channel:join` for public channels (users had no membership row → unread counts returned 0)
    - Round 3: Auto-join admins to all public channels on OAuth login (admins had no membership rows at all)

- [x] H3. Admin-only channel creation linked to Learnworlds (#6) ✓
  - Migration 014: `learnworlds_course_id`, `learnworlds_bundle_id`, `learnworlds_subscription_id` on channels
  - Learnworlds API: `getCourses()`, `getBundles()`, `getSubscriptions()`, `getUserCourses()`
  - tRPC `channels.getLearnworldsCatalog` (admin-only) returns all entities
  - Updated `channels.create` to accept Learnworlds entity links (admin-only)
  - Auto-enrollment: on member login, matches user's Learnworlds courses to linked channels
  - CreateChannelModal: admin UI with name/description + Learnworlds entity picker dropdown
  - "Create Channel" button in admin sidebar (regular users still use "Create Group" for study groups)

- [x] H4. XSS hardening — DOMPurify + Content-Security-Policy header ✓
  - DOMPurify installed and applied to all `dangerouslySetInnerHTML` usage (PostCard, EventInterest)
  - CSP header: restricts scripts, frames, objects; allows Supabase/OpenAI/fonts
  - X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy

### MEDIUM — Post-launch improvements (recommended order)

- [x] **M6. Rate limiting middleware** ✓
  - `express-rate-limit` v8.2.1 installed
  - `server/_core/rateLimit.ts`: procedure-aware middleware that routes to 4 tiers:
    - Auth (login/verify): 10 req / 15 min per IP
    - Messages (send): 60 req / min per IP
    - Support (create): 5 req / 15 min per IP
    - General API: 200 req / min per IP
  - Wired in `server/_core/index.ts` before tRPC middleware on `/api/trpc`

- [x] **M5. Search functionality across messages and posts** ✓
  - `searchMessages()` and `searchPosts()` in db.ts using `ilike` pattern matching
  - tRPC `search.messages` (protected, filters private channels) + `search.posts` (protected, optional postType filter)
  - SearchDialog component: tabbed Messages/Posts UI, debounced input, result highlighting, click-to-navigate
  - Wired to existing search icon button in ChatLayout header

- [ ] **M4. Category library pages (Articles, Events, Announcements, Newsletters)**
  - Dedicated browse pages per post type with filtering/sorting
  - Accessible from sidebar or navigation

- [ ] **M1. @course/@bundle/@subscription mention autocomplete (#2)**
  - For Learnworlds users, admin types @ to see courses, bundles, subscriptions in a dropdown
  - e.g., `@essential subscription`, `@transfer pricing exam focus`
  - Fetch Learnworlds catalog via API and cache it (API already built for H3)
  - Build autocomplete dropdown component triggered by @ in message input
  - Selecting a mention inserts a styled chip/link and sends email to all enrolled users

- [ ] **M2. Email templates in SendGrid (#3)**
  - Current templates are inline HTML strings in code (server/services/email.ts)
  - Migrate all 7+ email types to SendGrid dynamic templates
  - Use template IDs and dynamic data substitution instead of raw HTML
  - Templates: welcome, verification code, ticket created, ticket reply, ticket closed, channel post notification, event invitation

- [ ] M3. mojitax.co.uk OAuth integration (BLOCKED — needs API credentials)
- [ ] M7. Load testing (100+ concurrent users) — do this last, closer to launch

## Blockers

- mojitax.co.uk OAuth: Requires API credentials and documentation from Learnworlds
- ~~Learnworlds course/bundle/subscription API~~: **RESOLVED** — API integration built for H3 (channel linking); also usable for M1

## Completed

- [x] Database schema (10 tables with indexes, RLS policies, triggers)
- [x] Core backend tRPC API endpoints (server/routers.ts — missing: users router, moderation endpoints)
- [x] Socket.io real-time infrastructure (connections, rooms, typing indicators)
- [x] @moji AI chatbot fully wired end-to-end (backend + chat UI mention autocomplete + thinking indicator)
- [x] Admin dashboard (Support Inbox, Analytics, Settings, Email Logs, KB management, User Management, User Moderation)
- [x] User Management: admin user listing with search/filter/sort, user detail view with channels/messages/tickets
- [x] User Moderation: suspend/unsuspend with reason and duration, enforcement on messaging and ticket creation
- [x] Create Post modal (Events, Announcements, Articles, Newsletters — posts render as plain text, see H1)
- [x] Member authentication via email verification codes (tRPC memberAuth router)
- [x] Chat analytics and CSV export
- [x] Study groups (create, join, leave, invite, archive)
- [x] Support ticket system backend (create, assign, reply, close)
- [x] Unit tests: 20/20 backend tests passing
- [x] Three-column responsive layout with mobile hamburger menu
- [x] CLAUDE.md with build commands, architecture, and code style
- [x] Dynamic project tracking system (hooks + PLAN.md + auto-memory)
- [x] Admin login password protection (timing-safe SHA256, HTTP-only session cookie)
- [x] "Chat with Team MojiTax" support chat for regular users (UserSupportChat component)
- [x] Email notifications via SendGrid (ticket create, reply, close — with logging)
- [x] Rich post cards in chat (Event, Announcement, Article, Newsletter) with styled card components + email distribution to channel members
- [x] Bug fix: CreatePostModal crash when switching channel (empty-string SelectItem value → Radix UI runtime error)
- [x] Terms of Service and Privacy Policy pages (routes + footer links)
- [x] Online users sidebar with real Socket.io data (replaced hardcoded fake data)
- [x] Message sending reliability (optimistic updates, error handling, Enter key support)
- [x] "My Tickets" section for users (via UserSupportChat "Your Conversations")
- [x] Unread message indicators: per-channel red badges + admin "Go to Chat Mode" badge, real-time Socket updates
- [x] Admin-only channel creation with Learnworlds entity linking + auto-enrollment on login
- [x] XSS hardening: DOMPurify on all HTML rendering + CSP/security headers in Express
- [x] Bug fix: PGRST201 ambiguous FK between messages↔posts — disambiguated with `posts!messages_post_id_fkey` in getChannelMessages and getPinnedMessages
- [x] Bug fix: Admin unable to send messages — membership check was too strict; admins now bypass it
- [x] Bug fix: Messages disappearing after send — optimistic update conflicted with Socket.io event
- [x] Bug fix: Admin chat mode layout overflowing — switched from h-screen to h-full
- [x] Bug fix: DOMPurify import failing in Vite dev server — added explicit resolve alias
- [x] Bug fix: Unread badges unreliable — 3 rounds of fixes (see H2 details above)
- [x] Rate limiting middleware: 4-tier express-rate-limit on all tRPC endpoints (auth, messages, support, general)
- [x] Search: message and post search with tabbed dialog UI, debounced input, result highlighting, click-to-navigate

## Recent Bug-Fix Summary (2026-02-11 evening)

| Issue                         | Root Cause                                                | Fix                                             |
| ----------------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| Admin can't send messages     | `channel_members` check rejected admins                   | Skip membership check for admin role            |
| Messages vanish after send    | Optimistic update + Socket event = duplicate then removal | Deduplicate by message ID                       |
| Admin chat overlaps dashboard | `h-screen` on nested layout                               | Use `h-full`                                    |
| DOMPurify import error        | Vite can't resolve CJS default export                     | `resolve.alias` in vite.config                  |
| Unread badges always 0        | No `channel_members` row for public channels              | Auto-create on `channel:join`                   |
| Admin has no badges           | No membership rows created at OAuth login                 | Auto-join all public channels in OAuth callback |

## Out of Scope (for now)

- Mobile app (React Native wrapper)
- File uploads / attachments in messages
- Direct messaging between users
- Message editing / deletion
- Newsletter digest system
- Excel export (CSV is sufficient)
- Browser push notifications

## Key File Reference

See `CLAUDE.md` for the full file-by-file map. Quick reference for Sprint 3 work:

| Purpose                  | Path                                     |
| ------------------------ | ---------------------------------------- |
| All API endpoints        | `server/routers.ts`                      |
| Database functions       | `server/db.ts`                           |
| Chatbot logic            | `server/chatbot.ts`                      |
| Main chat UI             | `client/src/components/ChatLayout.tsx`   |
| AI chat widget (unwired) | `client/src/components/AIChatBox.tsx`    |
| Admin dashboard          | `client/src/pages/Admin.tsx`             |
| Admin login              | `client/src/pages/AdminLogin.tsx`        |
| Member login             | `client/src/pages/MemberLogin.tsx`       |
| Support inbox (admin)    | `client/src/components/SupportInbox.tsx` |
| Socket.io server         | `server/_core/socket.ts`                 |
| Socket context (client)  | `client/src/contexts/SocketContext.tsx`  |
| Email service            | `server/services/email.ts`               |
| Learnworlds integration  | `server/services/learnworlds.ts`         |
| Routes/pages             | `client/src/App.tsx`                     |
| tRPC procedures          | `server/_core/trpc.ts`                   |
| Auth context             | `server/_core/context.ts`                |
| Environment variables    | `.env.example`                           |
| DB migrations            | `supabase/migrations/`                   |

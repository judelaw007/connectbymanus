# MojiTax Connect — Development Plan

> Last updated: 2026-02-12
> Overall: **PRODUCTION READY** | All CRITICAL + HIGH + MEDIUM items complete | 6 sprints delivered
> Target: connect.mojitax.co.uk | ~1,800 expected users

## Current Status

**Production launch ready.** All development sprints complete. Documentation delivered.

### Sprint 6: Production Launch Prep (2026-02-12) — COMPLETE

- [x] Seed data trimmed: only #General channel retained (5 topic channels removed — admins create channels as needed)
- [x] `TEST_MODE` set to `false` for production (emails now go to real users)
- [x] `USER_GUIDE.md` created: complete member documentation (login, messaging, groups, @moji, support, posts, search, troubleshooting)
- [x] `ADMIN_GUIDE.md` created: complete admin operations guide (setup, env vars, database, dashboard, channels, posts, moderation, email, analytics, Learnworlds, data validation, troubleshooting)
- [x] `CLAUDE.md` updated: migration count (16), routes, components, env vars, production status
- [x] `PLAN.md` updated: reflects production readiness

### Sprint 5: Platform Governance & Launch Hardening — COMPLETE

Goal: Implement the 6 governance requirements — @moji boundaries, username privacy, group privacy, channel linking rules, admin hours, and public access controls.

## Development History

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

- [x] **M4. Category library pages (Articles, Events, Announcements, Newsletters)** ✓
  - `browsePostsByType()` in db.ts with pagination, sort (newest/oldest/pinned), and text search
  - `posts.browse` tRPC endpoint with full filtering support
  - CategoryLibrary dialog: search, sort dropdown, PostCard rendering, pagination
  - Sidebar "View All" links on each category header open the library dialog

- [x] **M1. @course/@bundle/@subscription mention autocomplete (#2)** ✓
  - Unified @mention dropdown in MessageInput: @moji + courses/bundles/subscriptions (admin only)
  - Learnworlds catalog fetched via existing `getLearnworldsCatalog` endpoint, cached 5 min
  - Fuzzy-filtered dropdown with type badges, arrow-key navigation, Enter/Tab/Escape
  - Mentions inserted as `@[Course: Title]` format, rendered as styled inline badges in MessageList
  - Color-coded by type: emerald (Course), purple (Bundle), amber (Subscription)

### SPRINT 5 — Platform Governance (6 requirements)

- [x] **S5.1. @moji boundaries & KB management** ✓
  - Expanded system prompt with clear CAN/CANNOT sections
  - @moji will not give individual tax advice, course-specific answers, or access accounts
  - Politely declines out-of-scope topics
  - KB admin: CSV template download with example entries + better help text
  - **Manual task for admin:** Populate KB with MojiTax service info, subscription links, pricing

- [x] **S5.2. @moji role clarity** ✓
  - System prompt now defines @moji as "first point of contact" for members
  - Clear escalation path: @moji → Team MojiTax support ticket
  - KB entry explains how to use @moji

- [x] **S5.3. Admin availability hours & response time** ✓
  - Migration 015: admin*hours*\* platform settings
  - Admin UI: PlatformSettings → "Admin Availability Hours" card
  - Settings: timezone, start/end time, working days, average response minutes
  - Public API: `settings.getAdminAvailability` calculates live online/offline status
  - Member UI: green/gray dot under "Chat with Team MojiTax" with response time estimate
  - Refreshes every 5 minutes

- [x] **S5.4. Groups private, channels purpose-linked** ✓
  - **Group privacy:** Admin CANNOT read study group messages (even as admin)
  - Admin CANNOT send messages to study groups unless member
  - Admin CAN still view group member list (for complaint handling)
  - Admin CAN suspend/unsuspend groups via `studyGroups.suspend` / `studyGroups.unsuspend`
  - Suspended groups: messages blocked, "group suspended" error shown
  - **Channel linking:** Topic channels now REQUIRE a Learnworlds course/bundle/subscription link
  - General channel is the only standalone topic channel allowed

- [x] **S5.5. Username privacy — display name self-service** ✓
  - Members can set their own display name (2-30 chars, alphanumeric + spaces/hyphens)
  - Display name banner shown at top of chat for new members without one
  - `memberAuth.updateDisplayName` endpoint with validation
  - Public view: shows "Admin"/"Member" only (no real names, no emails)
  - Online users list: hidden from unauthenticated visitors (shows count only)
  - Emails never exposed to other members in messages or online list

- [x] **S5.6. Non-logged-in access tightened** ✓
  - Public users see "Member"/"Admin" labels only (no real names)
  - Online users sidebar: shows member count instead of name list
  - Posts, events, channels browsable for SEO traction
  - Cannot send messages, create groups, or see private content

### Future enhancements (post-launch, not blocking)

- [ ] **M2. Email templates in SendGrid (#3)** — Migrate inline HTML to SendGrid dynamic templates
- [ ] **M3. mojitax.co.uk OAuth integration** — Requires API credentials from Learnworlds
- [ ] **M7. Load testing** (100+ concurrent users) — Recommend before scaling

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
- [x] Category library: browse dialogs for Articles/Events/Announcements/Newsletters with search, sort, pagination
- [x] @mention autocomplete: unified dropdown with @moji + catalog items (courses/bundles/subscriptions), arrow-key nav, styled inline badges in messages
- [x] Sprint 5: Platform governance — @moji boundaries, admin hours, group privacy, channel linking, username privacy, public access controls
- [x] Sprint 6: Production launch prep — seed data cleanup, TEST_MODE disabled, USER_GUIDE.md, ADMIN_GUIDE.md, documentation alignment

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

See `CLAUDE.md` for the full file-by-file architecture map.

| Purpose                 | Path                                     |
| ----------------------- | ---------------------------------------- |
| All API endpoints       | `server/routers.ts`                      |
| Database functions      | `server/db.ts`                           |
| Chatbot logic           | `server/chatbot.ts`                      |
| Main chat UI            | `client/src/components/ChatLayout.tsx`   |
| Admin dashboard         | `client/src/pages/Admin.tsx`             |
| Admin login             | `client/src/pages/AdminLogin.tsx`        |
| Member login            | `client/src/pages/MemberLogin.tsx`       |
| Support inbox (admin)   | `client/src/components/SupportInbox.tsx` |
| Socket.io server        | `server/_core/socket.ts`                 |
| Email service           | `server/services/email.ts`               |
| Learnworlds integration | `server/services/learnworlds.ts`         |
| Routes/pages            | `client/src/App.tsx`                     |
| Environment variables   | `.env.example`                           |
| DB reset script         | `supabase/reset_database.sql`            |
| DB migrations           | `supabase/migrations/`                   |
| User guide              | `USER_GUIDE.md`                          |
| Admin guide             | `ADMIN_GUIDE.md`                         |

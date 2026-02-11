# MojiTax Connect — Development Plan

> Last updated: 2026-02-11
> Overall: ~75% complete | Backend core 95% | Frontend core features progressing | Admin tools functional
> Target: connect.mojitax.co.uk | ~1,800 expected users

## Current Sprint

Sprint 3: Admin Tools, Moderation & Chat Enhancements
Goal: Fix broken admin workflows, implement user moderation, enhance chat with rich posts and @mentions, wire up @moji.
Estimated effort: 6-8 focused sessions.

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

- [ ] H2. Unread message indicator / red badge (#7)
  - No unread message tracking exists currently
  - Add `last_read_at` per user per channel (DB migration + functions)
  - Track unread count via Socket.io events
  - Make "Go to Chat Mode" button turn RED when there are unread messages for admin
  - Show per-channel unread badges in sidebar

- [ ] H3. Admin-only channel creation linked to Learnworlds (#6)
  - Admin should be able to create channels and link them to specific courses, subscriptions, or bundles
  - DB migration: add `learnworlds_course_id`, `learnworlds_bundle_id`, `learnworlds_subscription_id` columns to channels table
  - Build channel-creation UI with Learnworlds entity picker
  - Auto-enroll users into linked channels based on their Learnworlds purchases
  - Users cannot create channels but CAN create private groups (study groups already exist — verify this path works)

- [ ] H4. XSS hardening — add DOMPurify and Content-Security-Policy header
  - Current message rendering is text-safe (whitespace-pre-wrap, no HTML injection)
  - Install DOMPurify for future HTML content, add CSP header in Express middleware

### MEDIUM — Post-launch improvements

- [ ] M1. @course/@bundle/@subscription mention autocomplete (#2)
  - For Learnworlds users, admin types @ to see courses, bundles, subscriptions in a dropdown
  - e.g., `@essential subscription`, `@transfer pricing exam focus`
  - Fetch Learnworlds catalog via API and cache it
  - Build autocomplete dropdown component triggered by @ in message input
  - Selecting a mention inserts a styled chip/link and sends email to all enrolled users

- [ ] M2. Email templates in SendGrid (#3)
  - Current templates are inline HTML strings in code (server/services/email.ts)
  - Migrate all 7+ email types to SendGrid dynamic templates
  - Use template IDs and dynamic data substitution instead of raw HTML
  - Templates: welcome, verification code, ticket created, ticket reply, ticket closed, channel post notification, event invitation

- [ ] M3. mojitax.co.uk OAuth integration (BLOCKED — needs API credentials)
- [ ] M4. Category library pages (Articles, Events, Announcements, Newsletters)
- [ ] M5. Search functionality across messages and posts
- [ ] M6. Rate limiting middleware
- [ ] M7. Load testing (100+ concurrent users)

## Blockers

- mojitax.co.uk OAuth: Requires API credentials and documentation from Learnworlds
- Learnworlds course/bundle/subscription API: Needed for H3 (channel linking) and M1 (@mention autocomplete)

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

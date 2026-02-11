# MojiTax Connect — Development Plan

> Last updated: 2026-02-11
> Overall: ~60% complete | Backend core 85% | Frontend core features partial | Admin tools incomplete
> Target: connect.mojitax.co.uk | ~1,800 expected users

## Current Sprint

Sprint 3: Admin Tools, Moderation & Chat Enhancements
Goal: Fix broken admin workflows, implement user moderation, enhance chat with rich posts and @mentions, wire up @moji.
Estimated effort: 6-8 focused sessions.

## Priorities

### CRITICAL — Admin cannot function without these

- [ ] C1. Admin user listing & details (#1, #9)
  - Admin cannot see any users despite existing conversations
  - Add `getAllUsers()` / `searchUsers()` to db.ts
  - Add `users` tRPC router with admin-only endpoints (list, getById, search)
  - Build user list UI in Admin dashboard with search/filter
  - Build user detail view (profile, channels joined, message count, last active)

- [ ] C2. User moderation system (#8)
  - "Moderate Users" tab is a non-functional placeholder
  - DB migration: add `is_suspended`, `suspension_reason`, `suspended_at`, `suspended_until` columns to users table
  - Add db functions: `suspendUser()`, `unsuspendUser()`, `getSuspendedUsers()`
  - Add tRPC endpoints for suspension/unsuspension
  - Enforce suspension in message/post-send logic (check before allowing)
  - Build moderation UI: user list with suspend/unsuspend actions, reason input, duration picker

- [ ] C3. Wire @moji into chat UI (#4)
  - Backend exists (chatbot.ts, knowledge base search, escalation) but is never reachable from chat
  - Connect AIChatBox / @moji trigger in the channel message input
  - Ensure @moji responds in real-time via Socket.io
  - Test end-to-end: user types @moji question → gets AI response in chat

### HIGH — Core feature gaps

- [ ] H1. Rich post cards in chat + email distribution (#5)
  - Posts (Events, Announcements, Articles, Newsletters) currently render as plain text messages
  - Design and implement unique card components for each post type (event card with date/time, article card with preview, announcement banner, etc.)
  - When admin posts to a channel, send email notification to ALL members of that channel
  - General channel posts → email all MojiTax users
  - Specific channel posts → email only channel members

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
- [x] @moji AI chatbot backend only (LLM integration, knowledge base search, escalation — NOT wired into chat UI, see C3)
- [x] Admin dashboard (Support Inbox, Analytics, Settings, Email Logs, KB management — User Moderation is placeholder only, see C1/C2)
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

| Purpose                 | Path                                     |
| ----------------------- | ---------------------------------------- |
| All API endpoints       | `server/routers.ts`                      |
| Database functions      | `server/db.ts`                           |
| Chatbot logic           | `server/chatbot.ts`                      |
| Main chat UI            | `client/src/components/ChatLayout.tsx`   |
| Admin login             | `client/src/pages/AdminLogin.tsx`        |
| Support inbox (admin)   | `client/src/components/SupportInbox.tsx` |
| Socket.io server        | `server/_core/socket.ts`                 |
| Socket context (client) | `client/src/contexts/SocketContext.tsx`  |
| Email service           | `server/services/email.ts`               |
| Routes/pages            | `client/src/App.tsx`                     |
| tRPC procedures         | `server/_core/trpc.ts`                   |
| Auth context            | `server/_core/context.ts`                |

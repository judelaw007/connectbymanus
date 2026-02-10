# MojiTax Connect — Development Plan

> Last updated: 2026-02-10
> Overall: ~55% complete | Backend 95% | Frontend has critical gaps
> Target: connect.mojitax.co.uk | ~1,800 expected users

## Current Sprint

Sprint 1: Security and Core Fixes
Goal: Close all CRITICAL security holes and fix the primary broken user features.
Estimated effort: 3-5 focused sessions.

## Priorities

### CRITICAL — Must fix before any deployment

- [ ] 1. Admin login has no password protection — anyone can access /auth/admin (SECURITY)
  - Files: `client/src/pages/AdminLogin.tsx`, `server/routers.ts`, `client/src/pages/Admin.tsx`
  - Add password input, create `auth.adminLogin` tRPC endpoint, use `ADMIN_PASSWORD` env var with bcrypt
  - Set HTTP-only session cookie, check on all admin routes

- [ ] 2. "Chat with Team MojiTax" does nothing for regular users (CORE FEATURE)
  - Files: `client/src/components/ChatLayout.tsx`, new `client/src/components/UserSupportChat.tsx`
  - Wire up onClick handler for non-admin users
  - Show support chat panel with @moji welcome, "Request Human Agent" button
  - Create support ticket on escalation via `support.create()`

- [ ] 3. Email notifications do not actually send (NOTIFICATIONS)
  - Files: `server/services/email.ts` (exists but not wired), `server/routers.ts`
  - Wire SendGrid calls on: ticket create → email admin, admin reply → email user, ticket close → email transcript
  - Requires `SENDGRID_API_KEY` and `EMAIL_FROM` env vars

- [ ] 4. No Terms of Service or Privacy Policy pages (LEGAL)
  - Create: `client/src/pages/TermsOfService.tsx`, `client/src/pages/PrivacyPolicy.tsx`
  - Add routes in `client/src/App.tsx`, add footer links in ChatLayout

### HIGH — Important but not blocking initial testing

- [ ] 5. Online users sidebar shows hardcoded fake data
  - File: `client/src/components/ChatLayout.tsx` (lines ~376-383)
  - Replace `[1,2,3,4,5].map(...)` with real data from SocketContext `onlineUsers`

- [ ] 6. XSS protection unknown — user content may render unsanitized
  - Install DOMPurify, sanitize user-generated content before rendering
  - Add Content-Security-Policy header in Express middleware

- [ ] 7. Message sending may not work reliably from frontend
  - Debug MessageInput send button, check tRPC client config and auth state
  - Files: `client/src/components/MessageInput.tsx`, `client/src/components/ChatLayout.tsx`

- [ ] 8. Users cannot see their own support tickets
  - Add "My Tickets" section to sidebar or user menu
  - Connect to existing `support.getMy` tRPC endpoint

### MEDIUM — Post-launch improvements

- [ ] 9. mojitax.co.uk OAuth integration (BLOCKED — needs API credentials)
- [ ] 10. Category library pages (Articles, Events, Announcements, Newsletters)
- [ ] 11. Search functionality across messages and posts
- [ ] 12. Rate limiting middleware
- [ ] 13. Load testing (100+ concurrent users)

## Blockers

- mojitax.co.uk OAuth: Requires API credentials and documentation from Learnworlds
- Email sending: Requires SENDGRID_API_KEY in environment variables
- Legal pages: Content needs legal review (can scaffold with placeholder text first)

## Completed

- [x] Database schema (10 tables with indexes, RLS policies, triggers)
- [x] All backend tRPC API endpoints (server/routers.ts — 95% complete)
- [x] Socket.io real-time infrastructure (connections, rooms, typing indicators)
- [x] @moji AI chatbot backend (LLM integration, knowledge base search, escalation)
- [x] Admin dashboard (Support Inbox, Analytics, Settings, Email Logs, KB management)
- [x] Create Post modal (Events, Announcements, Articles, Newsletters)
- [x] Member authentication via email verification codes (tRPC memberAuth router)
- [x] Chat analytics and CSV export
- [x] Study groups (create, join, leave, invite, archive)
- [x] Support ticket system backend (create, assign, reply, close)
- [x] Unit tests: 20/20 backend tests passing
- [x] Three-column responsive layout with mobile hamburger menu
- [x] CLAUDE.md with build commands, architecture, and code style
- [x] Dynamic project tracking system (hooks + PLAN.md + auto-memory)

## Out of Scope (for now)

- Mobile app (React Native wrapper)
- File uploads / attachments in messages
- Direct messaging between users
- Message editing / deletion
- Advanced search across messages/posts
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
| Admin login (BROKEN)    | `client/src/pages/AdminLogin.tsx`        |
| Support inbox (admin)   | `client/src/components/SupportInbox.tsx` |
| Socket.io server        | `server/_core/socket.ts`                 |
| Socket context (client) | `client/src/contexts/SocketContext.tsx`  |
| Email service           | `server/services/email.ts`               |
| Routes/pages            | `client/src/App.tsx`                     |
| tRPC procedures         | `server/_core/trpc.ts`                   |
| Auth context            | `server/_core/context.ts`                |

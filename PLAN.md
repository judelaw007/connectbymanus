# MojiTax Connect — Development Plan

> Last updated: 2026-02-11
> Overall: ~80% complete | Backend 95% | Frontend core features done
> Target: connect.mojitax.co.uk | ~1,800 expected users

## Current Sprint

Sprint 2: Hardening and Feature Expansion
Goal: Add XSS hardening, build out remaining medium-priority features, prepare for production.
Estimated effort: 3-5 focused sessions.

## Priorities

### CRITICAL — Must fix before any deployment

All CRITICAL items resolved.

### HIGH — Important but not blocking initial testing

- [ ] 6. XSS hardening — add DOMPurify and Content-Security-Policy header
  - Current message rendering is text-safe (whitespace-pre-wrap, no HTML injection)
  - Install DOMPurify for future HTML content, add CSP header in Express middleware

### MEDIUM — Post-launch improvements

- [ ] 9. mojitax.co.uk OAuth integration (BLOCKED — needs API credentials)
- [ ] 10. Category library pages (Articles, Events, Announcements, Newsletters)
- [ ] 11. Search functionality across messages and posts
- [ ] 12. Rate limiting middleware
- [ ] 13. Load testing (100+ concurrent users)

## Blockers

- mojitax.co.uk OAuth: Requires API credentials and documentation from Learnworlds

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
| Admin login             | `client/src/pages/AdminLogin.tsx`        |
| Support inbox (admin)   | `client/src/components/SupportInbox.tsx` |
| Socket.io server        | `server/_core/socket.ts`                 |
| Socket context (client) | `client/src/contexts/SocketContext.tsx`  |
| Email service           | `server/services/email.ts`               |
| Routes/pages            | `client/src/App.tsx`                     |
| tRPC procedures         | `server/_core/trpc.ts`                   |
| Auth context            | `server/_core/context.ts`                |

# MojiTax Connect - Enhancement Plan

**Date**: December 23, 2025
**Branch**: `claude/review-status-plan-hEqvw`
**Goal**: Bridge the gap between current implementation and production-ready requirements

---

## Overview

This plan outlines the specific enhancements needed to take MojiTax Connect from its current 85% completion state to a fully production-ready platform. Each phase addresses specific gaps identified in the status report.

---

## Phase 1: Fix Critical Test Suite Failures

**Priority**: CRITICAL
**Status**: Blocking deployment

### Problem
16 out of 62 tests are failing due to API naming mismatches between test expectations and actual implementation.

### Analysis
Based on codebase exploration, the test files expect:
- `support.create()` but API has `support.createTicket()`
- `support.getById()` but API has `support.getTicketById()`
- Parameter `initialMessage` but API expects `description`

### Tasks

1. **Audit test file expectations vs actual API**
   - File: `server/support.test.ts`
   - Compare each test call against `server/routers.ts` support router

2. **Standardize API naming convention**
   - Option A: Update routers.ts to match test expectations (recommended - less files to change)
   - Option B: Update test files to match router implementation

3. **Fix specific mismatches**
   ```typescript
   // In server/routers.ts - support router:
   // Change: createTicket → create
   // Change: getTicketById → getById
   // Change: parameter 'description' → 'initialMessage'
   ```

4. **Run full test suite and verify 62/62 passing**

### Deliverable
- All 62 tests passing
- No API breaking changes for existing frontend code

---

## Phase 2: Populate Knowledge Base

**Priority**: HIGH
**Dependency**: None (can run parallel with Phase 1)

### Problem
@moji chatbot always falls back to LLM because the knowledge base is empty.

### Current Implementation
- Table: `mojiKnowledgeBase` (schema exists in `drizzle/schema.ts:186-198`)
- Admin UI: `MojiSettings.tsx` component with CSV upload
- Search: `searchKnowledgeBase()` function in `server/db.ts`
- Chatbot: `chatbot.ts` searches KB before LLM

### Tasks

1. **Create sample knowledge base CSV**
   - Columns: `question`, `answer`, `category`, `tags`
   - Categories: VAT, Transfer Pricing, ADIT Exam, General Tax, Platform Help
   - Minimum 50 entries for meaningful coverage

2. **Test CSV upload workflow**
   - Login as admin → Moji Settings → Upload CSV
   - Verify entries appear in database
   - Verify search returns results

3. **Validate @moji uses KB answers**
   - Test asking questions that match KB entries
   - Verify @moji returns KB answer (not LLM)
   - Test fallback to LLM for unmatched questions

4. **Create KB maintenance documentation**
   - How to add/update entries
   - CSV format requirements
   - Category naming conventions

### Deliverable
- Knowledge base populated with 50+ Q&A entries
- @moji providing accurate tax answers from KB

---

## Phase 3: Implement Email Notifications

**Priority**: HIGH
**Dependency**: None

### Current State
- Email logs table exists: `emailLogs` (schema in `drizzle/schema.ts:220-232`)
- Email log API exists: `emailLogs.create()`, `emailLogs.getAll()`
- Notification table exists: `notifications` with `emailSent` flag
- No actual email sending implemented

### Architecture Decision

**Option A: Use SMTP/Nodemailer**
- Requires SMTP credentials configuration
- More control over email content
- Works with any email provider

**Option B: Use Third-party Email Service (SendGrid, Resend, etc.)**
- Easier setup with API keys
- Better deliverability tracking
- Built-in templates

**Recommendation**: Implement with abstraction layer to support both

### Tasks

1. **Create email service abstraction**
   ```
   server/services/email.ts
   - sendEmail(to, subject, html, text)
   - sendTemplatedEmail(template, data, to)
   - Email templates: ticket_created, admin_reply, ticket_closed
   ```

2. **Implement ticket notifications**
   - Location: `server/routers.ts` → support router
   - On `support.create`: Email admin@mojitax.com
   - On `support.reply` (admin): Email user if offline
   - On `support.close`: Email ticket transcript to user

3. **Implement post notifications**
   - On `posts.create`: Email all channel members
   - Use notification preferences (users can opt-out)
   - Track sent emails in `emailLogs` table

4. **Create email templates**
   - HTML templates for each notification type
   - Plain text fallbacks
   - Branding consistent with MojiTax

5. **Add environment configuration**
   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
   - Or: SENDGRID_API_KEY / RESEND_API_KEY
   - FROM_EMAIL address

### Deliverable
- Email notifications working for support tickets
- Email distribution for posts
- Proper logging in emailLogs table

---

## Phase 4: Integrate mojitax.co.uk Authentication

**Priority**: CRITICAL
**Dependency**: Requires API credentials from mojitax.co.uk

### Current State
- Guest authentication works (name-based)
- OAuth infrastructure exists via Manus SDK
- Users table supports external users: `openId`, `loginMethod`

### Architecture Decision

**Option A: OAuth 2.0 Integration**
- Learnworlds supports OAuth 2.0
- Full SSO experience
- User auto-sync on login

**Option B: API Token Verification**
- User provides mojitax.co.uk API token
- Backend verifies token with Learnworlds API
- Simpler implementation, less seamless UX

**Recommendation**: OAuth 2.0 if mojitax.co.uk supports it, otherwise API verification

### Tasks

1. **Research mojitax.co.uk/Learnworlds API**
   - Authentication endpoints
   - User profile API
   - Course enrollment API
   - Available OAuth scopes

2. **Implement authentication flow**
   ```
   client/src/components/MojitaxLogin.tsx - Login button
   server/routers.ts → auth router:
   - auth.initMojitaxLogin - Start OAuth flow
   - auth.mojitaxCallback - Handle callback
   - auth.verifyMojitaxToken - Verify API token
   ```

3. **Sync user profiles**
   - Pull name, email from Learnworlds
   - Map course enrollments to channel memberships
   - Sync on each login

4. **Restrict posting to verified users**
   - Update `protectedProcedure` to check loginMethod
   - Allow read-only for guests
   - Full access for mojitax.co.uk users

5. **Maintain guest access for browsing**
   - Guests can view public channels
   - Guests can view posts (read-only)
   - Guests prompted to login to post/chat

### Deliverable
- Production authentication with mojitax.co.uk
- User profile sync
- Appropriate access controls

---

## Phase 5: User Ticket Management UI

**Priority**: MEDIUM
**Dependency**: Phase 3 (for reply notifications)

### Current State
- Backend: `support.getMyTickets()` exists (implied from router structure)
- Frontend: No UI for users to view their tickets
- Users create tickets via "Request Human Agent" button

### Tasks

1. **Add "My Tickets" sidebar section**
   - Location: `client/src/components/ChatLayout.tsx`
   - Show under support channels
   - Badge with open ticket count

2. **Create ticket list component**
   ```
   client/src/components/MyTicketsList.tsx
   - List all user's tickets
   - Status badges: open (yellow), in-progress (blue), closed (green)
   - Sort by lastMessageAt descending
   - Click to expand conversation
   ```

3. **Create ticket detail view**
   ```
   client/src/components/TicketDetail.tsx
   - Show ticket subject and status
   - Display full conversation history
   - Reply input (if not closed)
   - Close button (user can close own tickets)
   ```

4. **Add notification badge**
   - Highlight when admin replies
   - Clear on ticket view
   - Use existing notifications table

5. **Socket.io integration**
   - Real-time updates when admin replies
   - Update ticket status in real-time

### Deliverable
- Users can view all their support tickets
- Users see ticket status and history
- Real-time notification on admin reply

---

## Phase 6: Posts Integration Enhancement

**Priority**: MEDIUM
**Dependency**: Phase 3 (for email distribution)

### Current State
- Backend: Posts API complete (`posts.create`, `posts.getByType`, etc.)
- Frontend: `CreatePostModal.tsx` exists
- Posts render in chat with special styling
- Missing: Post management, email distribution

### Tasks

1. **Enhance post creation dialog**
   - Location: `client/src/components/CreatePostModal.tsx`
   - Add type selector: Event, Announcement, Article, Newsletter
   - Conditional fields based on type:
     - Event: eventDate, eventLocation
     - Announcement: priorityLevel
     - Article: tags, featuredImage
     - Newsletter: scheduledFor

2. **Add post management UI (admin)**
   ```
   client/src/components/PostManagement.tsx
   - List all posts with filters
   - Edit button → opens modal with existing data
   - Delete button with confirmation
   - Pin/unpin toggle
   ```

3. **Enhance post rendering in chat**
   - Location: `client/src/components/MessageList.tsx`
   - Special card styling for each post type
   - Event: Show date/location prominently
   - Announcement: Color-code by priority
   - Article: Show featured image preview
   - Newsletter: Show distribution status

4. **Email distribution (requires Phase 3)**
   - On post create: Queue emails to channel members
   - Show distribution progress in UI
   - Log all sends in emailLogs

### Deliverable
- Full post CRUD with type-specific fields
- Beautiful post rendering in chat
- Email distribution on post creation

---

## Phase 7: Rate Limiting & Security

**Priority**: MEDIUM
**Dependency**: None

### Current State
- No rate limiting implemented
- Basic input validation via Zod schemas
- tRPC provides some CSRF protection
- No XSS sanitization

### Tasks

1. **Implement rate limiting middleware**
   ```
   server/middleware/rateLimit.ts
   - Per-user rate limits:
     - Messages: 10/minute
     - Ticket creation: 3/hour
     - @moji mentions: 5/minute
   - IP-based limits for unauthenticated requests
   - Use in-memory store (or Redis for scale)
   ```

2. **Add input sanitization**
   ```
   server/utils/sanitize.ts
   - sanitizeHtml() - Remove XSS vectors
   - sanitizeMarkdown() - Safe markdown only
   - Apply to: message content, ticket content, post content
   ```

3. **Enhance CSRF protection**
   - Verify tRPC CSRF handling is enabled
   - Add CSRF tokens to non-tRPC forms
   - Validate Origin header on mutations

4. **Add abuse reporting**
   ```
   server/routers.ts → moderation router:
   - moderation.reportMessage
   - moderation.reportUser
   - Admin UI to review reports
   ```

5. **Security headers**
   - Content-Security-Policy
   - X-Frame-Options
   - X-Content-Type-Options
   - Implement in Express middleware

### Deliverable
- Rate limiting prevents spam
- XSS/injection attacks mitigated
- Abuse reporting system

---

## Phase 8: Final Testing & Polish

**Priority**: HIGH
**Dependency**: All previous phases

### Tasks

1. **Full test suite verification**
   - Run all 62+ tests
   - Add new tests for added features
   - Target: 100% pass rate

2. **Manual testing checklist**
   - [ ] Guest can browse public channels
   - [ ] User can login via mojitax.co.uk
   - [ ] User can send messages in channels
   - [ ] @moji responds with KB answers
   - [ ] @moji escalates to human when needed
   - [ ] User can create support ticket
   - [ ] Admin receives ticket notification
   - [ ] Admin can reply to ticket
   - [ ] User receives reply notification
   - [ ] User can view their tickets
   - [ ] Admin can create all post types
   - [ ] Posts render correctly in chat
   - [ ] Email notifications sent

3. **Load testing**
   - Simulate 100+ concurrent users
   - WebSocket connection stability
   - Database query performance
   - @moji response times

4. **Security audit**
   - Penetration testing
   - Dependency vulnerability scan
   - Code review for security issues

5. **Documentation**
   - API documentation
   - Admin user guide
   - Deployment guide

### Deliverable
- Production-ready platform
- All features tested and verified
- Documentation complete

---

## Implementation Priority Matrix

| Phase | Priority | Effort | Dependencies | Can Parallelize |
|-------|----------|--------|--------------|-----------------|
| 1. Fix Tests | CRITICAL | Low | None | Yes |
| 2. Knowledge Base | HIGH | Low | None | Yes |
| 3. Email Notifications | HIGH | Medium | None | Yes |
| 4. mojitax.co.uk Auth | CRITICAL | High | API Credentials | No |
| 5. User Ticket UI | MEDIUM | Medium | Phase 3 | After Phase 3 |
| 6. Posts Enhancement | MEDIUM | Medium | Phase 3 | After Phase 3 |
| 7. Security | MEDIUM | Medium | None | Yes |
| 8. Final Testing | HIGH | Medium | All phases | No |

---

## Parallel Execution Strategy

**Week 1: Foundation** (Phases 1, 2, 3, 7 in parallel)
- Developer A: Fix test suite (Phase 1)
- Developer B: Knowledge base content (Phase 2)
- Developer A+B: Email notifications (Phase 3)
- Background: Security hardening (Phase 7)

**Week 2: Authentication** (Phase 4)
- Requires mojitax.co.uk API credentials
- Full focus on authentication integration
- Test thoroughly before proceeding

**Week 3: User Features** (Phases 5, 6 in parallel)
- User ticket management UI
- Posts integration enhancement
- Both depend on email notifications (Phase 3)

**Week 4: Polish** (Phase 8)
- Final testing
- Bug fixes
- Documentation
- Deployment

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| mojitax.co.uk API unavailable | Implement mock API for testing, deploy with guest auth initially |
| Email service issues | Multiple provider support, fallback to console logging |
| Test suite regressions | CI/CD pipeline with mandatory passing tests |
| Performance issues at scale | Load testing before launch, horizontal scaling plan |
| Security vulnerabilities | Regular dependency updates, security audit |

---

## Success Metrics

### MVP (Minimum Viable Product)
- [x] Real-time messaging works
- [x] @moji chatbot responds
- [x] Support tickets work
- [ ] 100% test pass rate
- [ ] mojitax.co.uk auth working
- [ ] Email notifications working
- [ ] Knowledge base populated

### Production Ready
- [ ] All MVP criteria met
- [ ] User ticket management UI
- [ ] Full posts integration
- [ ] Rate limiting & security
- [ ] Load tested (100+ users)
- [ ] Documentation complete

---

## File Locations Reference

| Component | File Location |
|-----------|---------------|
| tRPC Routers | `server/routers.ts` |
| Database Functions | `server/db.ts` |
| Chatbot Logic | `server/chatbot.ts` |
| Socket.IO Server | `server/socket.ts` |
| Database Schema | `drizzle/schema.ts` |
| Main Layout | `client/src/components/ChatLayout.tsx` |
| Message Input | `client/src/components/MessageInput.tsx` |
| Support Inbox | `client/src/components/SupportInbox.tsx` |
| Create Post Modal | `client/src/components/CreatePostModal.tsx` |
| Auth Context | `client/src/_core/providers/auth-context.tsx` |
| Socket Context | `client/src/contexts/SocketContext.tsx` |
| Test Files | `server/*.test.ts` |

---

**Next Steps**: Begin Phase 1 (Fix Test Suite) and Phase 2 (Knowledge Base) in parallel.

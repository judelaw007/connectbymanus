# MojiTax Connect - Production Plan

> **Last Updated:** December 2024
> **Status:** In Development
> **Target:** connect.mojitax.co.uk
> **Hosting:** Replit
> **Expected Users:** ~1,800 members

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete |
| 🟡 | In Progress |
| 🔴 | Pending |
| ⏸️ | On Hold / Future Phase |

---

## TESTING STRATEGY

> **IMPORTANT:** To safely test without affecting 1,800+ real Learnworlds users

### TEST_MODE Environment Flag

When `TEST_MODE=true`:
- All emails redirect to `TEST_EMAIL_RECIPIENT` (admin's email)
- Email subjects prefixed with `[TEST]`
- Emails logged but not sent in development
- Safe to test all features without spamming real users

### Study Group Sandbox

Create a private study group with only test members:
- All messages isolated to that group
- Notifications only go to group members
- Test all features safely before production rollout

```env
# Add to .env for testing
TEST_MODE=true
TEST_EMAIL_RECIPIENT=admin@mojitax.co.uk
```

---

## HIGH-LEVEL OVERVIEW

| Phase | Description | Status | Target |
|-------|-------------|--------|--------|
| **Phase 1** | Core Infrastructure | ✅ Complete | - |
| **Phase 2** | Study Groups (Test Sandbox) | 🟡 In Progress | MVP |
| **Phase 3** | Member Authentication | 🔴 Pending | MVP |
| **Phase 4** | Chat & Messaging | 🟡 In Progress | MVP |
| **Phase 5** | Email Integration + TEST_MODE | 🔴 Pending | MVP |
| **Phase 6** | Admin Features | 🟡 In Progress | MVP |
| **Phase 7** | @moji Chatbot | 🔴 Pending | MVP |
| **Phase 8** | Security & Testing | 🔴 Pending | MVP |
| **Phase 9** | Deployment | 🔴 Pending | MVP |
| **Phase 10** | Future Enhancements | ⏸️ Future | Post-MVP |

---

## DETAILED TASK BREAKDOWN

### Phase 1: Core Infrastructure ✅

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1 | Supabase database setup | ✅ | PostgreSQL with Supabase JS client |
| 1.2 | Database schema & migrations | ✅ | 10 tables, RLS policies |
| 1.3 | Seed data (channels, KB) | ✅ | 7 channels, knowledge base entries |
| 1.4 | Admin authentication (Supabase Auth) | ✅ | /auth/admin working |
| 1.5 | Environment configuration | ✅ | Supabase keys configured |

---

### Phase 2: Study Groups (Test Sandbox) 🟡

> **Priority:** HIGH - Enables safe testing of all features

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | Create study group (admin) | 🔴 | POST /api/groups - name, description |
| 2.2 | Join/leave study group | 🔴 | Member can request to join |
| 2.3 | Invite members to group | 🔴 | Admin/owner can invite by email |
| 2.4 | Group member list | 🔴 | Show members in group sidebar |
| 2.5 | Group chat messages | 🔴 | Messages scoped to group members |
| 2.6 | Group settings (owner) | 🔴 | Edit name, description, archive |

**Database:** Uses existing `channels` table with `type = 'study_group'`

**Testing Flow:**
1. Admin creates "Test Study Group"
2. Admin adds their test email as member
3. All features tested within this isolated group
4. No impact on other 1,800 members

---

### Phase 3: Member Authentication 🔴

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | Learnworlds API integration | 🔴 | Verify member exists via API |
| 3.2 | Email verification flow | 🔴 | 6-digit code sent to member email |
| 3.3 | Session management (30 days) | 🔴 | JWT token with 30-day expiry |
| 3.4 | Re-verification flow | 🔴 | After 30 days, re-verify email |
| 3.5 | Login/logout UI | 🔴 | Member-facing auth pages |

**Technical Details:**
- API Credentials: Already have (reusing from other platform)
- Flow: Enter email → Verify in Learnworlds → Send 6-digit code → Verify code → Create 30-day session
- Existing members: ~1,800 in mojitax.co.uk

---

### Phase 4: Chat & Messaging 🟡

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1 | Channel list display | ✅ | Sidebar shows all channels |
| 4.2 | Message display in channels | 🟡 | Loading messages, needs refinement |
| 4.3 | Message input/send | 🔴 | Compose and send messages |
| 4.4 | Real-time updates (Socket.io) | 🟡 | Infrastructure exists, needs testing |
| 4.5 | User presence (online/offline) | 🟡 | Shows in sidebar |
| 4.6 | Message formatting | 🔴 | Basic markdown support |

---

### Phase 5: Email Integration + TEST_MODE 🔴

> **CRITICAL:** TEST_MODE must be implemented first for safe testing

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5.1 | **TEST_MODE flag** | 🔴 | Redirect all emails to test recipient |
| 5.2 | SendGrid API setup | 🔴 | API key configured |
| 5.3 | Email service with TEST_MODE | 🔴 | Check flag before sending |
| 5.4 | Create email templates | 🔴 | See template list below |
| 5.5 | Verification code email | 🔴 | 6-digit code for login |
| 5.6 | Announcement emails | 🔴 | Send to channel/group members |
| 5.7 | Event emails | 🔴 | Send with event details |
| 5.8 | Reply notification emails | 🔴 | When someone replies to your post |
| 5.9 | @mention notification emails | 🔴 | When someone mentions you |
| 5.10 | Support ticket emails | 🔴 | Ticket updates |
| 5.11 | Email logging | 🟡 | Track sent emails in DB |

**TEST_MODE Implementation:**

```typescript
// server/services/email.ts
const isTestMode = process.env.TEST_MODE === 'true';
const testRecipient = process.env.TEST_EMAIL_RECIPIENT;

async function sendEmail(to: string, subject: string, body: string) {
  if (isTestMode && testRecipient) {
    // Redirect to test recipient
    to = testRecipient;
    subject = `[TEST] ${subject}`;
  }
  // ... send via SendGrid
}
```

**SendGrid Configuration:**
- Sender: `no-reply@mojitax.com` (verified)
- Account: Ready

**Email Templates Needed:**

| Template | Trigger | Priority |
|----------|---------|----------|
| Verification Code | Member login | High |
| Announcement | Admin posts announcement | High |
| Event Notification | Admin creates event | High |
| Reply Notification | Someone replies | Medium |
| Mention Notification | Someone @mentions you | Medium |
| Support Update | Ticket status change | Medium |
| Newsletter Digest | End of month | ⏸️ Future |

---

### Phase 6: Admin Features 🟡

| # | Task | Status | Notes |
|---|------|--------|-------|
| 6.1 | Admin dashboard | 🟡 | Basic layout exists |
| 6.2 | Create announcements | 🔴 | Post type: announcement |
| 6.3 | Create events | 🔴 | Post type: event with date/location |
| 6.4 | Manage channels | 🔴 | Create/edit/archive channels |
| 6.5 | Manage study groups | 🔴 | View all groups, moderate |
| 6.6 | Knowledge base CRUD | 🟡 | Add/edit @moji Q&A |
| 6.7 | Support inbox | 🟡 | View/respond to tickets |
| 6.8 | Member management | 🔴 | View members, assign roles |

---

### Phase 7: @moji Chatbot 🔴

| # | Task | Status | Notes |
|---|------|--------|-------|
| 7.1 | Knowledge base search | 🟡 | Backend function exists |
| 7.2 | @moji mention detection | 🔴 | Detect @moji in messages |
| 7.3 | Auto-response from KB | 🔴 | Match question → return answer |
| 7.4 | Support ticket escalation | 🔴 | Create ticket if no KB match |
| 7.5 | Chatbot UI in support chat | 🟡 | Basic UI exists |

**Future (Post-MVP):**
- OpenAI fallback when KB doesn't have answer
- Learning from admin responses

---

### Phase 8: Security & Testing 🔴

| # | Task | Status | Notes |
|---|------|--------|-------|
| 8.1 | Input validation | 🔴 | Sanitize all user inputs |
| 8.2 | XSS prevention | 🔴 | Escape HTML in messages |
| 8.3 | CSRF protection | 🔴 | Token validation |
| 8.4 | Rate limiting | 🔴 | Prevent API abuse |
| 8.5 | Session security review | 🔴 | Cookie flags, expiry |
| 8.6 | Error handling | 🔴 | Graceful failures, no stack traces |
| 8.7 | Integration testing | 🔴 | Key user flows |

---

### Phase 9: Deployment 🔴

| # | Task | Status | Notes |
|---|------|--------|-------|
| 9.1 | Production environment setup | 🔴 | Replit deployment config |
| 9.2 | Custom domain setup | 🔴 | connect.mojitax.co.uk |
| 9.3 | SSL certificate | 🔴 | HTTPS (Replit handles) |
| 9.4 | Production env variables | 🔴 | All secrets configured |
| 9.5 | Health check endpoint | 🔴 | /api/health |
| 9.6 | Database backup strategy | 🔴 | Supabase automatic backups |

---

### Phase 10: Future Enhancements ⏸️

| # | Task | Status | Notes |
|---|------|--------|-------|
| 10.1 | Newsletter system | ⏸️ | Monthly digest emails |
| 10.2 | OpenAI @moji fallback | ⏸️ | LLM when KB has no answer |
| 10.3 | File uploads | ⏸️ | Attachments in messages |
| 10.4 | Mobile app | ⏸️ | React Native wrapper |
| 10.5 | Analytics dashboard | ⏸️ | Usage metrics for admin |
| 10.6 | Advanced search | ⏸️ | Search messages/posts |

---

## MVP CHECKLIST

Minimum requirements before launch:

- [ ] **TEST_MODE working** - Safe email testing
- [ ] **Study group created** - Test sandbox ready
- [ ] Members can verify email and log in
- [ ] Members can view and send messages in channels/groups
- [ ] Real-time message updates work
- [ ] Admin can create announcements (+ email blast)
- [ ] Admin can create events (+ email blast)
- [ ] @moji responds from knowledge base
- [ ] Support tickets work
- [ ] Basic security measures in place
- [ ] Deployed to connect.mojitax.co.uk

---

## ENVIRONMENT VARIABLES

### Required for MVP

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Learnworlds
LEARNWORLDS_CLIENT_ID=xxx
LEARNWORLDS_CLIENT_SECRET=xxx
LEARNWORLDS_API_URL=https://api.learnworlds.com
LEARNWORLDS_SCHOOL_URL=https://mojitax.co.uk

# SendGrid
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM=no-reply@mojitax.com

# Session
SESSION_SECRET=xxx
JWT_SECRET=xxx

# Testing (set TEST_MODE=false for production)
TEST_MODE=true
TEST_EMAIL_RECIPIENT=admin@mojitax.co.uk

# App
NODE_ENV=production
PORT=5000
```

---

## TECH STACK SUMMARY

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, TailwindCSS |
| Backend | Express, tRPC |
| Database | Supabase (PostgreSQL) |
| Real-time | Socket.io |
| Auth (Admin) | Supabase Auth |
| Auth (Members) | Learnworlds API + Email Verification |
| Email | SendGrid |
| Hosting | Replit |
| Domain | connect.mojitax.co.uk |

---

## PROGRESS SUMMARY

| Category | ✅ Done | 🟡 In Progress | 🔴 Pending | ⏸️ Future |
|----------|---------|----------------|------------|-----------|
| Infrastructure | 5 | 0 | 0 | 0 |
| Study Groups | 0 | 0 | 6 | 0 |
| Authentication | 0 | 0 | 5 | 0 |
| Chat & Messaging | 1 | 3 | 2 | 0 |
| Email + TEST_MODE | 0 | 1 | 10 | 1 |
| Admin Features | 0 | 3 | 5 | 0 |
| @moji Chatbot | 0 | 2 | 3 | 0 |
| Security & Testing | 0 | 0 | 7 | 0 |
| Deployment | 0 | 0 | 6 | 0 |
| Enhancements | 0 | 0 | 0 | 6 |
| **TOTAL** | **6** | **9** | **44** | **7** |

---

## NEXT STEPS (Recommended Order)

1. **Phase 2: Study Groups** - Create test sandbox first
2. **Phase 5.1: TEST_MODE** - Email safety before any email features
3. **Phase 3: Member Authentication** - Learnworlds integration
4. **Phase 4: Chat completion** - Core messaging functionality
5. **Phase 5: Email Integration** - SendGrid templates
6. **Phase 6: Admin Features** - Announcements, events
7. **Phase 7: @moji** - Knowledge base responses
8. **Phase 8: Security** - Review before launch
9. **Phase 9: Deployment** - Go live!

---

## IMPLEMENTATION ORDER (Starting Now)

### Sprint 1: Safe Testing Foundation
1. ✅ Update production plan
2. 🔴 Add TEST_MODE to env.ts
3. 🔴 Create email service with TEST_MODE
4. 🔴 Implement study group creation
5. 🔴 Implement study group membership
6. 🔴 Test chat within study group

### Sprint 2: Authentication
7. 🔴 Learnworlds API client
8. 🔴 Email verification flow
9. 🔴 Member session management

### Sprint 3: Core Features
10. 🔴 Complete chat messaging
11. 🔴 Announcements + email
12. 🔴 Events + email

---

*This document will be updated as development progresses.*

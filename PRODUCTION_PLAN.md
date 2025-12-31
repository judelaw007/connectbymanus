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

## HIGH-LEVEL OVERVIEW

| Phase | Description | Status | Target |
|-------|-------------|--------|--------|
| **Phase 1** | Core Infrastructure | ✅ Complete | - |
| **Phase 2** | Member Authentication | 🔴 Pending | MVP |
| **Phase 3** | Chat & Messaging | 🟡 In Progress | MVP |
| **Phase 4** | Admin Features | 🟡 In Progress | MVP |
| **Phase 5** | Email Integration | 🔴 Pending | MVP |
| **Phase 6** | @moji Chatbot | 🔴 Pending | MVP |
| **Phase 7** | Security & Testing | 🔴 Pending | MVP |
| **Phase 8** | Deployment | 🔴 Pending | MVP |
| **Phase 9** | Enhancements | ⏸️ Future | Post-MVP |

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

### Phase 2: Member Authentication 🔴

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | Learnworlds API integration | 🔴 | Verify member exists via API |
| 2.2 | Email verification flow | 🔴 | 6-digit code sent to member email |
| 2.3 | Session management (30 days) | 🔴 | JWT token with 30-day expiry |
| 2.4 | Re-verification flow | 🔴 | After 30 days, re-verify email |
| 2.5 | Login/logout UI | 🔴 | Member-facing auth pages |

**Technical Details:**
- API Credentials: Already have (reusing from other platform)
- Flow: Enter email → Verify in Learnworlds → Send 6-digit code → Verify code → Create 30-day session
- Existing members: ~1,800 in mojitax.co.uk

---

### Phase 3: Chat & Messaging 🟡

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | Channel list display | ✅ | Sidebar shows all channels |
| 3.2 | Message display in channels | 🟡 | Loading messages, needs refinement |
| 3.3 | Message input/send | 🔴 | Compose and send messages |
| 3.4 | Real-time updates (Socket.io) | 🟡 | Infrastructure exists, needs testing |
| 3.5 | User presence (online/offline) | 🟡 | Shows in sidebar |
| 3.6 | Message formatting | 🔴 | Basic markdown support |

---

### Phase 4: Admin Features 🟡

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1 | Admin dashboard | 🟡 | Basic layout exists |
| 4.2 | Create announcements | 🔴 | Post type: announcement |
| 4.3 | Create events | 🔴 | Post type: event with date/location |
| 4.4 | Manage channels | 🔴 | Create/edit/archive channels |
| 4.5 | Knowledge base CRUD | 🟡 | Add/edit @moji Q&A |
| 4.6 | Support inbox | 🟡 | View/respond to tickets |
| 4.7 | Member management | 🔴 | View members, assign roles |

---

### Phase 5: Email Integration 🔴

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5.1 | SendGrid API setup | 🔴 | API key configured |
| 5.2 | Create email templates | 🔴 | See template list below |
| 5.3 | Announcement emails | 🔴 | Send to channel/group members |
| 5.4 | Event emails | 🔴 | Send with event details |
| 5.5 | Reply notification emails | 🔴 | When someone replies to your post |
| 5.6 | @mention notification emails | 🔴 | When someone mentions you |
| 5.7 | Support ticket emails | 🔴 | Ticket updates |
| 5.8 | Email logging | 🟡 | Track sent emails in DB |

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

### Phase 6: @moji Chatbot 🔴

| # | Task | Status | Notes |
|---|------|--------|-------|
| 6.1 | Knowledge base search | 🟡 | Backend function exists |
| 6.2 | @moji mention detection | 🔴 | Detect @moji in messages |
| 6.3 | Auto-response from KB | 🔴 | Match question → return answer |
| 6.4 | Support ticket escalation | 🔴 | Create ticket if no KB match |
| 6.5 | Chatbot UI in support chat | 🟡 | Basic UI exists |

**Future (Post-MVP):**
- OpenAI fallback when KB doesn't have answer
- Learning from admin responses

---

### Phase 7: Security & Testing 🔴

| # | Task | Status | Notes |
|---|------|--------|-------|
| 7.1 | Input validation | 🔴 | Sanitize all user inputs |
| 7.2 | XSS prevention | 🔴 | Escape HTML in messages |
| 7.3 | CSRF protection | 🔴 | Token validation |
| 7.4 | Rate limiting | 🔴 | Prevent API abuse |
| 7.5 | Session security review | 🔴 | Cookie flags, expiry |
| 7.6 | Error handling | 🔴 | Graceful failures, no stack traces |
| 7.7 | Integration testing | 🔴 | Key user flows |

---

### Phase 8: Deployment 🔴

| # | Task | Status | Notes |
|---|------|--------|-------|
| 8.1 | Production environment setup | 🔴 | Replit deployment config |
| 8.2 | Custom domain setup | 🔴 | connect.mojitax.co.uk |
| 8.3 | SSL certificate | 🔴 | HTTPS (Replit handles) |
| 8.4 | Production env variables | 🔴 | All secrets configured |
| 8.5 | Health check endpoint | 🔴 | /api/health |
| 8.6 | Database backup strategy | 🔴 | Supabase automatic backups |

---

### Phase 9: Future Enhancements ⏸️

| # | Task | Status | Notes |
|---|------|--------|-------|
| 9.1 | Study groups (private channels) | ⏸️ | Create/join private groups |
| 9.2 | Newsletter system | ⏸️ | Monthly digest emails |
| 9.3 | OpenAI @moji fallback | ⏸️ | LLM when KB has no answer |
| 9.4 | File uploads | ⏸️ | Attachments in messages |
| 9.5 | Mobile app | ⏸️ | React Native wrapper |
| 9.6 | Analytics dashboard | ⏸️ | Usage metrics for admin |
| 9.7 | Advanced search | ⏸️ | Search messages/posts |

---

## MVP CHECKLIST

Minimum requirements before launch:

- [ ] Members can verify email and log in
- [ ] Members can view and send messages in channels
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
| Authentication | 0 | 0 | 5 | 0 |
| Chat & Messaging | 1 | 3 | 2 | 0 |
| Admin Features | 0 | 3 | 4 | 0 |
| Email Integration | 0 | 1 | 7 | 1 |
| @moji Chatbot | 0 | 2 | 3 | 0 |
| Security & Testing | 0 | 0 | 7 | 0 |
| Deployment | 0 | 0 | 6 | 0 |
| Enhancements | 0 | 0 | 0 | 7 |
| **TOTAL** | **6** | **9** | **34** | **8** |

---

## NEXT STEPS (Recommended Order)

1. **Phase 2: Member Authentication** - Critical path, blocks everything else
2. **Phase 3: Chat completion** - Core functionality
3. **Phase 5: Email Integration** - SendGrid templates, announcement/event emails
4. **Phase 4: Admin Features** - Complete announcement/event creation
5. **Phase 6: @moji** - Knowledge base responses
6. **Phase 7: Security** - Review before launch
7. **Phase 8: Deployment** - Go live!

---

*This document will be updated as development progresses.*

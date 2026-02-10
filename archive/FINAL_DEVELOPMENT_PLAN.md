# MojiTax Connect - Final Development Plan

**Date**: December 23, 2025
**Based on**: Complete codebase audit (not just status reports)

---

## Actual Completion Status

After reviewing the actual code, the platform is **~55% complete**, NOT 15% or 85%.

### What's Actually Working

| Component                 | Completion | Notes                                    |
| ------------------------- | ---------- | ---------------------------------------- |
| Backend APIs (routers.ts) | 95%        | All endpoints implemented                |
| Database Schema           | 100%       | All 10 tables with indexes               |
| Chatbot + LLM             | 90%        | Works, needs KB content                  |
| Admin Support Inbox       | 90%        | Full CRUD UI works                       |
| Create Post Modal         | 95%        | All 4 types work                         |
| Channel Chat              | 80%        | Send/receive messages works              |
| Socket.io                 | 70%        | Connection works, typing indicators emit |

### What's Missing (Critical)

| Issue                                           | Impact                  | Fix Effort |
| ----------------------------------------------- | ----------------------- | ---------- |
| Admin login has NO password                     | Anyone can access admin | 2-3 hours  |
| "Chat with Team MojiTax" does nothing for users | Core feature broken     | 4-6 hours  |
| No email sending                                | Admins get no alerts    | 4-6 hours  |
| No ToS/Privacy pages                            | Legal blocker           | 2-3 hours  |
| Online users sidebar shows fake data            | UX issue                | 1-2 hours  |
| XSS protection unknown                          | Security risk           | 2-4 hours  |

---

## Phase 1: Critical Security Fixes (BLOCKING)

### 1.1 Admin Password Protection

**Current Code** (`client/src/pages/AdminLogin.tsx:11-21`):

```typescript
// THIS IS INSECURE - NO PASSWORD CHECK!
const handleAdminLogin = () => {
  localStorage.setItem("admin_session", "true");
  setTimeout(() => {
    setLocation("/admin");
  }, 500);
};
```

**Fix Required**:

1. Add password input field to AdminLogin.tsx
2. Create `auth.adminLogin` endpoint in routers.ts
3. Use environment variable `ADMIN_PASSWORD`
4. Hash compare password (bcrypt or similar)
5. Set HTTP-only session cookie
6. Check session in Admin.tsx before rendering

**Files to modify**:

- `client/src/pages/AdminLogin.tsx`
- `server/routers.ts` (add auth.adminLogin)
- `client/src/pages/Admin.tsx` (add session check)

---

### 1.2 Terms of Service & Privacy Policy

**Current State**: Pages don't exist

**Fix Required**:

1. Create `client/src/pages/TermsOfService.tsx`
2. Create `client/src/pages/PrivacyPolicy.tsx`
3. Add routes in `client/src/App.tsx`
4. Add footer links in ChatLayout.tsx

---

### 1.3 XSS Protection

**Current State**: Unknown - content rendered without sanitization

**Fix Required**:

1. Install DOMPurify
2. Sanitize all user-generated content before rendering
3. Add Content-Security-Policy header
4. Test with XSS payloads

---

## Phase 2: Fix "Chat with Team MojiTax" for Users

**Current Code** (`client/src/components/ChatLayout.tsx:209-218`):

```typescript
onClick={() => {
  if (isAdminMode) {
    // For admin: show support inbox
    setShowSupportInbox(true);
    setSelectedChannelId(null);
  } else {
    // For users: TODO - show support chat channel
    // For now, do nothing
  }
```

**Fix Required**:

1. Create support channel per user (or single support channel)
2. Show welcome message explaining @moji
3. Auto-trigger @moji responses (already works in backend)
4. Add "Request Human Agent" button
5. Create support ticket on escalation

**Implementation**:

```typescript
// When user clicks "Chat with Team MojiTax":
1. Open a support chat panel (like admin but simpler)
2. Show welcome message from @moji
3. User types question → @moji auto-responds
4. If @moji can't help → show "Request Human Agent" button
5. Button opens modal → user enters subject/description
6. Creates support ticket via support.create()
```

**Files to modify**:

- `client/src/components/ChatLayout.tsx`
- `client/src/components/UserSupportChat.tsx` (new)

---

## Phase 3: Email Notifications

**Current State**:

- Email logs table exists
- API to create logs exists
- NO actual email sending

**Fix Required**:

1. Create `server/services/email.ts`
2. Integrate with SMTP or SendGrid/Resend
3. Call from routers.ts when:
   - Ticket created → email admin@mojitax.com
   - Admin replies → email user (if offline)
   - Ticket closed → email transcript to user
   - High-priority announcement → email all users

**Files to create/modify**:

- `server/services/email.ts` (new)
- `server/routers.ts` (add email calls)

---

## Phase 4: Fix Online Users Display

**Current Code** (`client/src/components/ChatLayout.tsx:376-383`):

```typescript
{/* Online Users */}
<div>
  <h3 className="font-semibold mb-3">Online Users</h3>
  <div className="space-y-2">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center gap-2">
        <div className="status-online"></div>
        <span className="text-sm">User {i}</span>  // FAKE DATA!
      </div>
    ))}
  </div>
</div>
```

**Fix Required**:

1. Use `onlineUsers` from SocketContext
2. Fetch user names for online user IDs
3. Display real online users

---

## Phase 5: mojitax.co.uk Authentication

**Current State**:

- Uses Manus platform OAuth (works for Manus users)
- getLoginUrl() points to Manus OAuth portal
- NOT connected to mojitax.co.uk

**Requirement**: Users must authenticate via mojitax.co.uk (Learnworlds LMS)

**Options**:

1. **Learnworlds SSO** - If they support OAuth/SAML
2. **API Token Verification** - User provides API token, backend verifies
3. **Keep Manus OAuth** - Accept Manus users as valid (temporary)

**Needs**: API credentials and documentation from mojitax.co.uk

---

## Phase 6: User Ticket Management

**Current State**:

- Backend: support.getById works
- Frontend: No UI for users to see their tickets

**Fix Required**:

1. Add "My Tickets" section to sidebar or user menu
2. List user's tickets with status
3. Allow viewing conversation history
4. Notification when admin replies

---

## Implementation Priority

| Phase                  | Priority | Effort | Blocker?           |
| ---------------------- | -------- | ------ | ------------------ |
| 1.1 Admin Password     | CRITICAL | 2-3h   | YES - Security     |
| 1.2 ToS/Privacy        | CRITICAL | 2-3h   | YES - Legal        |
| 1.3 XSS Protection     | CRITICAL | 2-4h   | YES - Security     |
| 2. User Support Chat   | HIGH     | 4-6h   | YES - Core feature |
| 3. Email Notifications | HIGH     | 4-6h   | Soft blocker       |
| 4. Online Users Fix    | MEDIUM   | 1-2h   | No                 |
| 5. mojitax Auth        | CRITICAL | 6-10h  | Needs external API |
| 6. User Tickets UI     | MEDIUM   | 3-4h   | No                 |

---

## Execution Order

### Sprint 1: Security + Legal (1-2 days)

- [ ] 1.1 Admin password protection
- [ ] 1.2 ToS/Privacy pages
- [ ] 1.3 XSS protection audit

### Sprint 2: Core Feature Fix (2-3 days)

- [ ] 2. Fix "Chat with Team MojiTax" for users
- [ ] 3. Implement email notifications
- [ ] 4. Fix online users display

### Sprint 3: Authentication (3-5 days)

- [ ] 5. mojitax.co.uk integration (pending API access)

### Sprint 4: User Features (2-3 days)

- [ ] 6. User ticket management UI
- [ ] Bug fixes and polish

### Ongoing

- [ ] Knowledge base content (non-technical)
- [ ] Testing and QA

---

## Key Files Reference

| Purpose              | File                                     |
| -------------------- | ---------------------------------------- |
| All API endpoints    | `server/routers.ts`                      |
| Database functions   | `server/db.ts`                           |
| Chatbot logic        | `server/chatbot.ts`                      |
| Main chat UI         | `client/src/components/ChatLayout.tsx`   |
| Admin login (BROKEN) | `client/src/pages/AdminLogin.tsx`        |
| Support inbox        | `client/src/components/SupportInbox.tsx` |
| Socket context       | `client/src/contexts/SocketContext.tsx`  |
| Database schema      | `drizzle/schema.ts`                      |

---

## Summary

The platform is **more complete than the audit suggested** but has **critical security holes**:

1. **Backend is solid** - 95% complete
2. **Admin features work** - 80% complete
3. **Security is broken** - Admin has no password
4. **User support chat doesn't work** - Core feature missing
5. **No email sending** - Notifications broken
6. **Legal pages missing** - ToS/Privacy

**Realistic timeline to production-ready**: 2-3 weeks of focused development.

---

**Next Step**: Fix admin password protection immediately - this is a critical security vulnerability.

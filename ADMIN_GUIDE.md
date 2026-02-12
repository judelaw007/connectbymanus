# MojiTax Connect — Admin Guide

This guide covers **everything an administrator needs** to set up, configure, operate, and troubleshoot MojiTax Connect.

---

## Table of Contents

1. [Initial Setup & Environment](#1-initial-setup--environment)
2. [Database Setup](#2-database-setup)
3. [Admin Login](#3-admin-login)
4. [Admin Dashboard — Overview](#4-admin-dashboard--overview)
5. [Chat Mode (Admin)](#5-chat-mode-admin)
6. [Managing Channels](#6-managing-channels)
7. [Creating Posts](#7-creating-posts)
8. [User Management & Moderation](#8-user-management--moderation)
9. [Group Moderation](#9-group-moderation)
10. [Support Inbox](#10-support-inbox)
11. [@moji Chatbot Settings](#11-moji-chatbot-settings)
12. [Email System & Logs](#12-email-system--logs)
13. [Chat Analytics](#13-chat-analytics)
14. [Event Invitees](#14-event-invitees)
15. [Platform Settings](#15-platform-settings)
16. [Learnworlds Integration](#16-learnworlds-integration)
17. [Core Data Points & Expected Outcomes](#17-core-data-points--expected-outcomes)
18. [Testing & Troubleshooting](#18-testing--troubleshooting)
19. [Architecture Quick Reference](#19-architecture-quick-reference)

---

## 1. Initial Setup & Environment

### Required environment variables

All secrets must be configured before the app will function. Use the `.env.example` file as a template.

| Variable                    | Purpose                                                      | Where to get it                                                 |
| --------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| `VITE_SUPABASE_URL`         | Supabase project URL                                         | Supabase Dashboard > Settings > API                             |
| `VITE_SUPABASE_ANON_KEY`    | Supabase anonymous key (client-side)                         | Supabase Dashboard > Settings > API                             |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side, bypasses RLS)        | Supabase Dashboard > Settings > API                             |
| `LEARNWORLDS_CLIENT_ID`     | Learnworlds API client ID                                    | Learnworlds dashboard > API settings                            |
| `LEARNWORLDS_CLIENT_SECRET` | Learnworlds API client secret                                | Learnworlds dashboard > API settings                            |
| `LEARNWORLDS_SCHOOL_ID`     | Learnworlds school subdomain (e.g., `mojitax`)               | Your Learnworlds URL                                            |
| `SENDGRID_API_KEY`          | SendGrid email API key                                       | [SendGrid API Keys](https://app.sendgrid.com/settings/api_keys) |
| `EMAIL_FROM`                | Sender email for outgoing emails                             | e.g., `no-reply@mojitax.com`                                    |
| `JWT_SECRET`                | Secret for signing JWT session tokens (min 32 chars)         | Generate a random string                                        |
| `SESSION_SECRET`            | Express session secret                                       | Generate a random string                                        |
| `ADMIN_PASSWORD`            | Password for admin login                                     | Choose a strong password                                        |
| `OPENAI_API_KEY`            | OpenAI API key for @moji chatbot                             | [OpenAI API](https://platform.openai.com/api-keys)              |
| `OWNER_OPEN_ID`             | The open_id of the platform owner (auto-assigned admin role) | Set to `admin-mojitax` or your OAuth ID                         |

### Test mode variables

| Variable               | Purpose                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `TEST_MODE`            | Set `true` to redirect ALL emails to the test recipient. Set `false` for production. |
| `TEST_EMAIL_RECIPIENT` | Email address that receives all emails when TEST_MODE is enabled                     |

**CRITICAL for production:** Set `TEST_MODE=false` before going live. Otherwise no real users will receive emails.

### Learnworlds school identity

Set **one** of these (checked in priority order):

1. `LEARNWORLDS_API_URL` — Full API base URL (e.g., `https://mojitax.learnworlds.com/admin/api/v2`)
2. `LEARNWORLDS_SCHOOL_URL` — School URL (e.g., `https://mojitax.learnworlds.com`)
3. `LEARNWORLDS_SCHOOL_ID` — Just the subdomain (e.g., `mojitax`)

### Running the app

```bash
pnpm install              # Install dependencies
npm run dev               # Development server (port 5000, hot reload)
npm run build             # Build for production
npm run start             # Run production build
npm run check             # TypeScript type checking
npm run test              # Run all tests
```

---

## 2. Database Setup

The database is **Supabase (PostgreSQL)**. There are 16 migration files in `supabase/migrations/`.

### Fresh deployment (clean database)

Use the combined reset script:

1. Open **Supabase Dashboard > SQL Editor**.
2. Copy the contents of `supabase/reset_database.sql`.
3. Paste and click **Run**.

This drops everything and rebuilds the full schema with seed data:

- 1 admin user (`admin-mojitax`)
- 1 default channel (#General)
- 12 knowledge base entries for @moji
- 1 welcome message
- 9 platform settings (including admin hours)

### Running individual migrations

If you need to apply a single migration (e.g., after an update):

1. Open Supabase SQL Editor.
2. Copy the migration file content (e.g., `supabase/migrations/016_channel_multi_entity_links.sql`).
3. Run it.

### Key database tables

| Table                       | Purpose                                        |
| --------------------------- | ---------------------------------------------- |
| `users`                     | All user accounts (members + admins)           |
| `channels`                  | Topic channels, study groups, support channels |
| `channel_members`           | Membership + roles per channel                 |
| `messages`                  | All chat messages                              |
| `posts`                     | Events, announcements, articles, newsletters   |
| `support_tickets`           | User support tickets                           |
| `support_messages`          | Messages within support tickets                |
| `notifications`             | In-app notifications                           |
| `moji_knowledge_base`       | Q&A pairs for @moji chatbot                    |
| `email_logs`                | Record of every email sent                     |
| `platform_settings`         | Key-value platform configuration               |
| `verification_codes`        | Login codes (auto-cleaned hourly)              |
| `event_rsvps`               | RSVP/interest registrations for events         |
| `channel_learnworlds_links` | Channel-to-Learnworlds entity mappings         |

---

## 3. Admin Login

### URL

Navigate to `/admin/login` (or `/auth/admin`).

### Login methods

1. **Password login** — Enter the password set in `ADMIN_PASSWORD` environment variable.
2. **Google OAuth** (optional) — If Supabase Auth is configured with Google provider, admins with `@mojitax.com` email addresses can sign in via Google.

### After login

You are redirected to the **Admin Dashboard** at `/admin`.

---

## 4. Admin Dashboard — Overview

The admin dashboard has a **sidebar navigation** on the left and a **content area** on the right. There is also a **toggle switch** in the header to switch between **Dashboard Mode** and **Chat Mode**.

### Dashboard sidebar sections

| Section               | What it does                            |
| --------------------- | --------------------------------------- |
| **Overview**          | Summary stats + quick action buttons    |
| **Users**             | Full user directory with details        |
| **Email Logs**        | All sent emails with status and filters |
| **Moji Settings**     | Configure @moji knowledge base          |
| **Chat Analytics**    | Channel activity metrics and charts     |
| **User Moderation**   | Suspend/unsuspend users                 |
| **Group Moderation**  | Suspend/unsuspend study groups          |
| **Platform Settings** | Global platform configuration           |
| **Event Invitees**    | View RSVPs and interest for events      |

### Overview stats cards

| Metric              | Description                             |
| ------------------- | --------------------------------------- |
| **Total Users**     | Number of registered users              |
| **Active Channels** | Number of public channels               |
| **Messages Today**  | Messages sent across all channels today |
| **Emails Sent**     | Emails sent this week                   |

### Quick actions

- **Go to Chat Mode** — Switch to the full chat interface (with unread badge count)
- **Configure Moji** — Jump to @moji settings
- **View Email Logs** — Jump to email logs
- **Moderate Users** — Jump to user moderation
- **Manage Groups** — Jump to group moderation

---

## 5. Chat Mode (Admin)

Toggle the **Dashboard/Chat switch** in the header to enter Chat Mode. This gives you the full chat interface with admin privileges.

### What admins can do in Chat Mode

- **Read and send messages** in all channels
- **Create Channels** — The "Create Channel" button appears at the bottom of the sidebar
- **Create Posts** — The "Create Post" button appears at the bottom of the sidebar
- **Pin messages** — Pin/unpin important messages in any channel
- **Access Support Inbox** — The sidebar shows "Support Inbox" instead of "Chat with Team MojiTax"
- **Manage channel settings** — Gear icon appears on hover next to each channel

### Admin visual indicators

- A **yellow "ADMIN MODE" badge** in the header
- A **pink accent bar** at the top of the page
- A **purple-tinted sidebar** gradient

---

## 6. Managing Channels

### Creating a topic channel

1. In Chat Mode, click **Create Channel** at the bottom of the sidebar.
2. Enter:
   - **Channel Name** (required)
   - **Description** (optional)
3. Optionally link **Learnworlds entities** (courses, bundles, subscriptions) — this auto-enrols members who have purchased those products.
4. Click **Create**.

The new channel appears immediately in the sidebar for all users.

### Channel types

| Type          | Created by         | Visibility                       |
| ------------- | ------------------ | -------------------------------- |
| `general`     | System (seed data) | Public, everyone auto-joined     |
| `topic`       | Admin              | Public, users can see and join   |
| `study_group` | Any member         | Public or private (invite code)  |
| `support`     | System             | Per-user support ticket channels |

### Learnworlds entity linking

When creating or editing a channel, you can link it to one or more Learnworlds products:

- **Courses** — Members enrolled in the course get auto-access
- **Bundles** — Members who purchased the bundle get auto-access
- **Subscriptions** — Active subscribers get auto-access

Links are stored in the `channel_learnworlds_links` table (many-to-many).

---

## 7. Creating Posts

### How to create a post

1. In Chat Mode, click **Create Post** at the bottom of the sidebar.
2. Select the **post type**: Event, Announcement, Article, or Newsletter.
3. Fill in the fields (see below per type).
4. Choose a **target channel** to post in, or select **Test Send** to preview via email first.
5. Click **Create Post** (or **Send Test**).

### Post type fields

#### Event

| Field          | Required | Description                                    |
| -------------- | -------- | ---------------------------------------------- |
| Title          | Yes      | Event name                                     |
| Content        | Yes      | Event details (rich text editor)               |
| Event Date     | Yes      | Date and time of the event                     |
| Event Location | No       | Physical or virtual location                   |
| Reminder Hours | No       | Hours before event to auto-send reminder email |
| Target Channel | Yes      | Channel where the event post appears           |

#### Announcement

| Field          | Required | Description                            |
| -------------- | -------- | -------------------------------------- |
| Title          | Yes      | Announcement headline                  |
| Content        | Yes      | Announcement body (rich text)          |
| Priority       | Yes      | low / medium / high / urgent           |
| Target Channel | Yes      | Channel where the announcement appears |

#### Article

| Field          | Required | Description                                |
| -------------- | -------- | ------------------------------------------ |
| Title          | Yes      | Article title                              |
| Content        | Yes      | Article body (rich text)                   |
| Author         | No       | Custom author name (defaults to "MojiTax") |
| Tags           | No       | Comma-separated tags for categorisation    |
| Featured Image | No       | Image URL                                  |
| Target Channel | Yes      | Channel where the article appears          |

#### Newsletter

| Field          | Required | Description                          |
| -------------- | -------- | ------------------------------------ |
| Title          | Yes      | Newsletter subject                   |
| Content        | Yes      | Newsletter body (rich text)          |
| Target Channel | Yes      | Channel where the newsletter appears |

### Test send

Before publishing to a real channel, you can:

1. Select **"Send Test Email"** instead of a channel.
2. Enter a test email address.
3. Click **Send Test** to receive a preview email.
4. Once satisfied, change the target to a real channel and publish.

### What happens when a post is created

1. A formatted **message** is created in the selected channel.
2. **Email notifications** are sent to all channel members (subject to their notification preferences and TEST_MODE setting).
3. The post appears in the **Categories** section of the right sidebar.

---

## 8. User Management & Moderation

### Users section

The **Users** tab shows all registered users with:

- Name, email, role, login method
- Account creation date
- Last sign-in time
- Suspension status

### User moderation

The **User Moderation** tab provides tools to manage problematic users:

#### Suspending a user

1. Find the user in the list.
2. Click **Suspend**.
3. Enter a **suspension reason** (required).
4. Optionally set a **suspension end date** (for temporary suspensions).
5. Confirm.

**What happens when a user is suspended:**

- They cannot sign in.
- Their existing sessions are invalidated.
- They see a "suspended" message when trying to log in.
- Their messages remain visible but they cannot send new ones.

#### Unsuspending a user

1. Find the suspended user (they'll have a red "Suspended" badge).
2. Click **Unsuspend**.
3. The user can immediately sign in again.

### Promoting a user to admin

The platform owner (identified by `OWNER_OPEN_ID`) can promote users to admin role via the API endpoint `admin.promoteUser`.

---

## 9. Group Moderation

The **Group Moderation** tab lets admins manage study groups created by members.

### Viewing all groups

See all study groups with:

- Group name, description, type (public/private)
- Creator, member count
- Creation date
- Suspension status

### Suspending a group

If a group violates community guidelines:

1. Click **Suspend** on the group.
2. Enter a **reason**.
3. The group becomes inaccessible to all members.
4. Members see a "suspended" notice.

### Unsuspending a group

Click **Unsuspend** to restore access for all members.

---

## 10. Support Inbox

### Accessing the inbox

In Chat Mode, click **"Support Inbox"** at the top of the sidebar. A red badge shows the count of open/in-progress tickets.

### Managing tickets

The inbox shows all support tickets with:

- User name and email
- Ticket subject/summary
- Status: **Open**, **In Progress**, **Closed**
- Priority: Low, Medium, High, Urgent
- Creation time and last message time

### Responding to a ticket

1. Click a ticket to open the conversation.
2. Read the user's messages.
3. Type your response and send.
4. The user is notified in real time (and optionally via email).

### Ticket lifecycle

1. **User sends first message** → Ticket created with status "Open".
2. **Admin responds** → Status can move to "In Progress".
3. **Issue resolved** → Admin closes the ticket.
4. **Bot interaction** → If @moji handled it, `bot_interaction_count` is incremented.
5. **Human interaction** → Each admin response increments `human_interaction_count`.

### Ticket analytics fields

| Field                     | Description                                                             |
| ------------------------- | ----------------------------------------------------------------------- |
| `resolution_type`         | How it was resolved: bot-answered, human-answered, no-answer, escalated |
| `enquiry_type`            | Category of the enquiry (e.g., billing, technical)                      |
| `satisfaction_rating`     | 1-5 rating from user (if collected)                                     |
| `bot_interaction_count`   | Number of @moji interactions before human involvement                   |
| `human_interaction_count` | Number of human admin responses                                         |

---

## 11. @moji Chatbot Settings

### Accessing settings

Dashboard > **Moji Settings**

### Knowledge base management

@moji's primary knowledge comes from the `moji_knowledge_base` table. Each entry has:

| Field     | Description                                          |
| --------- | ---------------------------------------------------- |
| Question  | The trigger question or topic                        |
| Answer    | The response @moji gives                             |
| Category  | Grouping (e.g., "Platform Help", "ADIT Exam", "VAT") |
| Tags      | Comma-separated keywords for matching                |
| Is Active | Toggle to enable/disable an entry                    |

### Adding/editing knowledge base entries

1. Go to Moji Settings.
2. Add new Q&A pairs or edit existing ones.
3. Toggle entries active/inactive as needed.
4. @moji uses fuzzy matching on questions and tags to find relevant answers.

### How @moji works (flow)

1. A user mentions `@moji` in a message.
2. The server extracts the question text.
3. It searches the knowledge base for matches (keyword + similarity).
4. **If match found**: Returns the knowledge base answer.
5. **If no match**: Sends the question to **OpenAI GPT** with a system prompt focused on international tax.
6. **If AI can't help**: Offers to escalate to human support.
7. The response is posted as a bot message in the channel.

### Cost considerations

Each AI-generated response (when knowledge base has no match) uses OpenAI API credits. Monitor usage via your OpenAI dashboard. The knowledge base is free — add more entries to reduce AI calls.

---

## 12. Email System & Logs

### Email types sent by the platform

| Email Type           | When it's sent                      |
| -------------------- | ----------------------------------- |
| `verification_code`  | Member login — 6-digit code         |
| `announcement`       | New announcement posted             |
| `event`              | New event posted, event reminders   |
| `article`            | New article published               |
| `newsletter`         | Newsletter distributed              |
| `ticket`             | Support ticket update for users     |
| `support_update`     | Admin responses to support tickets  |
| `reply`              | Someone replied to a user's message |
| `mention`            | Someone @mentioned a user           |
| `group_notification` | Group-related notifications         |

### Email logs

Dashboard > **Email Logs** shows every email sent with:

- Recipient name and email
- Subject line
- Email type and template type
- Status: **Sent**, **Failed**, **Pending**
- Timestamp
- Error message (if failed)

### Filtering & debugging

- Filter by email type, status, or recipient.
- Check failed emails for error messages (often SendGrid API errors or invalid addresses).
- In TEST_MODE, all emails show the original intended recipient in the subject line as `[TEST]`.

### TEST_MODE behaviour

When `TEST_MODE=true`:

- **All** emails are redirected to `TEST_EMAIL_RECIPIENT`.
- Subject lines are prefixed with `[TEST]`.
- The original intended recipient is logged but does NOT receive the email.
- This is essential for staging/testing without spamming real users.

**Before production:** Set `TEST_MODE=false` in environment variables.

---

## 13. Chat Analytics

Dashboard > **Chat Analytics**

### Available metrics

- Messages per channel over time
- Most active channels
- User activity trends
- Message volume by day/week
- Support ticket statistics

Use this to understand platform engagement and identify which channels are most/least active.

---

## 14. Event Invitees

Dashboard > **Event Invitees**

### What it shows

For each event that has been posted:

- List of users who have registered interest (RSVP'd)
- Their name, email, phone, company, notes
- RSVP status: Interested, Confirmed, Declined, Cancelled
- Whether confirmation and reminder emails were sent

### Actions

- View all RSVPs for a specific event.
- Export invitee data for external use.
- Track confirmation and reminder email delivery.

---

## 15. Platform Settings

Dashboard > **Platform Settings**

### Configurable settings

| Setting                       | Default             | Description                             |
| ----------------------------- | ------------------- | --------------------------------------- |
| `platform_name`               | MojiTax Connect     | Display name of the platform            |
| `admin_email`                 | admin@mojitax.com   | Admin contact email                     |
| `email_notifications_enabled` | true                | Global toggle for email notifications   |
| `admin_hours_enabled`         | true                | Show admin availability status to users |
| `admin_hours_timezone`        | Europe/London       | Timezone for business hours             |
| `admin_hours_start`           | 09:00               | Business hours start time               |
| `admin_hours_end`             | 17:00               | Business hours end time                 |
| `admin_hours_days`            | mon,tue,wed,thu,fri | Business days (comma-separated)         |
| `admin_avg_response_minutes`  | 60                  | Average response time shown to users    |

### Admin availability

When `admin_hours_enabled` is true, users see a real-time indicator under the support button:

- **Green dot** during business hours: "Online — ~60min response"
- **Grey dot** outside hours: "Offline — 09:00–17:00 (Europe/London)"

Adjust these settings to match your actual availability.

---

## 16. Learnworlds Integration

### How it works

Members authenticate by verifying their email against the **Learnworlds API**. The flow:

1. User enters their email on the login page.
2. Server calls `GET /users/{email}` on the Learnworlds API to verify the account exists.
3. If found, a 6-digit verification code is emailed.
4. User enters the code, and a JWT session is created.

### Required configuration

- `LEARNWORLDS_CLIENT_ID` and `LEARNWORLDS_CLIENT_SECRET` — API credentials
- One of: `LEARNWORLDS_API_URL`, `LEARNWORLDS_SCHOOL_URL`, or `LEARNWORLDS_SCHOOL_ID`

### If Learnworlds is not configured

If the Learnworlds environment variables are missing:

- Member login is **completely blocked** with a clear error message.
- Admin login still works (uses password/OAuth, not Learnworlds).

### Catalog integration

The platform can fetch Learnworlds product catalogs:

- **Courses** — `GET /courses`
- **Bundles** — `GET /bundles`
- **Subscriptions** — `GET /subscription-plans`

These are used when linking channels to Learnworlds entities (see Section 6).

---

## 17. Core Data Points & Expected Outcomes

### After fresh deployment

| Check              | Expected                            |
| ------------------ | ----------------------------------- |
| Users table        | 1 row (admin-mojitax)               |
| Channels table     | 1 row (#General)                    |
| Channel members    | 1 row (admin as owner of #General)  |
| Messages           | 1 row (welcome message in #General) |
| Knowledge base     | 12 entries                          |
| Platform settings  | 9 entries                           |
| Verification codes | 0 (generated on login)              |

### After first member login

| Check              | Expected                                                 |
| ------------------ | -------------------------------------------------------- |
| Users table        | +1 new user with role='user', login_method='learnworlds' |
| Channel members    | +1 (user auto-joined to #General)                        |
| Email logs         | +1 verification_code email                               |
| Verification codes | +1 (used, with used_at timestamp)                        |

### After admin creates a channel

| Check           | Expected                         |
| --------------- | -------------------------------- |
| Channels table  | +1 new channel with type='topic' |
| Channel members | +1 (admin as owner)              |

### After a post is created

| Check          | Expected                                |
| -------------- | --------------------------------------- |
| Posts table    | +1 with correct post_type               |
| Messages table | +1 linked message in the target channel |
| Email logs     | +N emails (one per channel member)      |

### After @moji interaction

| Check                 | Expected                                         |
| --------------------- | ------------------------------------------------ |
| Messages table        | +2 (user's message + bot response)               |
| If knowledge base hit | Response matches knowledge base answer           |
| If AI-generated       | Response from OpenAI (check API usage dashboard) |

### After support ticket

| Check            | Expected                                    |
| ---------------- | ------------------------------------------- |
| Support tickets  | +1 with status='open'                       |
| Support messages | +1 per message sent                         |
| Email logs       | +1 if email notification sent to admin/user |

---

## 18. Testing & Troubleshooting

### Pre-deployment checklist

- [ ] All 14 environment variables are set
- [ ] `TEST_MODE=false` for production
- [ ] Database reset script has been run on a clean Supabase instance
- [ ] Admin can log in via `/admin/login`
- [ ] Member can log in via `/login` (requires Learnworlds)
- [ ] @moji responds in #General (test with `@moji How do I use @moji?`)
- [ ] Support chat creates a ticket
- [ ] Emails are being sent (check Email Logs in dashboard)
- [ ] Real-time messaging works (open in two browsers, send a message)

### Running automated tests

```bash
npm run test                              # All tests
npx vitest run server/messages.test.ts    # Single test file
```

Tests require environment variables to be set. Without Supabase credentials, DB-dependent tests will fail with "Database not available".

**Test files:**
| File | Covers |
|------|--------|
| `server/analytics.test.ts` | Analytics queries |
| `server/auth.logout.test.ts` | Auth logout flow |
| `server/channels.test.ts` | Channel CRUD operations |
| `server/chatbot.test.ts` | @moji chatbot logic |
| `server/messages.test.ts` | Message creation and delivery |
| `server/posts.test.ts` | Post creation and retrieval |
| `server/support.test.ts` | Support ticket system |

### Common issues and fixes

#### Members can't log in

| Symptom                         | Cause                       | Fix                                                                                                                      |
| ------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| "Learnworlds is not configured" | Missing env vars            | Set `LEARNWORLDS_CLIENT_ID`, `LEARNWORLDS_CLIENT_SECRET`, and `LEARNWORLDS_SCHOOL_ID`                                    |
| "User not found"                | Email not in Learnworlds    | User must register on Learnworlds first                                                                                  |
| No verification email received  | SendGrid issue or TEST_MODE | Check Email Logs; verify `SENDGRID_API_KEY` and `EMAIL_FROM`; check if `TEST_MODE=true` (emails going to test recipient) |
| "Invalid verification code"     | Code expired or wrong       | Codes expire after 10 minutes; request a new one                                                                         |

#### @moji not responding

| Symptom                     | Cause                               | Fix                                   |
| --------------------------- | ----------------------------------- | ------------------------------------- |
| No response at all          | `OPENAI_API_KEY` missing or invalid | Set a valid OpenAI API key            |
| Generic/unhelpful responses | Knowledge base has no match         | Add more Q&A entries in Moji Settings |
| Error in response           | OpenAI API rate limit or quota      | Check your OpenAI usage dashboard     |

#### Emails not being sent

| Symptom                        | Cause                      | Fix                                                                                           |
| ------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------- |
| No emails at all               | `SENDGRID_API_KEY` invalid | Verify the API key in SendGrid dashboard                                                      |
| Emails going to wrong address  | `TEST_MODE=true`           | Set `TEST_MODE=false` for production                                                          |
| Emails marked "failed" in logs | SendGrid rejection         | Check the error message in Email Logs; common causes: unverified sender domain, bounced email |
| Verification emails in spam    | Sender reputation          | Configure SPF/DKIM/DMARC for your sending domain                                              |

#### Real-time features not working

| Symptom                    | Cause                       | Fix                                                                  |
| -------------------------- | --------------------------- | -------------------------------------------------------------------- |
| Messages don't appear live | Socket.io connection failed | Check browser console for WebSocket errors; verify server is running |
| Online users not showing   | Socket auth failed          | JWT cookie may be missing; try logging out and back in               |
| Unread counts wrong        | Stale cache                 | Refresh the page; counts sync every 60 seconds                       |

#### Database issues

| Symptom                  | Cause                                        | Fix                                                   |
| ------------------------ | -------------------------------------------- | ----------------------------------------------------- |
| "Database not available" | `SUPABASE_SERVICE_ROLE_KEY` missing or wrong | Verify the key in Supabase Dashboard > Settings > API |
| Migration failed         | Schema already exists                        | Use `IF NOT EXISTS` or run the full reset script      |
| RLS blocking queries     | Missing policies                             | Run migration 004 (Fix RLS for Server)                |

### Rate limits

The platform has built-in rate limiting to prevent abuse:

| Category | Limit    | Applies to                                 |
| -------- | -------- | ------------------------------------------ |
| Auth     | Strict   | Login attempts, verification codes         |
| Messages | Moderate | Sending messages                           |
| Support  | Moderate | Creating tickets, sending support messages |
| General  | Relaxed  | All other API calls                        |

If users report "too many requests" errors, they need to wait before retrying.

### Scheduled background tasks

| Task                 | Frequency    | What it does                                               |
| -------------------- | ------------ | ---------------------------------------------------------- |
| Expired code cleanup | Every 1 hour | Deletes verification codes past their expiry               |
| Event reminders      | Periodic     | Sends reminder emails for events with `reminder_hours` set |

These start automatically when the server boots.

---

## 19. Architecture Quick Reference

### Tech stack

| Layer     | Technology                                                                     |
| --------- | ------------------------------------------------------------------------------ |
| Frontend  | React 19, Vite, TailwindCSS v4, shadcn/ui, React Query                         |
| Backend   | Express, tRPC, Socket.io                                                       |
| Database  | Supabase (PostgreSQL)                                                          |
| Auth      | JWT cookies (member: Learnworlds email verify; admin: password / Google OAuth) |
| Email     | SendGrid                                                                       |
| AI        | OpenAI GPT (for @moji)                                                         |
| Real-time | Socket.io (WebSocket)                                                          |

### Key file locations

| File                                   | Purpose              |
| -------------------------------------- | -------------------- |
| `server/routers.ts`                    | All API routes       |
| `server/db.ts`                         | All database queries |
| `server/_core/index.ts`                | Server entry point   |
| `server/_core/socket.ts`               | Real-time events     |
| `server/chatbot.ts`                    | @moji logic          |
| `server/services/email.ts`             | Email sending        |
| `server/services/learnworlds.ts`       | Learnworlds API      |
| `client/src/components/ChatLayout.tsx` | Main UI              |
| `client/src/pages/Admin.tsx`           | Admin dashboard      |
| `supabase/reset_database.sql`          | Full DB reset script |

### API access levels

| Level                | Who             | What they can access                             |
| -------------------- | --------------- | ------------------------------------------------ |
| `publicProcedure`    | Anyone          | Health checks, public channel list               |
| `protectedProcedure` | Logged-in users | Messaging, groups, support, profile              |
| `adminProcedure`     | Admins only     | User management, analytics, settings, moderation |

---

**Questions?** Check the `CLAUDE.md` file for developer-level architecture details, or reach out to the development team.

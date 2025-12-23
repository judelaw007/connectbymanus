# Supabase Setup for MojiTax Connect

## Platform Access Model

```
┌─────────────────────────────────────────────────────────────┐
│  PUBLIC (No login required)                                 │
│  • Can READ all chats                                       │
│  • Member names displayed as encrypted/anonymous            │
│  • Cannot post or reply                                     │
│  • CTA: "Join mojitax.co.uk to participate"                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  MEMBERS (Auth via mojitax.co.uk / Learnworlds)             │
│  • Full read/write access                                   │
│  • Real names visible to other members                      │
│  • Can create study groups, post messages                   │
│  • Can use @moji and create support tickets                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  ADMIN (Auth via Supabase at /auth/admin)                   │
│  • Full platform control                                    │
│  • Create channels, posts, manage KB                        │
│  • Handle support tickets                                   │
│  • Name always visible (not encrypted)                      │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. A Supabase account (https://supabase.com)
2. A new Supabase project created

## Setup Steps

### Step 1: Create a New Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Enter project details:
   - **Name**: `mojitax-connect`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., `eu-west-2` for UK)
4. Click "Create new project" and wait for setup (~2 minutes)

### Step 2: Run the Schema Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the contents of `migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click "Run" (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

### Step 3: Run the Seed Data

1. Create another new query
2. Copy the contents of `migrations/002_seed_data.sql`
3. Paste and run
4. You should see a summary table showing:
   - 1 user (admin)
   - 6 channels
   - 12 knowledge base entries
   - 1 message

### Step 4: Get Your Connection Credentials

In your Supabase dashboard, go to **Settings** → **Database**:

1. **Connection String**: Copy the URI (you'll need this for the app)
2. **Host**: `db.xxxxx.supabase.co`
3. **Port**: `5432` (default PostgreSQL port)
4. **Database**: `postgres`
5. **User**: `postgres`
6. **Password**: The password you set when creating the project

Go to **Settings** → **API**:

1. **Project URL**: `https://xxxxx.supabase.co`
2. **anon/public key**: For client-side access
3. **service_role key**: For server-side access (keep secret!)

### Step 5: Update Environment Variables

Add these to your `.env` file:

```env
# Supabase Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# Supabase API (optional - for direct client access)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 6: Update Drizzle ORM Configuration

The app currently uses MySQL. To switch to PostgreSQL/Supabase:

1. Install PostgreSQL driver:
   ```bash
   npm install postgres drizzle-orm/postgres-js
   ```

2. Update `drizzle.config.ts`:
   ```typescript
   import { defineConfig } from 'drizzle-kit';

   export default defineConfig({
     schema: './drizzle/schema.ts',
     out: './drizzle/migrations',
     dialect: 'postgresql',
     dbCredentials: {
       url: process.env.DATABASE_URL!,
     },
   });
   ```

3. Update `server/db.ts` to use PostgreSQL driver (see migration guide below)

---

## Database Schema Overview

### Tables Created

| Table | Description |
|-------|-------------|
| `users` | User accounts with roles (user/admin) |
| `channels` | Chat channels (general, topic, study_group, support) |
| `channel_members` | User membership in channels |
| `messages` | Chat messages |
| `posts` | Structured content (events, announcements, articles, newsletters) |
| `support_tickets` | Support ticket tracking |
| `support_messages` | Messages within support tickets |
| `notifications` | User notifications |
| `moji_knowledge_base` | Q&A for @moji chatbot |
| `email_logs` | Email send tracking |

### Key Differences from MySQL

| MySQL | PostgreSQL/Supabase |
|-------|---------------------|
| `INT AUTO_INCREMENT` | `SERIAL` |
| `TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Trigger function |
| `ENUM('a', 'b')` | `CREATE TYPE ... AS ENUM` |
| `camelCase` column names | `snake_case` column names |

### Row Level Security (RLS)

Supabase uses RLS for access control. The migration includes basic policies:

- Users can read all users, update their own profile
- Public channels visible to all, private channels to members only
- Messages visible in accessible channels
- Posts publicly readable
- Support tickets visible to owner only
- Notifications visible to owner only

**Note**: For server-side access with Drizzle, you may need to use the `service_role` key which bypasses RLS.

---

## Verifying Setup

### Check Tables in Supabase

1. Go to **Table Editor** in Supabase dashboard
2. You should see 10 tables listed
3. Click on each to verify structure

### Test a Query

In SQL Editor, run:

```sql
-- Check all channels
SELECT * FROM channels;

-- Check knowledge base
SELECT question, category FROM moji_knowledge_base;

-- Check the welcome message
SELECT content FROM messages LIMIT 1;
```

---

## Troubleshooting

### "relation does not exist" error
- Make sure you ran the migrations in order (001 before 002)
- Check that all tables were created in Table Editor

### Connection refused
- Verify DATABASE_URL is correct
- Check if your IP is allowed (Supabase → Settings → Database → Connection Pooling)
- Try using the connection pooler URL instead of direct connection

### RLS blocking queries
- For server-side access, use service_role key
- Or modify RLS policies to allow your use case

---

## Next Steps

After Supabase setup:

1. Update `server/db.ts` to use PostgreSQL driver
2. Update column names from `camelCase` to `snake_case` in queries
3. Test all API endpoints with new database
4. Deploy and verify production connection

---

## Useful Supabase Features

### Real-time Subscriptions
Supabase can push database changes to clients in real-time:
```javascript
supabase
  .channel('messages')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, handleNewMessage)
  .subscribe()
```

### Storage (for file uploads)
Supabase has built-in file storage for user uploads.

### Edge Functions
Serverless functions that run close to your users.

### Auth
Supabase Auth is used for **admin login only**. Regular users authenticate via mojitax.co.uk (Learnworlds).

---

## Admin Authentication Setup

Admin access is managed through Supabase Auth, completely separate from regular user authentication.

### Step 1: Enable Email Auth

1. Go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled
3. Optionally disable "Confirm email" for admin accounts

### Step 2: Create Admin User

1. Go to **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter:
   - **Email**: `admin@mojitax.co.uk`
   - **Password**: Strong password (save securely!)
   - **Auto Confirm User**: ✓ Check this
4. Click **"Create user"**

### Step 3: Set Admin Metadata

1. Click on the newly created user
2. Under **"user_metadata"**, click Edit and add:
   ```json
   {
     "is_admin": true,
     "name": "MojiTax Admin"
   }
   ```
3. Save changes

### Step 4: Link to Users Table

Run this SQL (replace `[USER_ID]` with the ID from the dashboard):

```sql
INSERT INTO users (open_id, name, email, role, login_method)
VALUES (
    '[USER_ID_FROM_AUTH_DASHBOARD]',
    'MojiTax Admin',
    'admin@mojitax.co.uk',
    'admin',
    'supabase'
)
ON CONFLICT (open_id) DO UPDATE SET role = 'admin';
```

### Step 5: Update Environment Variables

Add to your `.env`:

```env
# Admin auth via Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Admin Login Flow

```
/auth/admin → Supabase Auth (email/password)
           → Verify is_admin in metadata
           → Set session cookie
           → Redirect to /admin dashboard
```

### Adding More Admins

Repeat Steps 2-4 for each additional admin. You can also:
- Use Supabase Auth with invite links
- Enable MFA for extra security
- Set up password policies

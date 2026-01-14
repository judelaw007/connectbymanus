# MojiTax Connect

A platform for tax professionals to connect, learn, and collaborate. Features live community chat, private study groups, expert articles, and AI-powered support.

## Tech Stack

- **Frontend**: React 19 with Vite, TailwindCSS, Radix UI components
- **Backend**: Express with tRPC, Socket.io for real-time features
- **Database**: Supabase (PostgreSQL) with Supabase JS Client
- **Authentication**: Supabase Auth (admin) + Learnworlds SSO (members)

## Project Structure

```
├── client/             # React frontend
│   └── src/
│       ├── components/ # UI components
│       ├── pages/      # Page components
│       └── lib/        # Utilities and tRPC setup
├── server/             # Express backend
│   ├── _core/          # Core server setup (express, vite, socket, oauth)
│   ├── db.ts           # Supabase database functions
│   └── routers.ts      # tRPC routers
├── supabase/           # Supabase migrations and setup
│   └── migrations/     # SQL migration files
├── shared/             # Shared types and constants
└── attached_assets/    # Static assets
```

## Environment Variables

### Required for Supabase
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (client-side)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side, bypasses RLS)

### Required for Authentication
- `LEARNWORLDS_CLIENT_ID` - Learnworlds OAuth client ID
- `LEARNWORLDS_CLIENT_SECRET` - Learnworlds OAuth client secret
- `LEARNWORLDS_SCHOOL_ID` - Learnworlds school ID

### Required for @moji Chatbot
- `OPENAI_API_KEY` - OpenAI API key for @moji chatbot (already configured)
- `RESEND_API_KEY` - Resend API key for email notifications
- `EMAIL_FROM` - Email sender address
- `OWNER_OPEN_ID` - Admin user identifier

## Development

The application runs on port 5000 in development mode:
- Express server serves both the API and Vite dev server
- Hot module replacement enabled for frontend development
- Socket.io for real-time chat functionality

## Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

## Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Run the migrations in `supabase/migrations/` in order (001, 002, etc.)
3. Copy the project URL and keys to your environment variables
4. Create an admin user in Supabase Auth dashboard

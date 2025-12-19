# MojiTax Connect

A platform for tax professionals to connect, learn, and collaborate. Features live community chat, private study groups, expert articles, and AI-powered support.

## Tech Stack

- **Frontend**: React 19 with Vite, TailwindCSS, Radix UI components
- **Backend**: Express with tRPC, Socket.io for real-time features
- **Database**: MySQL with Drizzle ORM
- **Authentication**: OAuth-based authentication

## Project Structure

```
├── client/             # React frontend
│   └── src/
│       ├── components/ # UI components
│       ├── pages/      # Page components
│       └── lib/        # Utilities and tRPC setup
├── server/             # Express backend
│   ├── _core/          # Core server setup (express, vite, socket, oauth)
│   └── routers.ts      # tRPC routers
├── drizzle/            # Database schema and migrations
├── shared/             # Shared types and constants
└── attached_assets/    # Static assets
```

## Environment Variables

### Required for Authentication
- `VITE_OAUTH_PORTAL_URL` - OAuth portal URL for authentication
- `VITE_APP_ID` - Application ID for OAuth
- `VITE_APP_URL` - Public URL of this application
- `OAUTH_SERVER_URL` - OAuth server endpoint

### Required for Database
- `DATABASE_URL` - MySQL connection string

### Optional
- `VITE_ANALYTICS_ENDPOINT` - Analytics endpoint for Umami
- `VITE_ANALYTICS_WEBSITE_ID` - Analytics website ID
- `VITE_FRONTEND_FORGE_API_KEY` - Google Maps API key
- `VITE_FRONTEND_FORGE_API_URL` - Frontend Forge API URL

## Development

The application runs on port 5000 in development mode:
- Express server serves both the API and Vite dev server
- Hot module replacement enabled for frontend development
- Socket.io for real-time chat functionality

## Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Generate and run database migrations

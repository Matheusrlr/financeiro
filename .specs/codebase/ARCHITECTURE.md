# Architecture

**Pattern:** Next.js App Router monolith — feature-grouped routes + shared lib

## High-Level Structure

```
Browser  →  Next.js App Router  →  Supabase (Auth + DB + Storage)
                   ↓
           Drizzle ORM (query layer)
                   ↓
           PostgreSQL (via Supabase)
```

## Identified Patterns

### Route Groups for Auth Segmentation

**Location:** `src/app/(auth)/` and `src/app/(public)/`
**Purpose:** Separates protected from public routes without URL path prefix
**Implementation:** `(auth)/layout.tsx` calls `supabase.auth.getUser()` and redirects to `/login` if unauthenticated
**Example:** [src/app/(auth)/layout.tsx](../../src/app/(auth)/layout.tsx)

### Supabase Client Split (Server vs Client)

**Location:** `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts`
**Purpose:** Correct Supabase SSR pattern — server components use cookie-based client, browser components use browser client
**Implementation:** `@supabase/ssr` with `createServerClient` / `createBrowserClient`
**Example:** [src/lib/supabase/server.ts](../../src/lib/supabase/server.ts)

### Drizzle Schema as Single Source of Truth

**Location:** `src/db/schema.ts`
**Purpose:** All table definitions, enums, and indexes in one file
**Implementation:** Drizzle `pgTable` + `pgEnum`, pushed to Supabase via `npm run db:push`
**Example:** [src/db/schema.ts](../../src/db/schema.ts)

### Session Refresh via Middleware

**Location:** `src/middleware.ts` → `src/lib/supabase/middleware.ts`
**Purpose:** Refresh Supabase session cookies on every request, redirect unauthenticated users
**Implementation:** `updateSession()` checks `auth.getUser()`, handles redirects, refreshes tokens

## Data Flow

### Authentication Flow

```
/login page → supabase.auth.signInWithOtp(email)
           → Supabase emails magic link
           → User clicks link → /auth/callback?code=xxx
           → exchangeCodeForSession(code)
           → Session cookie set → redirect to /dashboard
```

### Protected Route Flow

```
Request → middleware (updateSession) → refreshes session cookie
       → (auth)/layout.tsx → getUser() → redirect if null
       → Page renders with authenticated user
```

## Code Organization

**Approach:** Feature-grouped App Router pages + shared `lib/` + `db/` layer

```
src/
├── app/
│   ├── (auth)/          # Protected pages (dashboard, upload, transactions)
│   ├── (public)/        # Public pages (login)
│   ├── api/             # API Route Handlers (not yet implemented)
│   └── auth/callback/   # OAuth/magic link callback handler
├── components/
│   ├── ui/              # shadcn/ui primitives (Button, Card, Input, Label)
│   ├── charts/          # Recharts wrappers (not yet implemented)
│   ├── dashboard/       # AppHeader + dashboard widgets
│   └── upload/          # Upload components (not yet implemented)
├── db/
│   ├── schema.ts        # Drizzle table definitions
│   └── index.ts         # DB client instance
├── lib/
│   ├── supabase/        # Server + client + middleware helpers
│   ├── ai/              # Claude client (not yet implemented)
│   └── utils.ts         # cn() helper (clsx + tailwind-merge)
└── types/
    └── index.ts         # Global TypeScript types
```

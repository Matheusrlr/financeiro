# Tech Stack

**Analyzed:** 2026-04-20

## Core

- Framework: Next.js 16.2.4 (App Router)
- Language: TypeScript 5
- Runtime: Node.js
- Package manager: npm

## Frontend

- UI Framework: React 19
- Styling: Tailwind CSS 4 + shadcn/ui (components.json present, @base-ui/react 1.4.1)
- State Management: React local state (useState) — no global store
- Form Handling: Native React forms
- Charts: Recharts 3.8.1
- Notifications: Sonner 2.0.7
- Icons: Lucide React 1.8.0
- Theming: next-themes 0.4.6

## Backend

- API Style: Next.js API Routes (App Router Route Handlers)
- Database ORM: Drizzle ORM 0.45.2 + `postgres` driver 3.4.9
- Database System: PostgreSQL via Supabase
- Authentication: Supabase Auth (@supabase/ssr 0.10.2, @supabase/supabase-js 2.104.0)

## Database / Storage

- Primary DB: Supabase PostgreSQL (connection via `DATABASE_URL`)
- Storage: Supabase Storage (planned — not yet wired in code)
- Migrations: Drizzle Kit 0.31.10 (`db:push`, `db:generate`, `db:migrate`)

## Testing

- Unit: none configured
- Integration: none configured
- E2E: none configured

## External Services

- Auth & DB: Supabase (Auth, PostgreSQL, Storage)
- AI (planned): Anthropic Claude API
- Deploy (planned): Vercel

## Development Tools

- Linting: ESLint 9 + eslint-config-next 16.2.4
- Build: next build
- Schema inspection: drizzle-kit studio
- Env: dotenv 17.4.2 (dev-only, for drizzle-kit)
- Validation: Zod 4.3.6

# Happy and Healthy Hub — Unified Next.js Application

One Next.js application serves the public Happy and Healthy Hub website and the protected Operations Portal.

- `/` is the public marketing site and registration preview.
- `/admin/login` is the real administrator/staff login.
- `/admin` and `/admin/*` are protected portal routes.
- `https://api.hhh.foundation` is the default server-side FastAPI base URL.

The public Caregiver and Provider forms validate the complete two-step application in the browser, but do not transmit or persist applicant data. The current FastAPI source does not expose a compatible unauthenticated applicant-submission endpoint. The UI states this limitation and never reports a false registration success.

## Requirements

- Node.js 24 LTS (Next.js requires at least 20.9; the current Vitest toolchain requires Node 22.12 or 24+)
- npm
- A Supabase project URL and publishable/anon key for real portal authentication

## Local setup

```bash
npm ci
cp .env.local.example .env.local
# Set the real NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
npm run dev
```

Never place a Supabase service-role key or any backend secret in a `NEXT_PUBLIC_*` variable.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript validation |
| `npm test` | Run the non-destructive Vitest suite |
| `npm run build` | Create the production server build |
| `npm run start` | Start the production Next.js server |

## Authentication and routing

`src/proxy.ts` refreshes sessions and fails closed for protected `/admin/*` routes. Supabase cookie sessions and the existing FastAPI phone-session flow are preserved. Page-level role checks and backend/RLS authorization remain in place; there are no hardcoded credentials or authentication bypasses.

The existing portal page files remain in their original internal locations. Next.js rewrites expose them under `/admin/*`, while old top-level portal URLs redirect to their canonical `/admin/*` equivalents.

See [HHH_UNIFIED_NEXT_HANDOVER.md](./HHH_UNIFIED_NEXT_HANDOVER.md) for the complete route map, production configuration, validation evidence, blockers, and VPS deployment procedure.

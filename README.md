# Happy Healthy Hub — Operations Portal

Authenticated web portal for Happy Healthy Hub care staff (care
coordinators, operations managers, administrators) to review and decide
customer care requests. This is **not** the customer-facing product —
that is the Flutter app in the sibling `withu/` repository, which shares
the same Supabase/PostgreSQL backend.

## Status

Staff sign in to an admin portal: Overview, Customers, Caregivers, Care
Requests, Assignments, Visits & Scheduling, Reports & Insights,
Notifications, Staff & Access and Settings. Care Requests, Assignments,
Visits & Scheduling, Customers, Caregivers, Staff & Access and the Reports
visit-notes view are wired to the real Supabase backend. Incidents,
Notifications, and most of Settings have no backend table yet and show
an honest "not available yet" state rather than fabricated data. The
Overview dashboard's own customers/workers/visits *summary section*
still renders demo data from `mock_data_for_web/` (gated behind
`NEXT_PUBLIC_USE_MOCK_DATA=true` in development) — a known, documented
inconsistency against the now-real list pages; see
`OPERATIONS_PORTAL_IMPLEMENTATION_REPORT.md` "Outstanding items" at the
project root. See `docs/OPERATIONS_PORTAL.md` (in the `withu` repository)
for the original Phase 3 scope decision and verification evidence, and
`mock_data_for_web/README.md` for the mock-data layer that remains in use
only by the dashboard's demo section.

**Local Demo Mode** (`NEXT_PUBLIC_DEMO_MODE=true`, development only) is
a separate, fuller, interactive demonstration of the entire portal above
— every module, its own local sign-in, real mutations against a local
dataset, and a "Reset Demo Data" control — for showing the real approved
UI and real application logic without production credentials or live
data. See `demo/README.md`. It is unrelated to `NEXT_PUBLIC_USE_MOCK_DATA`
and cannot be active in a production build regardless of either flag.

There is also a public, signed-out landing page at `/` — a full premium
one-page marketing site (hero, services, Why HHH, how it works, the
Caregiver Academy, our approach, FAQ accordion, final CTA, footer; see
`src/app/landing.css` and `src/app/components/landing/`) — that
redirects signed-in staff to `/dashboard`. No login/registration form
appears on it; every CTA either scrolls to a real on-page section or
links to the existing staff sign-in route. No fabricated
services/pricing/testimonials/certifications appear anywhere on it — see
the comment at the top of `src/app/page.tsx` for the content rules it
follows. Illustrations in `public/images/illustrations/` are
hand-recoloured, MIT-licensed unDraw SVGs (not photographs — chosen
deliberately for a consistently positive, never-stereotyped tone); see
`public/images/SOURCES.md`. This portal remains staff-only: customers
and workers
use the Flutter app, not this web portal, per the existing Phase-3 scope
decision — the admin list pages are read-only operational views for
staff, not a customer/worker self-service surface.

## Stack

- Next.js 16 (App Router, Turbopack, Cache Components), TypeScript, React 19.
- `@supabase/ssr` for cookie-based server-side sessions — publishable/anon
  key only, same as the Flutter app. **Never** add a service-role key here.
- Plain CSS (`src/app/globals.css`) using the same design tokens as
  `withu/DESIGN.md` — no component framework, kept intentionally minimal.
- Vitest for pure-logic unit tests.

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in the real Supabase project URL + publishable key
npm run dev                         # http://localhost:3000 (or the port your launch config sets)
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (Turbopack) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (pure-logic unit tests only — no live Supabase calls) |

## Authentication and access

Staff sign in with email/password — the same Supabase Auth method the
Flutter app uses, against the same project. After sign-in, the portal
reads `public.user_roles` for that account; only `care_coordinator`,
`operations_manager` or `administrator` may use `/requests`. This is a
**UX convenience**, not the security boundary: every read/write in this
app still goes through RLS or a trusted database function, which enforce
the real rule regardless of what this app's own role check does or
doesn't catch.

`middleware.ts` refreshes the session and redirects signed-out visitors to
`/login` for every route except `/login` and `/auth/*` — confirmed this
session by navigating to `/requests` while signed out and observing the
redirect (see `docs/OPERATIONS_PORTAL.md` "Verification performed").

## What this portal does NOT do

- No service-role key, ever.
- No direct writes for business-rule-bearing actions — only trusted RPCs
  (`start_care_request_review`, `decide_care_request`,
  `assign_care_associate`, `end_care_assignment`, `schedule_visit`,
  `cancel_visit`, `create_customer`, `set_customer_status`,
  `create_care_associate`, `set_care_associate_status`,
  `grant_user_role`, `revoke_user_role`, `set_profile_account_status`).
- No invoicing or payments — not in approved UI scope.
- No staff invitation by email, no cross-device session listing, no
  customer-by-email or caregiver-by-email lookup — none of these are
  reachable from a browser client without a service-role-backed admin
  API; see `OPERATIONS_API_REQUIREMENTS.md` at the project root.
- No incident reporting, no notifications — no backend table exists for
  either.
- No caseload restriction beyond what the database's own RLS already
  enforces (all care staff can see all requests/customers/caregivers —
  that is the existing, not newly invented, RLS policy).

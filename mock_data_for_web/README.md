# `mock_data_for_web/` — development-only sample data

**This is not the production backend and never will be.** It exists
solely so the admin portal's UI (dashboard, charts, customer/worker
lists, care-request queues, visit schedules) can be built and visually
verified before the real customer/worker/visit/assignment data access
is wired up on the web side. The only real backend this project has —
Supabase/PostgreSQL, the same project the Flutter app uses — already
backs the **care requests** feature (`src/lib/care-requests.ts`,
`/requests`); that is untouched by this folder and still reads live
data, never mock data.

Every record in this folder is **entirely fictional**: made-up names,
`@example.com` email addresses, obviously-fake `+91 9X000 000XX`-style
phone numbers, and dates chosen only to make charts and lists look
populated. None of it was copied from a reference image, a real
customer, a real worker, or the live development database.

## What's here, and why only this

| File | Contents | Backs |
|---|---|---|
| `customers.json` | 14 fictional customers | Customers list/detail |
| `workers.json` | 8 fictional care workers | Workers list/detail |
| `services.json` | 6 fictional services (mirrors the real `public.services` column shape: `service_code`, `base_price`, `price_unit`) | Service-demand chart, request service names |
| `care_requests.json` | 18 fictional requests, referencing real customer/service ids below, using the **real** status model (`submitted` / `under_review` / `approved` / `rejected` / `cancelled` — copied from `src/lib/care-requests.ts`, which itself mirrors the live database) | Dashboard KPIs/charts/recent-activity demo views, request-volume-over-time chart |
| `care_assignments.json` | 10 fictional assignments linking requests to workers | Worker workload, assignment-based visit linkage |
| `visits.json` | 12 fictional visits linking to assignments, with `scheduled`/`completed`/`missed`/`cancelled` statuses | Upcoming-visits list, visit-activity chart |
| `scenarios/empty_state.json` | Every collection empty | "No records yet" empty states |
| `scenarios/error_state.json` | A `simulateError` flag | Error states with retry, instead of ever showing stale/fake data on failure |
| `scenarios/onboarding_state.json` | One customer with a deliberately incomplete profile, one worker who hasn't finished training | Onboarding-in-progress UI |

**Deliberately not created**, because the feature doesn't exist (or
doesn't have a defined shape) anywhere in this application yet:

- `dashboard_metrics.json` / `analytics_timeseries.json` — the brief
  itself prefers deriving these from the underlying records rather than
  hand-maintaining a second, parallel set of numbers that could silently
  drift out of sync with the tables they're supposed to summarise. The
  mock-data service (`src/lib/mock-data/service.ts`) computes every KPI,
  chart series and distribution **from** `customers.json`/
  `care_requests.json`/`visits.json`/etc. at request time — there is
  nowhere for a dashboard total to contradict the underlying records,
  because there is no second copy of the numbers to contradict them.
- `messages.json` / `notifications.json` — no messaging or notification
  feature exists anywhere in this application's real schema or UI (not
  in the Flutter app, not in this portal). Inventing a dataset and a
  schema for a feature that has no approved design would be exactly the
  kind of unapproved, elaborate fabrication this task warns against.

## Data model notes (what's real vs. what's invented here)

- **Care request statuses** (`submitted`, `under_review`, `approved`,
  `rejected`, `cancelled`) are the **real** status model from the live
  schema — reused exactly, not reinvented, so `mock_data_for_web`'s
  sample requests use values the real backend actually supports.
- **Customer, worker, assignment and visit statuses**
  (`accountStatus`, `onboardingStatus`, `trainingStatus`,
  `availability`, assignment/visit `status`) are **invented for this
  mock layer** — the web portal has no real customer/worker/assignment/
  visit table access yet, so there is no existing status model to copy.
  These are documented here as mock-only conventions, not claimed as
  confirmed production requirements. If/when a real customer/worker/
  visit data layer is built for the web portal, these values should be
  reconciled against whatever the actual schema defines — they are a
  reasonable starting guess, not a specification.

## Referential integrity

- Every `care_requests[].customerId` exists in `customers.json`.
- Every `care_requests[].serviceIds[]` entry exists in `services.json`.
- Every `care_assignments[].careRequestId` exists in `care_requests.json`
  (only requests with status `approved` have an assignment, matching the
  real app's own rule that assignment only follows approval).
- Every `care_assignments[].workerId` exists in `workers.json`.
- Every `visits[].careAssignmentId` exists in `care_assignments.json`.
- All dates are chronologically plausible (a request's `createdAt`
  precedes its assignment, which precedes its visits).

`src/lib/mock-data/__tests__/service.test.ts` asserts this referential
integrity in code, so a future edit to these files that breaks a
reference fails the test suite rather than silently shipping a broken
demo.

## Activating mock mode

Controlled by `NEXT_PUBLIC_USE_MOCK_DATA` in `.env.local`:

```bash
NEXT_PUBLIC_USE_MOCK_DATA=true
```

This is a **development/demo convenience flag, not a security
boundary** — a `NEXT_PUBLIC_*` variable is readable in the browser by
definition. What actually gates mock data:

1. `src/lib/mock-data/config.ts` only returns `true` from
   `isMockDataEnabled()` when **both** `NEXT_PUBLIC_USE_MOCK_DATA ===
   'true'` **and** `process.env.NODE_ENV !== 'production'`. A production
   build (`next build` with `NODE_ENV=production`, which Next.js sets
   automatically) can never serve mock data, even if the flag is
   accidentally left on in an environment file — this check runs again
   on the server for every request, not just once in client code.
2. Every mock-backed page renders an unmissable **"DEMO DATA"** banner
   (`src/app/components/DemoDataBanner.tsx`) wherever mock records are
   shown, so nobody can mistake a demo screen for live operational data.
3. Mock mode never touches authentication. Signing in still goes through
   real Supabase Auth; `isCareStaff`/role checks are untouched. Mock mode
   only affects which *data* functions
   (`src/lib/mock-data/service.ts` vs. a real repository) a page calls
   for customers/workers/visits/analytics — never who is allowed to sign
   in or which role they're granted.

## Simulating empty and error states

`src/lib/mock-data/config.ts` also reads `NEXT_PUBLIC_MOCK_SCENARIO`
(`default` | `empty` | `error` | `onboarding`; defaults to `default`
when unset or unrecognised). Set it alongside the flag above:

```bash
NEXT_PUBLIC_USE_MOCK_DATA=true
NEXT_PUBLIC_MOCK_SCENARIO=empty
```

- `empty` → every list/table/chart renders its real empty state, from
  `scenarios/empty_state.json`.
- `error` → every mock-data function rejects, from
  `scenarios/error_state.json`'s message — pages must show their actual
  error UI with retry, never a silently-succeeded fake result.
- `onboarding` → `scenarios/onboarding_state.json`'s incomplete records,
  for reviewing onboarding-in-progress UI.
- `default` (or unset) → the full datasets above.

## Disabling mock mode

Remove or set `NEXT_PUBLIC_USE_MOCK_DATA=false` in `.env.local`. Pages
that read customer/worker/visit/analytics data fall back to whatever
real implementation `src/lib/mock-data/service.ts`'s callers are wired
to — today, that means those specific views have no real data source
yet and should say so honestly (see "Replacing with a real backend"
below), **not** silently keep using mock data. The one feature with a
real backend already, care requests, is entirely unaffected by this
flag either way — it was real before this folder existed and stays real
regardless of `NEXT_PUBLIC_USE_MOCK_DATA`.

## Replacing the mock adapter with a real backend, later

`src/lib/mock-data/service.ts` exposes one function per data need
(`listCustomers`, `listWorkers`, `listCareRequests`, `listVisits`,
`getDashboardMetrics`, `getCareRequestStatusDistribution`,
`getCareRequestActivitySeries`, `getUpcomingVisits`, …), each returning
a plain `Promise` of the same shape a real repository function would
return. A real implementation should satisfy the same function
signatures (defined in `src/lib/mock-data/types.ts`) so the pages that
call them do not need to change — only the call site that currently
imports from `src/lib/mock-data/service.ts` needs to import a real
repository module instead. This mirrors how `src/lib/care-requests.ts`
already works against the real database: the goal is for customers/
workers/visits to eventually follow the exact same pattern, not a
different one invented just for mock data.

## A known limitation: fixed dates, not a fixed clock

`visits.json`'s `scheduled` entries use real-looking dates in
early-to-mid November 2026, chosen to be in the future relative to when
this dataset was written (late October 2026). "Upcoming visits"
(`getUpcomingVisits` in `service.ts`) filters against the real
`Date.now()`, not a fixed demo clock, so as real time passes those dates
these specific records will quietly stop appearing as "upcoming" (they
will simply never show, not error) -- `getUpcomingVisits` returning an
empty list is a correct, already-handled empty state, not a bug. If the
"upcoming visits" demo needs to look populated again after that point,
update a few `visits.json` entries' dates rather than adding a fake
clock to the service layer, which would be more machinery than this
dev-only tool needs.

## Admin CRUD and bulk actions (Customers, Workers)

`src/lib/mock-data/store.ts` adds a **mutable, in-memory, dev-process-only**
layer on top of the static JSON above, used only by the Customers and
Workers admin pages. It is deliberately separate from the read-only
`service.ts`/`loadRaw()` path every other mock-backed view uses:

- Create, edit, delete, single-record status change and bulk status/delete
  are all implemented for Customers and Workers (`src/app/customers/actions.ts`,
  `src/app/workers/actions.ts`), each calling into `store.ts`'s mutation
  functions, never touching the JSON files on disk.
- **Default status on creation** is derived, never caller-supplied: a new
  customer is `active` if a phone number and city are both given, else
  `incomplete` (mirrors the Flutter app's own `CustomerProfile.isIncomplete`
  rule); a new worker always starts `pending` ("Awaiting onboarding") —
  the real worker-lifecycle vocabulary already has this state, so nothing
  was invented for it.
- Status vocabulary stays per-entity, per the real schema: customers use
  `active`/`inactive`/`incomplete`; workers use `pending`/`active`/`suspended`.
  Care requests keep their own five-state workflow untouched by this
  layer — see below.
- Bulk actions (status change, delete) always report per-id
  succeeded/failed outcomes, never a single all-or-nothing boolean, so a
  partial failure (e.g. one id no longer exists) is visible, not hidden.
- Deletion is a real array removal, not a soft-delete -- safe here only
  because these are disposable, entirely fictional mock records with no
  downstream foreign-key relationships that matter outside this process.
  The UI explicitly labels every delete confirmation "removes ... from
  the current demo dataset only".
- **Every mutation re-checks the real Supabase staff session and the
  mock-data flag server-side**, exactly like every other action in this
  portal — a signed-out or non-staff request is refused with the same
  "You don't have permission to do that" message regardless of what the
  UI shows, confirmed live (see `docs/OPERATIONS_PORTAL.md`).
- State lives on `globalThis` so it survives Turbopack/Fast-Refresh
  module reloads during a dev session, but resets on every server
  restart -- this is explicitly not a persistence layer.
- Visits (`src/app/visits/actions.ts`) only get a single-record status
  change (no create/delete/bulk) -- a visit has no legitimate "add" flow
  without a real scheduling backend, and the brief permits scoping an
  entity down with a documented reason rather than forcing CRUD onto
  every table uniformly.
- Care requests keep using their real, already-live Supabase RPCs
  (`start_care_request_review`/`decide_care_request`) for every status
  change, single or bulk (`src/app/requests/actions.ts`'s `bulkStartReview`/
  `bulkDecide` simply loop the same trusted function once per selected
  request and report per-id results) -- no mock layer, no new RPC, and no
  bypass of the trusted functions' own business-rule checks.

## Confirmation

All names, contact details, identifiers, dates and figures in this
folder are fictional, generated for this task. No personal data, real
customer or worker records, or production database content is included
anywhere in `mock_data_for_web/`.

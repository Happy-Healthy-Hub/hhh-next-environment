# Local Demo Mode

**DEMO DATA IS LOCAL DEVELOPMENT DATA ONLY.** Every record in
`demo-data.json` is fictional -- no real customer, caregiver, staff
member, phone number, email or address appears anywhere in this file.
Nothing here is ever inserted into Supabase, ever read by the real
application, or ever reachable in a production build.

## What this is

A fully interactive, offline demonstration of the entire Operations
Portal, for showing the real approved UI and real application logic
without needing production Supabase credentials or live operational
data. It is strictly a development convenience.

## Architecture

```
UI
 ↓
existing repository functions (fetchCustomers, fetchAssignments, ...)
 ↓
 ┌──────────────────────────────────────────┐
 │ isDemoMode()?                             │
 │   yes → src/lib/demo/store.ts (in-memory) │
 │   no  → real Supabase query/RPC           │
 └──────────────────────────────────────────┘
```

Every domain module (`src/lib/{customers,caregivers,care-requests,
assignments,visits,reports,staff}.ts`) gained one `fetch*` function that
makes this choice in exactly one place. No page or component contains an
`if (DEMO_MODE)` -- they only ever call `fetchCustomers(supabase)` and
the like, unaware of which backend answered. The same discipline applies
to every mutation (`*/actions.ts`): each Server Action branches once, at
the top, between the local demo store and the real trusted RPC.

This mirrors the existing `src/lib/mock-data/` layer's own proven
pattern (`isMockDataEnabled()`, a `globalThis`-backed mutable store) --
Local Demo Mode is a separate, fuller layer built the same way, not a
rewrite of that one. The older mock-data layer still exists and still
powers the dashboard's own demo summary section (see
`OPERATIONS_PORTAL_IMPLEMENTATION_REPORT.md` "Outstanding items" for the
resulting, documented inconsistency); Local Demo Mode is the complete,
all-module layer requested for this task.

## Enabling it

```bash
# operations-portal/.env.local
NEXT_PUBLIC_DEMO_MODE=true
```

```bash
npm run dev
```

`isDemoMode()` (`src/lib/demo/config.ts`) additionally requires
`NODE_ENV !== 'production'`, exactly like the existing mock-data flag --
`next build`/`next start` set `NODE_ENV=production` automatically, so a
production deployment can never serve demo data or demo authentication
even if this variable is accidentally left `true` in an environment
file. This is the actual safety boundary; the environment variable alone
is not.

## Signing in

With Demo Mode on, `/login` shows a role picker instead of the real
email/password form -- choose any of the five fictional staff accounts
(`demo-data.json`'s `staff` array) and click "Sign in to the demo". This
sets a local, `httpOnly` cookie (`hhh_demo_staff_id`) naming which demo
account you are; it is never sent to Supabase and never creates any
Supabase account. Signing out (the same "Sign out" button everywhere
else in the portal) clears this cookie.

Two roles are available to test:
- **Administrator** (e.g. "Neha Agarwal", "Rohit Mehta") -- can reach
  every module, including Staff & Access and the audit log.
- **Coordinator** (e.g. "Asha Kelkar", "Sneha Rane") -- can reach every
  module except Staff & Access and the audit log, matching the real
  `user_roles_select`/`audit_events_select` RLS exactly.

## How data is loaded

`demo-data.json` (customers, caregivers, a handful of real HHH service
records, care requests, assignments, visits, visit notes, staff, audit
events -- every foreign key resolves to a real sibling record) is read
once by `src/lib/demo/dataset.ts`. `src/lib/demo/store.ts` clones it into
a `globalThis`-backed mutable copy the first time anything reads from it
in a given dev-server process. The JSON file on disk is **never**
written to.

## How mutations work

Every supported action -- approve/reject a request, assign or reassign a
caregiver, withdraw an assignment, schedule or cancel a visit, change a
customer's or caregiver's status, grant or revoke a staff role,
deactivate or reactivate a staff account, change your own display name
-- mutates the in-memory store directly and appends a row to its
in-memory audit log, so Staff & Access's audit view stays realistic as
you use the demo. Every mutation enforces the same business rules the
real trusted functions enforce (only an approved request can be
assigned, only an open assignment can be ended, an administrator cannot
change their own role or status, and so on) -- re-read from the actual
function bodies live this session, not guessed.

## Resetting

The header shows a "Reset Demo Data" button whenever you are signed in
under Demo Mode (never otherwise). It restores every entity to
`demo-data.json`'s committed contents -- the fixture file itself is
never touched.

## Disabling it

Set `NEXT_PUBLIC_DEMO_MODE=false` (or remove the line) and restart the
dev server, or simply run a production build (`npm run build && npm
start`), which ignores the flag entirely. With Demo Mode off:

- `/login` shows the real Supabase email/password form.
- No demo data is loaded; every page reads the real tables/RPCs.
- The "Reset Demo Data" control and the DEMO MODE badge do not render.
- Real Supabase authentication and the real repositories are completely
  unaffected -- they are the same code paths this portal always used,
  untouched by any of the above.

## Why demo data must never be used in production

- It is entirely fictional and would misrepresent real operations if
  ever shown to a real customer, caregiver or auditor.
- The local demo sign-in has no password and no real identity check --
  it must never be reachable where a real person's data is at stake.
- `isDemoMode()`'s `NODE_ENV` check is the only thing standing between
  "a developer left a flag on" and "fictional data in production" --
  that check exists precisely so a misconfigured `.env` file can never
  cause this.

## Demo dataset summary

| Entity | Count |
|---|---|
| Customers | 14 |
| Caregivers | 12 |
| Services (real HHH catalogue entries, referenced by id) | 10 |
| Care requests | 18 |
| Assignments | 10 |
| Visits | 18 |
| Visit notes | 8 |
| Staff | 5 |
| Audit events (fixture) | 15 |

Every care request references a real customer id. Every assignment
references a real care request and a real caregiver. Every visit
references a real assignment (and, through it, a real customer and
caregiver). Every visit note references a real visit. Every audit event
references a real actor and, where applicable, a real entity.

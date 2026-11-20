# Happy Healthy Hub — Operations Portal API Specification

**Status: a contract for a backend that does not exist yet.** This
document specifies the API the organisation's backend developer should
implement to let the operations portal (`D:\MITSC\Vayoshri\operations-portal\`)
run against the organisation's own server and MySQL database (see
`MySQL_migrations/001_initial_hhh_web_portal_schema.sql`), instead of
the development Supabase project it currently talks to directly.

No backend code, API route, controller, or server was created as part of
this task — this is a specification only. No endpoint described here has
been implemented or tested; every example response is illustrative,
built from the real schema and the real frontend code, not captured from
a running system.

## How this document was produced

Every endpoint, field and business rule below was taken from one of:

1. The operations portal's actual page code (`src/app/*/page.tsx`),
   components (`src/app/components/*.tsx`) and Server Actions
   (`src/app/*/actions.ts`) — to determine exactly what data each page
   displays and what mutations its UI actually offers today.
2. The live Supabase schema and trusted functions
   (`D:\MITSC\Vayoshri\withu\supabase\migrations\001_initial_core_mvp_schema.sql`,
   `002_care_request_idempotency.sql`) — for Care Requests, which already
   reads/writes real data, so its business rules are not invented here,
   only transcribed.
3. `MySQL_migrations/001_initial_hhh_web_portal_schema.sql` (this task's
   other deliverable) — every table/column name below matches that file
   exactly; see §16 for the full mapping.

Where the current web portal's mock-data layer does something the real
schema does not support (see MySQL migration README "Discrepancies
found and flagged"), this specification follows the **real** schema, not
the mock layer, and calls out the gap explicitly — it does not silently
promote a development convenience into a production contract.

---

## 1. Scope: what this portal's API covers today

The operations portal has exactly these routes today (confirmed by
listing `src/app/`): a public landing page, sign-in, an admin dashboard,
and four management pages — Customers, Workers, Care Requests, Visits &
Scheduling. **There is no Services, Reports & Analytics (beyond the
dashboard's own charts), Messages/Notifications, or Settings page.**
This specification documents detailed endpoints for what exists, and
explicitly says "not implemented" rather than inventing detail for what
doesn't — see §13H/I/J.

---

## 2. API design conventions

### 2.1 Base path and versioning

All endpoints are under a relative base path: **`/api/v1`**. No
production hostname is assumed anywhere in this document — the final
server origin is a deployment-time configuration value. A breaking
change to any endpoint's request/response shape requires a new version
segment (`/api/v2/...`); additive, backward-compatible fields do not.

### 2.2 HTTP methods

| Method | Use |
|---|---|
| `GET` | Read a resource or list. Never mutates. |
| `POST` | Create a resource, or perform an action that is not a plain field update (status transitions, bulk operations, sign-in). |
| `PATCH` | Partially update a resource's writable fields. Never used for status transitions that have business-rule side effects — those are dedicated `POST .../status` or `POST .../{action}` endpoints (see §2.9). |
| `DELETE` | Remove a single resource, where permitted (see §7/§15 for what "permitted" means per entity). |

`PUT` is not used anywhere in this contract.

### 2.3 Authentication

Every endpoint under `/api/v1/admin/*` requires authentication. **The
production authentication provider has not been chosen** (see §2.12 and
`MySQL_migrations/README.md` "Unresolved decisions"). This specification
assumes a bearer-token or signed-cookie session, carried in either:

- `Authorization: Bearer <token>`, or
- an `HttpOnly`, `Secure`, `SameSite=Lax` session cookie (the pattern the
  portal's current Supabase `@supabase/ssr` integration already uses).

Whichever mechanism is chosen, the backend must independently verify the
caller's identity **on every request** — never trust a client-supplied
user id or role (this is non-negotiable; see §15).

### 2.4 Authorisation

Three permission levels appear in this contract:

| Level | Meaning |
|---|---|
| `public` | No authentication required (the landing page has no API calls; included for completeness). |
| `authenticated` | Any signed-in user. Not used by any endpoint below — this portal is staff-only (see `withu/docs/OPERATIONS_PORTAL.md`'s scope decision; customers and workers use the Flutter app, never this portal). |
| `care_staff` | A signed-in user holding `care_coordinator`, `operations_manager` or `administrator` (see `roles` table) — the exact set `src/lib/auth.ts`'s `CARE_STAFF_ROLES` already checks today. Every `/api/v1/admin/*` endpoint requires this. |

No endpoint in this specification grants anything to a bare `customer`
or `care_associate` role — this portal has no customer- or worker-facing
API surface.

### 2.5 JSON conventions

- Request and response bodies are `application/json`, UTF-8.
- Object keys are `camelCase` (matching the portal's existing TypeScript
  types in `src/lib/mock-data/types.ts` and `src/lib/care-requests.ts`),
  even though the underlying MySQL columns are `snake_case` — the
  backend's data-access layer is responsible for this mapping.
- `id` fields are always the standard hyphenated UUID string form
  (`"3fae...-...-...-...-..."`), never the raw `BINARY(16)` the database
  stores — see `MySQL_migrations/README.md` "UUID representation".
- Timestamps are ISO-8601 with an explicit UTC offset:
  `"2026-11-03T09:30:00.000Z"`. The frontend renders these in the
  organisation's local time zone; the API never does.
- Money (only `services.basePrice` today) is a JSON string, not a
  floating-point number, to avoid precision loss: `"basePrice": "450.00"`.

### 2.6 Pagination

List endpoints accept:

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `page` | integer ≥ 1 | `1` | |
| `pageSize` | integer | `25` | Maximum `100`. A request for more is clamped to `100`, not rejected — avoids breaking a client that doesn't yet know the limit. |

Response shape:

```json
{
  "data": [ /* array of resources */ ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 142,
    "totalPages": 6
  }
}
```

Sorting is stable (a secondary `id ASC` tiebreaker is always applied
server-side) so pagination never duplicates or skips a row when two
records share the primary sort value.

### 2.7 Sorting

`sortBy` (one of the resource's documented sortable fields) and
`sortOrder` (`asc` | `desc`, default `asc`). An unrecognised `sortBy`
value is a `400` validation error (§14), not a silent fallback — a
silently-ignored sort parameter is confusing to debug.

### 2.8 Filtering and search

- `search` — a case-insensitive substring match against the fields
  documented per resource (§13D/E use MySQL `FULLTEXT` on the indexed
  name columns; a short or stop-word-only query may fall back to `LIKE`
  — an implementation detail the backend decides, not specified here).
- `status` — exact match against the resource's real status vocabulary
  (§6 of the MySQL migration). Repeating the parameter
  (`?status=active&status=inactive`) means "any of these"; an
  unrecognised status value is a `400` validation error, not silently
  dropped.
- `city`, `from`, `to` and other resource-specific filters are
  documented per endpoint below.

### 2.9 Status-transition conventions

A status change that has business-rule side effects (Care Requests,
Care Assignments, Visits) is **never** a generic
`PATCH .../{id} { "status": "..." }`. It is always a dedicated endpoint
(`POST .../{id}/start-review`, `POST .../{id}/decide`, etc.) that:

1. Validates the record is currently in a state the transition allows.
2. Performs the transition and every side-effect field the real schema
   requires (e.g. `decided_at`, `decided_by` — see migration comments).
3. Returns the updated resource.

This mirrors the real Supabase schema's own design exactly: these
transitions are currently implemented as `SECURITY DEFINER` functions
(`start_care_request_review`, `decide_care_request`) specifically so a
client cannot set an arbitrary status string — the backend must
reproduce the same restriction, not relax it because MySQL has no RLS.

Customers and Workers, which have no multi-step workflow in the real
schema (just a flat status value), use a simpler
`PATCH .../{id}/status { "status": "..." }` endpoint — still separate
from the general-purpose `PATCH .../{id}` field-update endpoint, so a
client cannot smuggle a status change into an otherwise-unrelated field
edit (and so the backend can apply a different, narrower permission
check to status changes if the organisation later wants one).

### 2.10 Idempotency

Only Care Request **creation** has an established idempotency contract
today (the real schema's `care_requests.idempotency_key`, added in
Supabase migration 002) — and that operation belongs to the mobile app's
`submit_care_request`, not this web portal (see §13F). No endpoint
documented below as "implemented by the web portal" currently needs
idempotent retry, because none of them performs a create-with-side-effects
operation from an unreliable mobile network; they are all either reads,
simple field updates, or status transitions that are naturally safe to
retry (retrying `start-review` on an already-`under_review` request
simply returns a `409`, not a duplicate side effect).

### 2.11 Bulk-operation conventions

Every bulk endpoint in this contract:

- Takes an array of `ids` (same type as the resource's single-record
  endpoint) plus whatever the action needs (e.g. target `status`).
- Enforces a **maximum batch size of 200** ids per request — a
  reasoned assumption, not drawn from an existing limit anywhere in the
  codebase (none exists yet); chosen so a single request stays well
  within a typical HTTP body-size and statement-timeout budget while
  still comfortably covering "select all on one page" at the default
  `pageSize` of 25–100. A request over 200 ids is a `400` validation
  error, not silently truncated.
- Is **not atomic across records**: each id is processed independently
  inside its own transaction, and the response reports **per-id**
  success/failure (see §2.11.1) — exactly matching the portal's existing
  mock-data bulk implementation (`src/lib/mock-data/store.ts`'s
  `BulkResult` type: `{ succeeded: string[], failed: { id, message }[] }`)
  and the existing Care Requests bulk pattern
  (`src/app/requests/actions.ts`'s `bulkStartReview`/`bulkDecide`, which
  loop the same trusted single-record operation). **This specification
  does not claim atomicity** — a caller must not assume "all succeed or
  none do."
- Duplicate ids in the input are de-duplicated server-side before
  processing (each distinct id is attempted once, appears once in the
  response).
- An id that no longer exists, or that the caller lacks permission for,
  is reported as a **failure for that id** (`"NOT_FOUND"` or
  `"FORBIDDEN"` respectively — see §2.11.1), never silently skipped and
  never treated as success.
- After a bulk call, the frontend is expected to re-fetch the affected
  list and the dashboard overview (matching the portal's current
  `router.refresh()` pattern after every mutation) — the bulk response
  itself does not push updated KPI values.

#### 2.11.1 Bulk response shape

```json
{
  "succeeded": ["3fae2b10-...", "9c21af40-..."],
  "failed": [
    { "id": "aa11bb22-...", "code": "NOT_FOUND", "message": "Customer not found." },
    { "id": "cc33dd44-...", "code": "FORBIDDEN", "message": "You don't have permission to do that." }
  ]
}
```

HTTP status is `200` whenever the request itself was well-formed, even
if every individual record failed — the per-id outcomes are the source
of truth, not the HTTP status. A malformed request (bad JSON, missing
required field, batch over 200) is still a `400` at the whole-request
level (§14).

### 2.12 Authentication-provider-neutral note

This portal currently authenticates against a live Supabase Auth
project. **Moving to the organisation's own server does not require
using the same provider** — this specification's `/api/v1/auth/*`
endpoints (§13A) describe the contract any provider must satisfy
(issue a session, identify the current user, let them sign out), not a
specific implementation. The unresolved decision of *which* provider is
flagged in `MySQL_migrations/README.md` and repeated at the top of §13A.

---

## 3. Standard error contract

Every error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "fields": [
      { "field": "fullName", "message": "Full name is required." }
    ]
  }
}
```

`fields` is present only for `VALIDATION_ERROR` (§3's structured
field-error format the frontend needs to show errors beside the
relevant input, matching the portal's existing form components —
`CustomerFormDialog`/`WorkerFormDialog` already render a single error
banner today, which the backend's structured response lets a future
revision upgrade to per-field errors without an API change).

| HTTP status | `code` | Meaning |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Malformed request, bad field value, batch too large. |
| `401` | `UNAUTHENTICATED` | No valid session. |
| `403` | `FORBIDDEN` | Authenticated, but lacks `care_staff` role, or lacks object-level permission for the specific record. |
| `404` | `NOT_FOUND` | Record does not exist (or the caller cannot see it — see §15, a `404` is returned instead of a `403` for object-level denial to avoid confirming existence to an unauthorised caller, matching the real schema's own `submit_care_request` comment: "never reveal whether a request exists to an unauthorised caller"). |
| `409` | `CONFLICT` | Duplicate record (e.g. a `serviceCode` that already exists), or an invalid status transition (record is not in the state the operation requires — mirrors the real schema's `55000` SQLSTATE for exactly this case). |
| `422` | `UNPROCESSABLE` | Well-formed request that violates a business rule not covered by `VALIDATION_ERROR` (e.g. a database `CHECK`/foreign-key constraint rejection the backend didn't catch first — defence in depth, not the primary validation path). |
| `429` | `RATE_LIMITED` | Reserved for sensitive auth operations (§13A sign-in, password reset) — not applied to ordinary `admin/*` endpoints in this specification. |
| `500` | `INTERNAL_ERROR` | Unexpected server error. **The message is always a generic, safe string** — never a SQL statement, stack trace, file path, or internal exception message. Log the real detail server-side only. |

No error response anywhere includes a password, token, API key, stack
trace, or raw SQL.

---

## 4. KPI and chart definitions (dashboard — `GET /api/v1/admin/overview` and `/api/v1/admin/analytics/*`)

These definitions are transcribed exactly from the portal's current
dashboard code (`src/app/dashboard/page.tsx`), not invented — the goal
is that the production backend computes the *same numbers* the
development build already shows.

| KPI | Definition | Included statuses | Source |
|---|---|---|---|
| Total care requests | `COUNT(*)` of all `care_requests` rows, no status filter | all 5 | `care_requests` |
| Requests awaiting review | `COUNT(*) WHERE status = 'submitted'` | `submitted` only | `care_requests` |
| Open requests | `COUNT(*) WHERE status IN ('submitted', 'under_review')` | `submitted` + `under_review` — **not** the same set as "awaiting review"; these two KPIs intentionally overlap (every "awaiting review" request is also "open"), they are not mutually exclusive categories | `care_requests` |
| Approved | `COUNT(*) WHERE status = 'approved'` | `approved` only | `care_requests` |
| Total customers | `COUNT(*)` of all `customers` rows | both statuses (no exclusion of `inactive`) | `customers` |
| New customers (30 days) | `COUNT(*) WHERE created_at >= (NOW() - INTERVAL 30 DAY)` | both statuses | `customers` |
| Active workers | `COUNT(*) WHERE status = 'active'` | `active` only | `workers` |
| Scheduled visits | `COUNT(*) WHERE status = 'scheduled'` | `scheduled` only | `visits` |

None of these KPIs excludes a "deleted" row, because no table in this
schema has a soft-delete/`deleted_at` column (§7/§9 of the MySQL
migration — deletion is a hard `DELETE`, blocked by `RESTRICT` foreign
keys once a record has history; see §15 for the resulting behaviour).

**Care-request KPIs are a current total, not date-filtered** (no
`from`/`to` on `/api/v1/admin/overview`), matching
`src/app/dashboard/page.tsx` exactly: it always queries the full
`care_requests` table. "New customers (30 days)" is the one exception —
it is a genuinely date-filtered metric, computed exactly as the mock
service's `getDashboardMetrics()` already does (`src/lib/mock-data/service.ts`).

### 4.1 Charts

| Chart | Metric | Grouping | Response shape | Empty-data behaviour |
|---|---|---|---|---|
| Care requests over time | `COUNT(*)` of `care_requests` grouped by calendar month of `created_at` | 1 month | `[{ "date": "2026-10-01", "label": "Oct 2026", "count": 4 }, ...]`, oldest first | Only months with ≥1 request appear — **no zero-filled gap months** (matches `getCareRequestActivitySeries()` exactly) |
| Care-request status distribution | `COUNT(*)` grouped by `status` | — | `[{ "status": "submitted", "label": "Submitted", "count": 4 }, ...]` for **all 5** statuses, even `count: 0` | Every status row is always present, even at 0 — unlike the time-series chart above, this is a fixed category axis |
| Service demand | `COUNT(*)` of `care_request_items` grouped by `service_id`, joined to `services.name` | — | `[{ "status": "<serviceId>", "label": "Companion visit (1 hour)", "count": 7 }, ...]`, sorted by count descending | Services with **zero** requests are **omitted**, not shown as a zero-height bar (matches `getServiceDemand()` exactly) |
| Upcoming visits | `visits` joined to `care_assignments`→`care_requests`→`customers` and `workers`, `WHERE status = 'scheduled' AND scheduled_start_at >= NOW()` | — | `[{ "visit": {...}, "customerName": "...", "workerName": "...", "serviceNames": [...] }, ...]`, earliest first | Empty array if none — the frontend already renders its own `EmptyState` for this (`EmptyState.tsx`) |

No endpoint above accepts a `from`/`to` date-range parameter in the
current implementation — none of the portal's existing charts offer a
date-range picker (`ActivityChart`/`BarChart` always render the whole
available range). This specification does not invent one.

---

## 5. Authentication and current user (`/api/v1/auth/*`)

**Provider-neutral contract — the final implementation is an unresolved
decision (§2.12).** Every endpoint below describes required behaviour,
not a specific provider's API shape.

### 5.1 Sign in

1. Endpoint name: Sign in
2. Method: `POST`
3. URL: `/api/v1/auth/sign-in`
4. Purpose: Authenticate a staff member and start a session.
5. Auth required: No (this *is* the auth endpoint)
6. Required role: None
7. Request parameters: none
8. Request body:
   ```json
   { "email": "coordinator@example.org", "password": "••••••••" }
   ```
9. Example request: as above
10. Success response (`200`):
    ```json
    {
      "user": { "id": "6dcf5959-...", "email": "coordinator@example.org", "displayName": "A. Coordinator" },
      "roles": ["care_coordinator"]
    }
    ```
    plus a session cookie or bearer token per the chosen provider.
11. Response fields: `user.id` — the `users.id` UUID; `roles` — every
    `role_key` the user holds (§6 `user_roles`).
12. Errors: `401 UNAUTHENTICATED` for a wrong email/password (the
    response **must not** reveal whether the email exists — matches the
    portal's current `LoginForm.tsx` behaviour exactly, already verified
    live this session: "the live Supabase Auth endpoint correctly
    returned an error... without revealing whether the email exists").
    `429 RATE_LIMITED` after repeated failures for the same email/IP.
13. Validation: `email` well-formed, `password` non-empty.
14. Data source: `users` (+ whatever credential store the chosen
    provider owns — **never** a plaintext password column in `users`).
15. Business rules: A successful sign-in for a user with **no**
    `care_staff` role still succeeds at the auth layer (their identity is
    real) but every subsequent `/admin/*` call returns `403` — matches
    `src/app/not-authorized/page.tsx`'s existing behaviour.
16. Frontend: `src/app/login/LoginForm.tsx`.

### 5.2 Sign out

1. Sign out
2. `POST`
3. `/api/v1/auth/sign-out`
4. Invalidate the current session.
5. Auth required: Yes
6. Role: any signed-in user
7–8. No parameters/body.
9. —
10. `204 No Content`.
11. —
12. `401` if already signed out (idempotent-safe to call anyway; treat as success in that case rather than erroring, since the end state the caller wants is already true).
13. —
14. The session/token store.
15. Must invalidate server-side state (a revoked token/cookie), not just tell the client to forget it.
16. `src/app/components/AdminHeader.tsx`'s "Sign out" form (currently posts to `/auth/signout`, a Next.js route — this is the equivalent backend endpoint for a non-Next backend).

### 5.3 Current user

1. Current user
2. `GET`
3. `/api/v1/auth/me`
4. Return the authenticated user's identity and roles, for the frontend's role-aware routing/redirect logic.
5. Auth required: Yes
6. Role: any signed-in user (not `care_staff`-gated — the portal needs this to decide whether to show the `/not-authorized` page)
7–8. None.
9. —
10. `200`:
    ```json
    { "id": "6dcf5959-...", "email": "coordinator@example.org", "displayName": "A. Coordinator", "roles": ["care_coordinator"], "isCareStaff": true }
    ```
11. `isCareStaff` — pre-computed boolean (`roles` intersects `{care_coordinator, operations_manager, administrator}`), matching `src/lib/auth.ts`'s `StaffSession.isCareStaff` field exactly, so the frontend doesn't duplicate that role list.
12. `401` if no valid session.
13. —
14. `users`, `user_roles`.
15. This is a **UX convenience, not the security boundary** — every other endpoint independently re-checks the role server-side regardless of what this endpoint last returned, exactly matching the existing comment in `src/lib/auth.ts`.
16. `src/app/dashboard/page.tsx`, `src/app/customers/page.tsx`, every admin page's `loadStaffSession` call.

### 5.4 Account recovery / password reset

**Not implemented by the current portal** (there is no "forgot
password" UI anywhere in `src/app/login/`). Document as a dependency on
the chosen auth provider: if the provider is Supabase Auth or a similar
managed service, it likely provides this natively; if a custom backend
owns credentials, it must implement `POST /api/v1/auth/request-password-reset`
and `POST /api/v1/auth/reset-password` with a time-limited, single-use
token emailed to the account — not specified further here because no
frontend page currently depends on an exact shape.

### 5.5 Session refresh

Only relevant if the chosen provider uses short-lived access tokens +
refresh tokens (e.g. Supabase's pattern). If a long-lived
`HttpOnly` session cookie is chosen instead, no separate refresh
endpoint is needed. **Decide alongside §2.12.**

### 5.6 Customer/worker onboarding via the website

**Not implemented.** This portal has no public sign-up form (the
landing page, `src/app/page.tsx`, only links to staff sign-in).
Customers and workers are created by staff through §13D.1/§13E.1 below,
which is a profile-record creation, not an authentication-account
creation — see §13D.1's own note on this distinction.

---

## 6. Customers (`/api/v1/admin/customers`)

All require `care_staff`. Writable fields: `fullName`, `preferredName`,
`phoneNumber`, `email`, `city`. **Read-only**: `id`, `status` (changed
only via §6.5/§6.6), `createdAt`/`updatedAt`. There is no concept of "a
customer viewing their own profile" in this portal at all — it is
staff-only, so object-level authorisation here only ever means "is the
caller `care_staff`," never "does this customer belong to the caller."

### 6.1 List customers

1. List customers
2. `GET`
3. `/api/v1/admin/customers`
4. Paginated, searchable, filterable, sortable customer list.
5. Auth: Yes · 6. Role: `care_staff`
7. Query parameters: `page`, `pageSize` (§2.6); `sortBy` ∈
   `fullName|city|status|createdAt` (default `createdAt`), `sortOrder`
   (§2.7); `search` (matches `fullName`, `preferredName`, `phoneNumber`,
   `email`, `city` — mirrors `CustomersTable.tsx`'s client-side filter
   exactly, now server-side); `status` ∈ `active|inactive` (repeatable).
8. No body.
9. `GET /api/v1/admin/customers?search=Pune&status=active&page=1&pageSize=25&sortBy=fullName&sortOrder=asc`
10. `200`:
    ```json
    {
      "data": [
        { "id": "3fae2b10-...", "fullName": "Lakshmi Iyer", "preferredName": "Lakshmi",
          "phoneNumber": "+91 90000 00001", "email": null, "city": "Pune",
          "status": "active", "createdAt": "2026-07-03T00:00:00.000Z", "updatedAt": "2026-07-03T00:00:00.000Z" }
      ],
      "pagination": { "page": 1, "pageSize": 25, "totalItems": 1, "totalPages": 1 }
    }
    ```
11. See field list above; `status` is one of the real two values — see
    §6.0 note below on `isProfileIncomplete`.
12. `400` bad `sortBy`/`status`/batch size; `401`/`403` as §3.
13. `pageSize` clamps to 100; unrecognised `status` value is `400`.
14. `customers` table, `FULLTEXT` index `customers_full_name_fulltext`,
    `customers_status_idx`, `customers_city_idx`.
15. See §6.0.
16. `src/app/customers/page.tsx` + `src/app/components/CustomersTable.tsx`.

**§6.0 — the `incomplete` status discrepancy (see `MySQL_migrations/README.md`):**
the real schema has no third "incomplete" status. This endpoint's
response adds a **computed, non-stored** boolean,
`"isProfileIncomplete": true`, wherever `phoneNumber IS NULL OR city IS
NULL` — giving the frontend the same signal its current mock layer's
`incomplete` status provides, without the backend inventing a database
status the real schema doesn't have. The frontend's status badge/filter
should be updated to use `status` + `isProfileIncomplete` together once
this API is implemented, rather than expecting a server-returned
`"incomplete"` status string.

### 6.2 Get customer

1. Get customer · 2. `GET` · 3. `/api/v1/admin/customers/{customerId}`
4. Single customer's full detail. 5–6. `care_staff`.
7. Path: `customerId` (UUID). 8. None.
9. `GET /api/v1/admin/customers/3fae2b10-...`
10. `200`: same shape as a list row.
11. — 12. `404` if not found. 13. `customerId` must be a valid UUID, else `400`.
14. `customers`. 15. — 16. Not currently used (no customer detail page exists yet — `CustomersTable.tsx` has no row-click-through); included for completeness/future use.

### 6.3 Create customer

1. Create customer · 2. `POST` · 3. `/api/v1/admin/customers`
4. Create a new customer profile record.
5–6. `care_staff`.
7. None. 8. Body:
   ```json
   { "fullName": "New Customer", "preferredName": null, "phoneNumber": "+91 90000 00099", "email": null, "city": "Delhi" }
   ```
9. As above.
10. `201`:
    ```json
    { "id": "f1a2...-...", "fullName": "New Customer", "status": "active", "isProfileIncomplete": false, "createdAt": "2026-10-28T...", "updatedAt": "2026-10-28T..." }
    ```
11. `status` is **always server-derived, never caller-supplied** — `active`
    if both `phoneNumber` and `city` are present at creation, otherwise
    `inactive` *(see §6.0: this endpoint uses the real two-value
    vocabulary; `isProfileIncomplete` is the derived flag, not a third
    status)*. This exactly matches the business rule the portal's
    existing mock implementation already applies
    (`src/lib/mock-data/store.ts`'s `deriveNewCustomerStatus`), adjusted
    only to use the real status vocabulary instead of inventing
    `incomplete`.
12. `400 VALIDATION_ERROR` (blank `fullName`, malformed `email`); `403`
    if not `care_staff`.
13. `fullName` required, non-blank; `email` RFC-shaped if present; all
    other fields optional.
14. `customers`, `created_by` set to the caller's `users.id`.
15. **This creates a profile record only — it does not create an
    authentication account.** This customer cannot sign in anywhere
    unless/until a separate, explicit "invite" or "link account"
    operation (not built by any page today) associates a `users` row.
    Do not conflate the two, per this task's own explicit instruction.
16. `src/app/components/CustomersTable.tsx`'s `CustomerFormDialog`
    (Add mode) → `src/app/customers/actions.ts`'s `createCustomerAction`.

### 6.4 Update customer

1. Update customer · 2. `PATCH` · 3. `/api/v1/admin/customers/{customerId}`
4. Edit permitted fields. 5–6. `care_staff`.
7. Path: `customerId`. 8. Body: any subset of `fullName`,
   `preferredName`, `phoneNumber`, `email`, `city`.
9. `PATCH /api/v1/admin/customers/3fae2b10-... { "city": "Mumbai" }`
10. `200`: full updated resource.
11. — 12. `404`; `400 VALIDATION_ERROR`; `403`.
13. Same per-field rules as create; omitted fields are left unchanged
    (never reset to `null`).
14. `customers`.
15. **`status` is never accepted by this endpoint**, even if present in
    the body — it is silently ignored (or, preferably, rejected with
    `400 VALIDATION_ERROR` naming `status` as an unknown/forbidden field,
    the stricter and recommended choice) to prevent a client from
    smuggling a status change through the general update path, per
    §2.9. `id`, `createdAt` are likewise never writable.
16. `CustomerFormDialog` (Edit mode) → `updateCustomerAction`.

### 6.5 Change customer status

1. Change customer status · 2. `PATCH` · 3. `/api/v1/admin/customers/{customerId}/status`
4. Set `active`/`inactive`. 5–6. `care_staff`.
7. Path: `customerId`. 8. Body: `{ "status": "inactive" }`.
9. As above.
10. `200`: updated resource.
11. — 12. `404`; `409 CONFLICT` if `status` isn't `active`/`inactive`; `403`.
13. `status` ∈ `active|inactive` only — **not** `incomplete` (§6.0: it is
    never a settable value from this or any endpoint).
14. `customers`.
15. No further side effects today (the real schema has no trigger tied
    to this field beyond the CHECK constraint itself).
16. `CustomersTable.tsx`'s per-row status `<select>` → `setCustomerStatusAction`.

### 6.6 Bulk status / bulk delete

1. Bulk customer status / Bulk delete customers
2. `POST` (both)
3. `/api/v1/admin/customers/bulk-status`, `/api/v1/admin/customers/bulk-delete`
4. Apply a status change, or delete, to up to 200 customers at once.
5–6. `care_staff`.
7. None. 8. `{ "ids": ["...", "..."], "status": "inactive" }` (status
   endpoint only).
9. —
10. `200`: the bulk response shape (§2.11.1).
11. — 12. `400` (batch > 200, missing `ids`); per-id `NOT_FOUND`/
    `FORBIDDEN` inside the response body, not as the HTTP status.
13. Same field rules as the single-record operation, applied per id.
14. `customers`.
15. **Not atomic** (§2.11) — a batch of 10 where 2 ids no longer exist
    succeeds for the other 8 and reports the 2 as `NOT_FOUND`.
16. `CustomersTable.tsx`'s `BulkActionBar` → `bulkSetCustomerStatusAction`/`bulkDeleteCustomersAction`.

### 6.7 Delete customer

1. Delete customer · 2. `DELETE` · 3. `/api/v1/admin/customers/{customerId}`
4. Remove a customer record. 5–6. `care_staff`.
7. Path: `customerId`. 8. None.
9. —
10. `204 No Content`.
11. — 12. `404`; **`409 CONFLICT`** if the customer has any `care_requests`
    row (the `customers`→`care_requests` foreign key is `ON DELETE
    RESTRICT` — see MySQL migration §4/§6) — the error message must say
    so plainly, e.g. *"This customer has existing care requests and
    cannot be deleted. Deactivate them instead."*
13. — 14. `customers` + a `care_requests` existence check.
15. **This is a real, permanent delete against production data** — unlike
    the portal's current mock-only delete (which only ever removes a
    fictional dev record and says so explicitly in its confirmation
    dialog). The frontend's confirmation copy must be updated once this
    is backed by a real database to no longer say "removes ... from the
    current demo dataset only."
16. `CustomersTable.tsx`'s per-row Delete button → `deleteCustomerAction`.

---

## 7. Workers (`/api/v1/admin/workers`)

Structurally identical to §6 (list/get/create/update/status/bulk/delete
at the equivalent `/api/v1/admin/workers*` paths), so only the
differences are documented in full here.

**Status vocabulary (§6.0-equivalent note):** per
`MySQL_migrations/README.md`'s flagged discrepancy, this endpoint set
uses the real three-value vocabulary `active|inactive|suspended` — not
the portal's current mock `pending|active|suspended`. A newly created
worker defaults to **`inactive`**, not `pending`
(`POST /api/v1/admin/workers` ignores any `status` in the request body,
exactly like §6.3). If the organisation later adopts a real "pending/
awaiting onboarding" status (an open decision, see migration README),
this is the endpoint whose default-status rule and `409` validation set
would need to change, alongside a new migration.

**Fields:** writable — `fullName`, `phoneNumber`, `email` (all three
required on create, matching `src/app/components/WorkersTable.tsx`'s
`WorkerFormDialog` validation exactly: *"Full name, phone number and
email are all required"*). Read-only — `id`, `status`, `createdAt`/`updatedAt`.

**Not included as fields:** `trainingStatus`, `availability` — these
exist only in the portal's mock data (`MockWorker.trainingStatus`/
`availability`) with no real-schema column backing them (see MySQL
migration §7 comment). `GET /api/v1/admin/workers` therefore does
**not** return these fields; if the organisation wants them in
production, that is a new, explicit schema requirement to capture from
the business, not assumed here.

**Deletion (`DELETE /api/v1/admin/workers/{workerId}`):** blocked with
`409 CONFLICT` if the worker has any `care_assignments` row (`workers`→
`care_assignments` is `ON DELETE RESTRICT`), same pattern as customers.

**Distinction the real schema supports, that this portal's UI does not
yet surface:** "registered" (`inactive`, newly created) vs. "approved/
active" (`active`) vs. "suspended" are the only three states; there is
no fourth "available-right-now" state in the database — the portal's
mock `availability` field (`available`/`assigned`/`on_leave`/
`unavailable`) is a UI-only concept layered on top, not present here.

Frontend: `src/app/workers/page.tsx`, `src/app/components/WorkersTable.tsx`,
`src/app/workers/actions.ts`.

---

## 8. Care Requests (`/api/v1/admin/care-requests`)

This is the one resource already backed by a real, live database today
— every rule below is transcribed from the actual trusted functions
(`start_care_request_review`, `decide_care_request` in
`withu/supabase/migrations/001_initial_core_mvp_schema.sql`), not
inferred from UI behaviour.

### 8.1 List care requests

1. List care requests · 2. `GET` · 3. `/api/v1/admin/care-requests`
4. All requests visible to any `care_staff` account (the real RLS policy
   `care_requests_select` grants every care-staff account the same
   visibility — **no per-staff caseload restriction exists** in the
   schema, and this API must not invent one either, matching
   `withu/docs/OPERATIONS_PORTAL.md`'s explicit note on this).
5–6. `care_staff`.
7. `page`, `pageSize`, `sortBy` ∈ `status|createdAt|preferredStartDate`
   (default: `status ASC, createdAt DESC`, matching
   `src/app/requests/page.tsx`'s current ordering exactly), `sortOrder`,
   `status` (repeatable), `search` (customer name).
8. None.
9. `GET /api/v1/admin/care-requests?status=submitted&status=under_review`
10. `200`: list of
    ```json
    {
      "id": "7c9e...-...", "status": "submitted",
      "customer": { "id": "3fae2b10-...", "fullName": "Lakshmi Iyer", "preferredName": "Lakshmi" },
      "items": [{ "serviceId": "...", "serviceName": "Companion visit (1 hour)", "notes": null }],
      "preferredStartDate": "2026-11-05", "preferredEndDate": null,
      "preferredTimeOfDay": "morning", "scheduleNotes": null, "customerNotes": null,
      "decisionReason": null, "cancellationReason": null,
      "createdAt": "2026-10-20T...", "updatedAt": "2026-10-20T..."
    }
    ```
11. Matches `src/lib/care-requests.ts`'s `CareRequest` TypeScript type
    field-for-field.
12. Standard §3 errors.
13. — 14. `care_requests` joined to `customers`, `care_request_items`→`services`.
15. See §4's KPI definitions for how "open"/"awaiting review" are
    computed from this same status field.
16. `src/app/requests/page.tsx`.

### 8.2 Get care request detail

Same shape as a list row plus the full detail already shown on
`src/app/requests/[id]/page.tsx` (services with price labels, schedule
notes). `GET /api/v1/admin/care-requests/{requestId}`. `404` if the id
doesn't exist.

### 8.3 Start review

1. Start review · 2. `POST` · 3. `/api/v1/admin/care-requests/{requestId}/start-review`
4. Transition `submitted` → `under_review`.
5–6. `care_staff`.
7. Path: `requestId`. 8. None.
9. —
10. `200`: updated resource (`status: "under_review"`, `reviewStartedAt`
    and `reviewedBy` set).
11. — 12. `404`; **`409 CONFLICT`** if the request is not currently
    `submitted` — message: *"This request could not be found, or is no
    longer in the expected state. Reload to see its current status."*
    (verbatim from the existing `mapError()` in
    `src/app/requests/[id]/actions.ts`, since the real function
    genuinely cannot distinguish "not found" from "wrong state" —
    neither should this endpoint pretend to).
13. — 14. `care_requests`, setting `status`, `review_started_at`,
    `reviewed_by`.
15. **Exactly reproduces `start_care_request_review`'s own two checks**:
    caller is `care_staff`, and the row is currently `submitted` —
    enforced with `UPDATE ... WHERE id = ? AND status = 'submitted'` and
    checking the affected-row count, the same atomic-compare-and-set
    pattern the real function uses (via Postgres `FOUND`), to avoid a
    race between two staff reviewing the same request simultaneously.
16. `src/app/requests/[id]/RequestActions.tsx` → `startReview()`.

### 8.4 Decide (approve/reject)

1. Decide care request · 2. `POST` · 3. `/api/v1/admin/care-requests/{requestId}/decide`
4. Transition `under_review` → `approved`/`rejected`.
5–6. `care_staff`.
7. Path: `requestId`. 8. `{ "decision": "approved" | "rejected", "reason": "string or null" }`.
9. `{ "decision": "rejected", "reason": "No availability in the requested window." }`
10. `200`: updated resource with `decidedAt`, `decidedBy`, `decisionReason` set.
11. — 12. `404`/`409` as §8.3; `400 VALIDATION_ERROR` if `decision` isn't
    exactly `approved`/`rejected`.
13. **`reason` is required when `decision = "rejected"`** (matches
    `care_requests_rejection_reason` CHECK) — optional for `approved`.
14. `care_requests`.
15. Same atomic compare-and-set as §8.3, gated on `status = 'under_review'`.
16. `src/app/requests/[id]/RequestActions.tsx` → `decideRequest()`.

### 8.5 Bulk start-review / bulk decide

1. Bulk start review / Bulk decide
2. `POST` (both)
3. `/api/v1/admin/care-requests/bulk-start-review`,
   `/api/v1/admin/care-requests/bulk-decide`
4. Loop §8.3/§8.4 per selected id, report per-id outcome.
5–6. `care_staff`.
7. None. 8. `{ "ids": [...] }` / `{ "ids": [...], "decision": "...", "reason": "..." }`.
9–10. §2.11.1 shape.
11. — 12. Per-id `CONFLICT` for any request no longer in the expected
    state — **never silently skipped**.
13. A mixed selection (some `submitted`, some `under_review`) is a
    **frontend-level** restriction today (`RequestsBulkSection.tsx`
    disables the action and shows *"Select only submitted requests to
    start review, or only in-review requests to decide"* rather than
    sending a request at all) — the backend should still defend this
    itself (report `CONFLICT` per mismatched id) rather than relying on
    the frontend never sending a mixed batch.
14. `care_requests`.
15. **No new RPC/stored procedure — this loops the existing single-record
    trusted operation once per id**, exactly matching
    `src/app/requests/actions.ts`'s current implementation. Do not
    invent a batch-UPDATE shortcut that bypasses the per-row state check,
    since that would let one request in an unexpected state silently
    corrupt a batch that should have partially succeeded.
16. `src/app/requests/RequestsBulkSection.tsx`.

### 8.6 Not implemented by the web portal (documented for mobile compatibility only)

| Real operation | Owner | Why not exposed here |
|---|---|---|
| `submit_care_request` (create) | Mobile app | The web portal has no "new care request" form — staff review requests customers submit, they don't submit on a customer's behalf through this UI today. If this changes, the endpoint is `POST /api/v1/admin/care-requests` with the exact same `customerId`/`serviceIds`/`preferredStartDate`/`idempotencyKey` parameters `submit_care_request` already takes — do not redefine these field names. |
| `cancel_care_request` | Mobile app (customer-initiated) | No cancel button exists in this portal's UI. |
| `assign_care_associate` | Not yet built in either client | `care_assignments` exists in the MySQL schema (read by §4's "Upcoming visits") but no page writes to it. A future "Assign worker" feature should be `POST /api/v1/admin/care-requests/{requestId}/assign { "workerId": "..." }`, reproducing `assign_care_associate`'s own checks (request must be `approved`, worker must be `active`) — not specified further since no UI depends on an exact shape yet. |

---

## 9. Visits (`/api/v1/admin/visits`)

### 9.1 List upcoming visits

`GET /api/v1/admin/visits?status=scheduled` — same filter/sort/paginate
conventions as §6/§7. Default view (no `status` filter from the
frontend today) matches `getUpcomingVisits()` exactly: `status =
'scheduled' AND scheduled_start_at >= NOW()`, earliest first. The
backend should support `status` filtering for all five real values
(§Discrepancies: `in_progress` included, even though no UI shows it
yet) and a `from`/`to` date range even though the current frontend
doesn't send one — a reasonable, low-cost superset for the one list
endpoint most likely to need date filtering next.

### 9.2 Change visit status

1. Change visit status · 2. `PATCH` · 3. `/api/v1/admin/visits/{visitId}/status`
4. Single-record status change only.
5–6. `care_staff`.
7. Path: `visitId`. 8. `{ "status": "completed" }`.
9–10. Standard.
11. — 12. `404`; `409` if the target status violates the real schema's
    attendance-consistency CHECKs (§9 of the MySQL migration) — e.g.
    setting `completed` without `checkedInAt`/`checkedOutAt` already
    recorded, which this portal's UI has no way to set yet (see below).
13. `status` ∈ the five real values.
14. `visits`.
15. **No bulk endpoint for visits** — a deliberate, documented scope
    decision (matches `src/app/visits/actions.ts`'s own comment: *"no
    admin-facing create/delete flow here... no bulk action"*). **No
    check-in/check-out endpoints either** — the real schema's
    `checked_in_at`/`checked_out_at` fields exist and are required
    before a visit can reach `completed` (§9's CHECK constraints), but
    no page in this portal collects attendance data; a naive
    implementation of this endpoint that only sets `status = 'completed'`
    without those fields **will fail the database CHECK constraint** —
    flagging this explicitly as a gap the backend developer must resolve
    (either build check-in/out endpoints first, or have this endpoint
    reject `completed` as an unsupported target status until they
    exist) rather than silently working around the real schema's own
    integrity rule.
16. `src/app/components/VisitsTable.tsx` → `setVisitStatusAction`.

### 9.3 Not implemented

Creating/scheduling a visit, editing scheduled times, and recording
check-in/check-out — no UI exists for any of these in the portal today.
No scheduling-conflict policy has been defined anywhere in the codebase
or governing docs; this specification does not invent one, per this
task's explicit instruction.

---

## 10. Services (`/api/v1/admin/services`) — schema exists, UI does not

No Services management page exists in the portal (confirmed: no
`src/app/services/` route). The `services` table is required (§5/§8)
because `care_request_items` and the service-demand chart depend on it,
but this specification does not invent detailed Create/Update/
Deactivate endpoints for a page that was never built. If the
organisation adds a Services page later, the endpoint set is a
straightforward instance of the §6 pattern against `serviceCode`
(unique), `name`, `description`, `basePrice` (string-encoded decimal,
§2.5), `currencyCode`, `priceUnit` ∈ `per_visit|per_hour|per_day`, and
`isActive` (deactivate, never delete — `care_request_items` references
historical services, §6 of the MySQL migration).

---

## 11. Messages / Notifications — not implemented

No messaging or notification feature exists anywhere in this portal
(confirmed: no route, no component, no mock data file for it — the
original mock-data patch prompt for this repository explicitly chose to
skip this category: *"explicitly skip categories with no real/planned
screen, e.g. messages/notifications"*, `mock_data_for_web/README.md`).
This specification does not invent an endpoint set for it. If this
becomes a real requirement, the missing pieces needed before an API can
be specified are: a `messages`/`notifications` table design, a defined
read/unread model, and a decision on delivery (poll vs. push) — none of
which exist in any governing document today.

---

## 12. Audit and activity (`/api/v1/admin/audit-events`) — recommended, not yet wired up

The `audit_events` table exists in the MySQL migration (copied from the
real schema) because this task's own security requirements call for
auditing sensitive administrative operations, but **no page in the
portal today writes to or reads from it** — the Customers/Workers CRUD
actions built in an earlier task on this same repository do not
currently call an audit-write step.

**Recommended** (not yet required by any existing UI):

- `GET /api/v1/admin/audit-events?entityType=customer&entityId=...` —
  `care_staff`-only (ideally `administrator`-only, given this is the
  most sensitive read in the whole API — the organisation should decide
  whether to restrict this further than the rest of `/admin/*`).
- The backend should call an internal `recordAuditEvent()` after every
  create/update/status-change/delete in §6–§9, populating `eventType`
  (e.g. `"customer.status_changed"`), `entityType`, `entityId`, and a
  small `metadata` object containing **identifiers and changed field
  names only** — matching the real schema's own comment on
  `audit_events.metadata`: *"never personal, health or
  payment-credential data."*

This section is a recommendation for the backend developer, not a
confirmed requirement — flagged exactly as the task's own instructions
require ("identify the missing requirements instead of inventing a
completed system").

---

## 13. Settings and account management — not implemented

No Settings page exists (confirmed: no `src/app/settings/` route, and
the sidebar's own nav list — `src/app/components/AdminSidebar.tsx` —
has exactly five items: Overview, Customers, Workers, Care Requests,
Visits & Scheduling; Settings was explicitly scoped out in an earlier
task on this portal). No endpoints are specified here.

---

## 14. Security requirements (cross-cutting, applies to every endpoint above)

- **Authentication** on every `/api/v1/admin/*` endpoint — no exception.
- **Server-side role enforcement**: every mutating endpoint re-checks
  `care_staff` membership from the verified session, never from a
  client-supplied field — this portal's own existing code already does
  this everywhere (`loadStaffSession` on every page, and independently
  inside every Server Action, not just the page that renders the form —
  confirmed live this session: an unauthenticated request to the Add
  Customer action was correctly refused even when the UI that triggered
  it rendered successfully). The backend API must preserve this
  double-check pattern, not rely on "the page already checked."
- **Object-level authorisation**: not currently relevant in the strict
  sense (this is a staff-only portal with no customer/worker
  self-service surface — see §6), but the **404-not-403 for unknown ids**
  convention (§3) still applies everywhere, since it costs nothing and
  avoids confirming record existence to a caller who shouldn't be
  probing ids.
- **Input validation and parameterised queries**: every value in this
  specification that reaches a `WHERE`/`INSERT`/`UPDATE` clause must use
  parameterised queries or a query builder/ORM that does so
  automatically — never string-concatenated SQL. This defends against
  SQL injection regardless of how thorough the above-the-database
  validation is.
- **Mass-assignment protection**: every create/update endpoint has an
  explicit allow-list of writable fields (documented per endpoint above)
  — the backend must apply that allow-list itself (e.g. destructure only
  the named fields from the request body), never pass an entire
  request-body object straight into an `UPDATE`/`INSERT`, which would
  let a client set `id`, `status`, `createdAt`, or any other
  server-managed field simply by including it in the JSON body.
- **No privileged credentials in frontend code**: the MySQL connection
  string, any service-role-equivalent credential, and the chosen
  auth provider's signing secret live only in the backend's own
  environment — never in a `NEXT_PUBLIC_*` variable or any code shipped
  to the browser (the portal's existing `.env.local.example` already
  documents this exact rule for its current Supabase key; the same rule
  applies to whatever replaces it).
- **Rate limiting**: applied to §13A sign-in and password-reset request
  endpoints specifically (brute-force/enumeration defence); not
  specified for ordinary `/admin/*` reads, which are already
  authentication-gated.
- **Audit logging**: see §12.
- **Sensitive-data minimisation**: no endpoint in this specification
  returns a password, token, or the raw `BINARY(16)` id form; error
  responses never include SQL text or stack traces (§3).

---

## 15. Entity ↔ endpoint ↔ database mapping

| Endpoint(s) | Frontend page/component | MySQL table(s) | Key relationships | Required index | Permission |
|---|---|---|---|---|---|
| `/auth/*` | `src/app/login/LoginForm.tsx`, `AdminHeader.tsx`, `AdminShell.tsx` | `users`, `user_roles` | `user_roles.user_id → users.id` | `users_email_key` | public / authenticated |
| `/admin/overview` | `src/app/dashboard/page.tsx` | `care_requests`, `customers`, `workers`, `visits` | — (aggregations only) | `care_requests_status_created_idx`, `customers_status_idx`, `workers_status_idx`, `visits_status_schedule_idx` | care_staff |
| `/admin/analytics/*` | `src/app/dashboard/page.tsx`, `BarChart.tsx`, `ActivityChart.tsx` | `care_requests`, `care_request_items`, `services`, `visits`, `care_assignments`, `customers`, `workers` | `care_request_items.service_id → services.id`; `visits.care_assignment_id → care_assignments.id → care_requests.id`/`workers.id` | `care_requests_status_created_idx`, `care_request_items_service_idx`, `visits_status_schedule_idx` | care_staff |
| `/admin/customers*` | `src/app/customers/page.tsx`, `CustomersTable.tsx`, `customers/actions.ts` | `customers` | `customers.created_by → users.id`; `customers.user_id → users.id` | `customers_status_idx`, `customers_city_idx`, `customers_full_name_fulltext` | care_staff |
| `/admin/workers*` | `src/app/workers/page.tsx`, `WorkersTable.tsx`, `workers/actions.ts` | `workers` | `workers.created_by/user_id → users.id` | `workers_status_idx`, `workers_display_name_fulltext` | care_staff |
| `/admin/care-requests*` | `src/app/requests/page.tsx`, `requests/[id]/*`, `RequestsBulkSection.tsx`, `requests/actions.ts` | `care_requests`, `care_request_items`, `customers`, `services` | `care_requests.customer_id → customers.id`; `care_request_items.care_request_id/service_id` | `care_requests_customer_created_idx`, `care_requests_status_created_idx`, `care_request_items_request_service_key` | care_staff |
| `/admin/visits*` | `src/app/visits/page.tsx`, `VisitsTable.tsx`, `visits/actions.ts` | `visits`, `care_assignments`, `care_requests`, `customers`, `workers` | `visits.care_assignment_id → care_assignments.id`; `care_assignments.worker_id/care_request_id` | `visits_status_schedule_idx`, `visits_customer_schedule_idx`, `care_assignments_worker_status_idx` | care_staff |
| `/admin/services*` (not yet built) | — | `services` | `care_request_items.service_id → services.id` | `services_is_active_idx` | care_staff |
| `/admin/audit-events` (recommended) | — | `audit_events` | none (intentionally no FK — see §12) | `audit_events_entity_idx`, `audit_events_occurred_at_idx` | care_staff (administrator recommended) |

Every table named above exists in
`MySQL_migrations/001_initial_hhh_web_portal_schema.sql` with these
exact names — no endpoint in this document depends on a table that
migration does not create.

---

## 16. Flutter/mobile compatibility

The concepts this API shares with the Flutter mobile app — customer
identity, worker (`care_associates`) identity, service definitions, care
requests, the five-value request-status vocabulary, `idempotency_key`,
assignments, visits, and the `care_staff` permission concept — are
**not redefined anywhere in this specification**; every field name,
status value and business rule for `care_requests`/`visits`/
`care_assignments` above is transcribed from the live schema the mobile
app already depends on, not reinvented for the web portal's convenience
(§8 in particular is a direct, checked transcription of the real trusted
functions, not an approximation).

The two places this specification's data model **diverges** from the
real/mobile schema are both already flagged, not silently resolved:

1. Customer `incomplete` status → modelled as a computed
   `isProfileIncomplete` flag instead (§6.0).
2. Worker `pending` status → not implemented; the real three-value
   vocabulary is used, with the gap flagged as an open product decision
   (§7).

Implementing this API as specified does not require any change to the
live Supabase schema, the mobile app, or the mobile data contract — it
is purely an additive, parallel backend for the web portal against a
separate MySQL database, consistent with "do not implement the backend"
scope limit in the original task and with not breaking the established
mobile contract.

# `MySQL_migrations/` — web-portal MySQL schema

This folder holds the MySQL schema for operating the Happy Healthy Hub
**operations portal** (`D:\MITSC\Vayoshri\operations-portal\`) against
the organisation's own MySQL server, instead of the development
Supabase/PostgreSQL project this repository currently talks to.

**This has not been applied anywhere.** No MySQL server was available in
this task's environment; the migration was produced from, and validated
against, the actual application code and the real live Supabase schema
— not by connecting to or modifying any production system. See
"Validation performed" below for exactly what was and was not checked.

## Repository paths inspected for this task

- `D:\MITSC\Vayoshri\operations-portal\` — the actual repository root
  this task targets. Confirmed to exist and match the path given in the
  prompt; no discrepancy to report.
- `D:\MITSC\Vayoshri\withu\` — the sibling Flutter repository and its
  live Supabase schema, used as the authoritative data contract (see
  "Source of truth" below).

## Files

| File | Purpose |
|---|---|
| `001_initial_hhh_web_portal_schema.sql` | The only migration. Creates every MySQL table the web portal's current pages, forms, charts and CRUD actions actually require. |

No prior MySQL migration or schema existed in this repository before
this task (`MySQL_migrations/` did not exist) — confirmed by listing the
repository root before creating anything. This is therefore a genuine
"001" initial migration, not a continuation of an existing sequence.

## Source of truth

Every table, column, status value and relationship in
`001_initial_hhh_web_portal_schema.sql` was taken from one of these,
**in this priority order**, never invented:

1. The live Supabase PostgreSQL schema —
   `D:\MITSC\Vayoshri\withu\supabase\migrations\001_initial_core_mvp_schema.sql`
   and `002_care_request_idempotency.sql` — which the operations portal's
   Care Requests page (`src/app/requests/`) already reads and writes
   today, and which the Flutter mobile app shares. This is the
   authoritative shape for every entity it defines.
2. `D:\MITSC\Vayoshri\withu\docs\DATABASE_PORTABILITY.md` — the
   project's own, already-written PostgreSQL→MySQL translation strategy
   (UUID representation, timestamp handling, status-column convention,
   partial-unique-index translation, etc.). This migration follows it
   exactly rather than inventing a different translation approach.
3. The operations portal's own current code — `src/lib/mock-data/types.ts`,
   `src/lib/mock-data/store.ts`, `src/lib/care-requests.ts`,
   `src/lib/auth.ts` and every page under `src/app/` — to confirm which
   fields, statuses and operations the web portal's UI genuinely uses
   today, and to catch every place its development-only mock layer has
   **drifted from** the real schema (see "Discrepancies found and
   flagged" below — these are not silently resolved).

## Entities included, and why

| Table | Backs | Source |
|---|---|---|
| `schema_migrations` | Migration version tracking | New (standard convention; no prior convention existed to follow) |
| `roles` | Role reference data | `public.roles`, copied 1:1 |
| `users` | Provider-neutral identity (replaces `public.profiles`'s Supabase Auth link) | `public.profiles`, with `auth.users` FK removed — see "Unresolved decisions" |
| `user_roles` | Role assignments | `public.user_roles`, copied 1:1 |
| `customers` | Customers list/detail/forms | `public.customers` — **status vocabulary flagged, see below** |
| `services` | Service-demand chart, care-request line items | `public.services`, copied 1:1 (no Services management page exists in the portal yet, but the table is a required dependency) |
| `care_requests` | Care Requests list/detail/review/decide, dashboard KPIs & charts | `public.care_requests` + the `idempotency_key`/constraint from migration 002, copied 1:1 |
| `care_request_items` | Requested services on a care request | `public.care_request_items`, copied 1:1 |
| `workers` | Workers list/detail/forms | `public.care_associates`, **renamed** to match the portal's own UI term "Workers" — **status vocabulary flagged, see below** |
| `care_assignments` | Worker↔request history (read by the dashboard's "Upcoming visits"; no assignment UI exists in the portal yet) | `public.care_assignments`, copied 1:1 except the partial-unique-index translation (see schema comments) |
| `visits` | Visits & Scheduling list, dashboard charts | `public.visits`, copied 1:1 |
| `audit_events` | Recommended, **not yet wired up** by any portal page | `public.audit_events`, copied 1:1 |

## Entities deliberately NOT included

These exist in the real/mobile schema but have **no page, form, chart,
or table anywhere in the operations portal today** — confirmed by
inspecting every route under `src/app/` (Public landing, Login,
Dashboard, Customers, Workers, Care Requests, Visits; there is no
Services, Reports, Messages/Notifications, Settings, or family-member
management route in this repository):

- `emergency_contacts`, `family_relationships`, `family_permissions`,
  `family_permission_types` — customer-family features; this portal is
  staff-only and has no family-facing UI at all (confirmed in
  `withu/docs/OPERATIONS_PORTAL.md`'s own scope decision).
- `visit_notes` — no visit-notes UI exists.
- `invoices`, `invoice_line_items`, `payments`, `payment_refunds` — no
  billing/invoicing UI exists anywhere in the portal.
- `private.status_transitions` — a PostgreSQL-side helper table driving
  a generic trigger. Not reproduced as a MySQL table; the equivalent
  transition rules are documented as comments on `care_requests`,
  `care_assignments` and `visits` in the migration itself and must be
  enforced by the backend service layer (see
  `Endpoints_API/HHH_Web_Portal_API_Specification.md` §15), matching how
  `DATABASE_PORTABILITY.md` itself describes this translation ("become
  backend service methods... inside a transaction").

If the portal later gains a page needing one of these, add it in a new
migration (`002_...sql`) using the real PostgreSQL columns as the
contract — do not extend `001` after it has been applied anywhere.

## Discrepancies found and flagged (not silently resolved)

Inspecting the portal's own mock-data layer against the real schema
surfaced two genuine conflicts. Per this task's explicit instruction
("If a conflict is discovered, document it clearly... rather than
silently changing one side"), **neither was resolved unilaterally** —
the migration follows the real/shared schema in both cases, and the
discrepancy is documented in full in the migration file's own comments
(search for "FLAGGED DISCREPANCY") and summarised here:

1. **Customer status.** Real schema: `active` / `inactive` only. The
   portal's mock CRUD (built in an earlier task on this same repository)
   added a third value, `incomplete`, as a UX convenience for a customer
   missing a phone number or city. The migration keeps only the real
   two values; the recommended resolution is for the backend to compute
   `isProfileIncomplete` from `phone_number IS NULL OR city IS NULL`
   rather than storing it as a status — but this is a recommendation,
   not a decision made on the organisation's behalf.
2. **Worker status.** Real schema (`care_associates.status`): `active` /
   `inactive` / `suspended`. The portal's mock CRUD uses `pending` /
   `active` / `suspended` — a different third value ("awaiting
   onboarding approval") with no equivalent in the real schema at all.
   The migration keeps only the real three values (default `inactive`
   on creation, not `pending`). Adding a real "pending" status would
   require a reviewed migration on **both** MySQL and the live Supabase
   schema, since the mobile app also reads `care_associates.status` —
   explicitly flagged as an open product decision, not resolved here.

A smaller, non-conflicting gap: the portal's mock `VisitStatus` type
omits the real schema's `in_progress` value (it only shows
scheduled/completed/missed/cancelled). This is not a conflicting
redefinition — every value the mock layer uses is also a real value —
so the migration simply includes all five real values and flags that
the backend/API must support `in_progress` even though today's UI
doesn't yet display it.

## MySQL version assumption

**Target: MySQL 8.0.16 or later**, specifically because:

- Enforced `CHECK` constraints require 8.0.16+ (older 8.0.x parses but
  silently ignores them — confirmed from MySQL's own release notes, not
  assumed).
- `utf8mb4_0900_ai_ci` collation requires 8.0+.
- Generated-column-backed unique index (used for `care_assignments`'
  "one open assignment per worker" rule) requires 5.7+, included here
  for completeness alongside the CHECK requirement.

The organisation's actual server version was not provided to this task
and was not assumed to be any more specific than "a documented, broadly
supported MySQL 8.x baseline," per the task's own instruction. **Confirm
the real server version before applying this migration** — if it is
older than 8.0.16, the CHECK constraints will not block bad data at the
database layer and the backend must enforce every rule itself (the API
specification already assumes the backend does this regardless, so no
behaviour change is required if the version turns out to be older, only
reduced defence-in-depth).

## UUID representation

Every primary/foreign key is `BINARY(16)`, generated as
`UUID_TO_BIN(UUID(), 1)` (swap-flag `1` for better InnoDB index
locality), per `DATABASE_PORTABILITY.md`'s own recommendation. The
**backend must** convert at the data-access boundary — accept and
return standard hyphenated UUID strings (`UUID_TO_BIN(?, 1)` on the way
in, `BIN_TO_UUID(id, 1)` on the way out) — exactly as documented in
`Endpoints_API/HHH_Web_Portal_API_Specification.md` §2. No raw
16-byte value should ever reach the frontend.

## Timestamps

Every `_at` column is `DATETIME(6)`. MySQL's `DEFAULT`/`ON UPDATE`
clauses only accept the literal `CURRENT_TIMESTAMP` (optionally with
fractional-seconds precision) — **not** an arbitrary function call like
`UTC_TIMESTAMP()`. The migration therefore uses
`DEFAULT CURRENT_TIMESTAMP(6)` / `ON UPDATE CURRENT_TIMESTAMP(6)`
throughout, and the connection/session **must** set
`time_zone = '+00:00'` (as the migration's own preamble does) so that
`CURRENT_TIMESTAMP` actually evaluates to UTC. This was caught and
corrected during static validation (see below) — an earlier draft of
this file used `UTC_TIMESTAMP(6)` in those clauses, which is not valid
MySQL syntax there.

## Money

`services.base_price` is `DECIMAL(12,2)` (never `FLOAT`/`DOUBLE`),
matching the real schema's `numeric(12,2)` exactly — the only monetary
column anywhere in the portal's current scope (no invoicing/payments
tables are included, see above).

## Deletion and lifecycle policy

No table in this migration allows cascading deletion of business
history. Every foreign key from an operational record (care request,
assignment, visit) to a person or service is `ON DELETE RESTRICT`;
"remove access" is modelled as a status change (`inactive`/`suspended`/
`deactivated`), never a row deletion, matching the real schema's own
documented policy exactly ("no `ON DELETE CASCADE` from people to
operational... history"). Deleting a `customers`/`workers` row that has
any care request, assignment, or visit will fail with a foreign-key
constraint error by design — the API specification documents this as an
expected, reported error, not a bug to work around with `CASCADE`.

## Unresolved decisions (flagged, not decided here)

1. **Authentication provider.** Not chosen. `users.external_auth_subject`
   is a nullable placeholder column for whatever provider is eventually
   selected; no FK or business logic in this migration depends on it.
   See the API specification §2 for the provider-neutral contract this
   implies.
2. **Customer "incomplete" and worker "pending" statuses** — see
   "Discrepancies found and flagged" above.
3. **Audit logging** is modelled (`audit_events`) but not yet wired to
   any portal action — flagged as a recommended addition for the backend
   developer, not a confirmed requirement with an agreed trigger list.

## Safety

- No `DROP DATABASE`, `DROP TABLE`, or destructive `ALTER TABLE`
  anywhere in this file.
- No seed data beyond the small, genuinely-static `roles` reference
  table (6 rows, copied from the live schema's own seed) and the
  migration-ledger row — **no fabricated customers, workers, care
  requests or any other operational record**.
- No credentials, passwords, API keys, hostnames or environment-specific
  values appear anywhere in this file.
- No default/privileged administrator account is created.
- This migration assumes it is being applied to an **empty** database.
  It has not been tested against, and must not be applied to, a
  database that already contains differently-shaped tables of these
  names — inspect the target database first if there is any doubt.

## Validation performed

**No live MySQL server or Docker was available in this task's
environment** (confirmed: `mysql`, `mysqld` and `docker` are all absent
from PATH) — the same pre-existing environment limitation already
recorded for this repository's prior MySQL work
(`withu/IMPLEMENTATION_STATUS.md`, entry `MYSQL-03`). This migration has
**not been executed against a live MySQL instance.**

What was actually done instead:

1. **Manual column-by-column cross-check** against the live Postgres
   schema and `DATABASE_PORTABILITY.md`'s own translation table for
   every type, default and constraint decision.
2. **Offline MySQL-grammar parsing** with `node-sql-parser@5.4.0`
   (the same tool and version already used and documented for this
   organisation's prior MySQL track — `withu/database-mysql/README.md`),
   installed temporarily with `npm install --no-save` and removed after
   use; not added to `package.json`. Every statement was parsed against
   the `mysql` dialect:
   - 17 of 18 top-level statements (every `CREATE TABLE` and the final
     `INSERT`) parsed without error.
   - The one failure was the file's own `SET NAMES utf8mb4;` line — a
     **confirmed tool limitation**, not a real MySQL error: isolated and
     re-tested in a one-line script, `SET NAMES utf8mb4;` fails this
     specific parser version while the adjacent, equally-valid
     `SET time_zone = '+00:00';` parses cleanly. This exact
     `SET NAMES`-unsupported limitation was already independently
     documented for this organisation's earlier MySQL effort
     (`withu/IMPLEMENTATION_STATUS.md` `MYSQL-02`), so it is reported
     here as a known tool gap, not treated as a schema defect.
3. **One real defect was caught and fixed by this validation pass**: an
   earlier draft used `UTC_TIMESTAMP(6)` in `DEFAULT`/`ON UPDATE`
   clauses, which the parser correctly rejected because MySQL does not
   permit it there — fixed to `CURRENT_TIMESTAMP(6)` (see "Timestamps"
   above), then re-validated clean.
4. Manually checked: every `FOREIGN KEY` references a table/column
   defined earlier in the same file with a matching type (`BINARY(16)`
   to `BINARY(16)` throughout); no duplicate `CREATE TABLE` names; no
   PostgreSQL-only syntax (`gen_random_uuid()`, `jsonb`, `timestamptz`,
   `create schema`, `~` regex operator, RLS `create policy`, etc.)
   appears anywhere in this file.

**This migration has not been proven to execute successfully end-to-end
on a real MySQL server.** Before applying it anywhere, run it against a
disposable MySQL 8.0.16+ instance first.

## Before you apply this

1. Confirm the target database is empty, or inspect it for conflicting
   table names first.
2. Confirm the server's actual MySQL version (see "MySQL version
   assumption").
3. Apply inside a transaction where the server/tooling supports
   transactional DDL, so a mid-migration failure does not leave a
   partial schema.
4. Do not apply this to the organisation's production server as part of
   reviewing this task — that was explicitly out of scope and was not
   done.

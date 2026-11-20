# `Endpoints_API/` — web-portal API contract

`HHH_Web_Portal_API_Specification.md` is the complete API specification
for a backend that does **not exist yet**. No API route, controller,
middleware, authentication logic, or server was implemented as part of
producing this document — this folder contains documentation only, per
this task's explicit scope limit.

## What it's for

A backend developer implementing the organisation's own server (against
`MySQL_migrations/001_initial_hhh_web_portal_schema.sql`) should be able
to build every endpoint from this document without needing to read the
frontend source first — though every endpoint, field and business rule
in it was in fact derived from the frontend/mock-data source and the
real live Supabase schema, not invented, so cross-referencing the cited
files (`src/app/.../actions.ts`, `src/lib/care-requests.ts`, etc.) is
always possible if a detail needs double-checking.

## What's covered, and what's explicitly marked "not implemented"

The specification documents full detail for every page that actually
exists in the portal today (dashboard, Customers, Workers, Care
Requests, Visits & Scheduling) and its authentication needs. For
Services, Messages/Notifications, Settings and formal audit-log
viewing — none of which have a page in this repository — it says so
explicitly rather than inventing a plausible-looking but fictional
endpoint set. See the specification's §10–§13.

## Two flagged, unresolved data-model discrepancies

The web portal's existing development-only mock-data layer
(`src/lib/mock-data/`) uses a customer status value (`incomplete`) and a
worker status value (`pending`) that do not exist in the real, live
Supabase schema the mobile app shares. Per this task's instructions,
neither was silently resolved — both are documented in detail in the
specification (§6.0, §7) and in `MySQL_migrations/README.md`
("Discrepancies found and flagged"), with a recommended smallest-safe
resolution for each, left for the organisation to actually decide.

## Validation

This is a documentation deliverable; there is no code to run. What was
checked:

- Every endpoint's referenced database table/column exists in
  `MySQL_migrations/001_initial_hhh_web_portal_schema.sql` with the
  exact name used here (cross-checked while writing §15's mapping
  table).
- Every business rule attributed to Care Requests (§8) was verified
  against the actual trusted-function source
  (`withu/supabase/migrations/001_initial_core_mvp_schema.sql`'s
  `start_care_request_review`/`decide_care_request`), not inferred from
  UI behaviour alone.
- Every "not implemented" section was confirmed by searching the actual
  `src/app/` route tree for a corresponding page before writing it, not
  assumed from the task's own checklist.

No live backend, database, or deployed API was created, called, or
connected to while producing this document.

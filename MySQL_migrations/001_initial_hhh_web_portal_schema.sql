-- =============================================================================
-- Happy Healthy Hub — Operations Portal
-- MySQL migration 001  ·  Initial web-portal schema
-- =============================================================================
-- Target: MySQL 8.0.16+ (InnoDB). Assumption, not a confirmed server
-- version — the organisation's exact MySQL version was not provided to
-- this task. 8.0.16+ is required specifically for enforced CHECK
-- constraints; on an older 8.0.x server the CHECK clauses are parsed but
-- silently NOT enforced (MySQL's documented pre-8.0.16 behaviour), so
-- this must be confirmed against the real server before relying on them
-- as the only guard — the backend must validate these rules anyway (see
-- Endpoints_API/HHH_Web_Portal_API_Specification.md §15).
--
-- SCOPE: this covers only the entities the web portal
-- (D:\MITSC\Vayoshri\operations-portal) actually reads or writes today,
-- not the full WithU platform schema. The authoritative, full shared
-- model is Supabase PostgreSQL migration
-- D:\MITSC\Vayoshri\withu\supabase\migrations\001_initial_core_mvp_schema.sql
-- (+ 002_care_request_idempotency.sql) and its translation notes in
-- D:\MITSC\Vayoshri\withu\docs\DATABASE_PORTABILITY.md, which this file
-- follows for every type/convention decision. Tables that exist in that
-- schema but have NO web-portal page, form, chart or table today —
-- emergency_contacts, family_relationships, family_permissions,
-- family_permission_types, visit_notes, invoices, invoice_line_items,
-- payments, payment_refunds — are deliberately NOT created here. If the
-- web portal later gains a page that needs one of these, add it in a
-- new migration using the real PostgreSQL columns as the contract, not
-- by inventing a shape here.
--
-- WORKERS TABLE NAME: the real/mobile schema's table is
-- `care_associates`; this web portal's own UI and code
-- (src/lib/mock-data/, "Workers" nav item) consistently call the same
-- concept "workers". This migration uses `workers` as the MySQL table
-- name and documents the equivalence explicitly (see §Workers below) —
-- this is a presentation-layer naming choice, not a semantic change;
-- every column and status value still matches `care_associates` exactly
-- except where flagged as an unresolved discrepancy.
--
-- UUID REPRESENTATION: every id is BINARY(16), generated with
-- UUID_TO_BIN(UUID(), 1) (swap-flag=1 for better index locality), per
-- DATABASE_PORTABILITY.md's own recommendation. The backend must accept
-- and return ids as standard hyphenated UUID strings at the API layer
-- (see Endpoints_API spec) and convert with UUID_TO_BIN()/BIN_TO_UUID()
-- at the data-access boundary — never expose the raw 16-byte value.
--
-- TIMESTAMPS: DATETIME(6), always UTC. The application/connection must
-- set the session time zone to '+00:00' and must never rely on MySQL's
-- TIMESTAMP type (2038 range limit, implicit zone conversion). All
-- "_at" columns are UTC instants; render in the organisation's local
-- time zone only in the UI layer.
--
-- MONEY: DECIMAL(12,2) major units + CHAR(3) ISO 4217 currency code —
-- never FLOAT/DOUBLE for the one monetary field this schema has
-- (services.base_price).
--
-- STATUS COLUMNS: VARCHAR + CHECK (MySQL 8.0.16+), matching the real
-- schema's own convention of "no ENUM types" (ENUM requires a schema
-- change to add a value; CHECK does too, but is easier to reason about
-- across both database engines and matches the Postgres source exactly,
-- per DATABASE_PORTABILITY.md). Allowed transitions are documented in
-- comments on each table and must be enforced by the backend service
-- layer (see Endpoints_API spec §Business rules per endpoint) — exactly
-- as the real schema enforces them in trusted SECURITY DEFINER
-- functions, not by trusting whatever status string a client sends.
--
-- THIS MIGRATION ASSUMES AN EMPTY DATABASE. It has not been tested
-- against, and must not be applied to, a database that already has
-- differently-shaped tables of these names. If the organisation already
-- has a MySQL schema from a prior effort, inspect it before applying
-- this file — see MySQL_migrations/README.md "Before you apply this".
--
-- VALIDATION PERFORMED: static review only (manual read-through against
-- MySQL 8.0 reference syntax, cross-checked column-by-column against
-- the live Postgres schema and the actual mock-data/service.ts and
-- store.ts types this portal uses today). No MySQL server was available
-- in this environment to execute this file; it has NOT been run against
-- a live MySQL instance. See MySQL_migrations/README.md "Validation".
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- =============================================================================
-- 1. Migration version tracking
-- =============================================================================

CREATE TABLE schema_migrations (
  version      VARCHAR(20)  NOT NULL,
  description  VARCHAR(200) NOT NULL,
  applied_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (version)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Applied-migration ledger. Insert one row per migration file at the end of its own script, inside the same transaction where the server supports transactional DDL.';

-- =============================================================================
-- 2. Reference data: roles
-- =============================================================================

CREATE TABLE roles (
  role_key     VARCHAR(50)  NOT NULL,
  display_name VARCHAR(80)  NOT NULL,
  description  VARCHAR(500) NOT NULL DEFAULT '',
  is_staff     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (role_key),
  CONSTRAINT roles_role_key_format
    CHECK (role_key REGEXP '^[a-z][a-z0-9_]{1,49}$'),
  CONSTRAINT roles_display_name_not_blank
    CHECK (CHAR_LENGTH(TRIM(display_name)) > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Application roles, copied 1:1 from the live Supabase public.roles reference data. Holding a role never grants access to a specific customer or worker by itself — every endpoint still checks ownership (see API spec).';

INSERT INTO roles (role_key, display_name, description, is_staff) VALUES
  ('customer', 'Customer', 'An elderly person receiving HHH care services.', 0),
  ('family_representative', 'Family representative', 'A person a customer has explicitly authorised for specific access. Not used by this web portal today.', 0),
  ('care_associate', 'Care associate', 'Delivers approved services on assigned visits. Called "Worker" in this portal''s UI.', 1),
  ('care_coordinator', 'Care coordinator', 'Reviews care requests, assigns associates and schedules visits. A staff role for this portal.', 1),
  ('operations_manager', 'Operations manager', 'Operational oversight, service catalogue and billing. A staff role for this portal.', 1),
  ('administrator', 'Administrator', 'Platform administration, including role management. A staff role for this portal.', 1);

-- =============================================================================
-- 3. Users (identity) and role assignments
-- =============================================================================
-- The real system's `public.profiles` is explicitly a Supabase Auth
-- integration point (`profiles.id` FK's to `auth.users`). MySQL has no
-- equivalent of Supabase Auth, so this table represents the
-- provider-neutral identity record only: an application user who can
-- sign in to the web portal (staff) or whose record is referenced by a
-- customer/worker profile they may or may not ever sign in as.
--
-- UNRESOLVED DECISION — see API spec §2 "Authentication": the final
-- authentication provider for the organisation's own server has not
-- been chosen. `external_auth_subject` below is a placeholder for
-- whatever that provider's stable subject identifier turns out to be
-- (e.g. an OIDC `sub`, an internal auth service's user id). It is
-- nullable and unused by any FK logic in this migration; do not treat
-- its presence as a confirmed design.

CREATE TABLE users (
  id                     BINARY(16)   NOT NULL,
  external_auth_subject  VARCHAR(255) NULL,
  display_name           VARCHAR(100) NULL,
  email                  VARCHAR(254) NULL,
  account_status         VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_at             DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at             DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY users_external_auth_subject_key (external_auth_subject),
  UNIQUE KEY users_email_key (email),
  CONSTRAINT users_display_name_length
    CHECK (display_name IS NULL OR CHAR_LENGTH(TRIM(display_name)) BETWEEN 1 AND 100),
  CONSTRAINT users_email_format
    CHECK (email IS NULL OR email REGEXP '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'),
  CONSTRAINT users_account_status_check
    CHECK (account_status IN ('active', 'deactivated'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Provider-neutral equivalent of public.profiles. Never store a password hash or any authentication secret here — the chosen auth provider owns credential storage; this table only links an authenticated identity to application data.';

CREATE TABLE user_roles (
  user_id    BINARY(16)   NOT NULL,
  role_key   VARCHAR(50)  NOT NULL,
  granted_by BINARY(16)   NULL,
  granted_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id, role_key),
  KEY user_roles_role_key_idx (role_key),
  KEY user_roles_granted_by_idx (granted_by),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT user_roles_role_key_fkey FOREIGN KEY (role_key)
    REFERENCES roles (role_key) ON DELETE RESTRICT,
  CONSTRAINT user_roles_granted_by_fkey FOREIGN KEY (granted_by)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Roles held by each user. Write only through the backend admin-role-management flow (not built yet in this portal); every grant/revoke should be audited (see audit_events).';

-- =============================================================================
-- 4. Customers
-- =============================================================================
-- Columns match public.customers exactly; `status` keeps the real
-- schema's two-value vocabulary ('active'/'inactive'), NOT the
-- three-value 'active'/'inactive'/'incomplete' the web portal's current
-- mock-data layer (src/lib/mock-data/types.ts CustomerAccountStatus)
-- uses for demo purposes.
--
-- FLAGGED DISCREPANCY (unresolved — see API spec §4 "Customers"): the
-- real/mobile schema has no "incomplete" customer status; a customer
-- profile is simply active or inactive regardless of how complete its
-- contact details are. The web portal's mock CRUD (added in an earlier
-- task on this same portal) invented 'incomplete' as a UX convenience
-- to flag customers missing a phone number or city. This migration does
-- NOT add 'incomplete' as a database status, per this task's explicit
-- instruction not to change established workflow semantics to make the
-- web portal easier to implement. The smallest safe resolution: treat
-- "incomplete" as an application-layer computed label (phone_number IS
-- NULL OR city IS NULL), not a stored status — the backend API can
-- still return an `isProfileIncomplete` boolean alongside the real
-- `status` field (see API spec). If the organisation decides
-- "incomplete" should become a real, independently-settable status
-- (e.g. to let staff mark an otherwise-complete profile for follow-up),
-- that is a product decision requiring a reviewed migration on BOTH
-- database platforms, not a web-portal-only change.

CREATE TABLE customers (
  id                  BINARY(16)    NOT NULL,
  user_id             BINARY(16)    NULL,
  full_name           VARCHAR(150)  NOT NULL,
  preferred_name      VARCHAR(80)   NULL,
  date_of_birth       DATE          NULL,
  phone_number        VARCHAR(16)   NULL,
  email               VARCHAR(254)  NULL,
  address_line1       VARCHAR(200)  NULL,
  address_line2       VARCHAR(200)  NULL,
  city                VARCHAR(100)  NULL,
  state_region        VARCHAR(100)  NULL,
  postal_code         VARCHAR(12)   NULL,
  country_code        CHAR(2)       NOT NULL DEFAULT 'IN',
  preferred_language  VARCHAR(35)   NULL,
  status              VARCHAR(20)   NOT NULL DEFAULT 'active',
  created_by          BINARY(16)    NULL,
  created_at          DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at          DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY customers_user_id_key (user_id),
  KEY customers_status_idx (status),
  KEY customers_city_idx (city),
  KEY customers_created_by_idx (created_by),
  FULLTEXT KEY customers_full_name_fulltext (full_name, preferred_name),
  CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT customers_full_name_not_blank
    CHECK (CHAR_LENGTH(TRIM(full_name)) > 0),
  CONSTRAINT customers_preferred_name_not_blank
    CHECK (preferred_name IS NULL OR CHAR_LENGTH(TRIM(preferred_name)) > 0),
  CONSTRAINT customers_date_of_birth_range
    CHECK (date_of_birth IS NULL OR date_of_birth >= '1900-01-01'),
  CONSTRAINT customers_phone_e164
    CHECK (phone_number IS NULL OR phone_number REGEXP '^\\+[1-9][0-9]{7,14}$'),
  CONSTRAINT customers_email_format
    CHECK (email IS NULL OR email REGEXP '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'),
  CONSTRAINT customers_country_code_format
    CHECK (country_code REGEXP '^[A-Z]{2}$'),
  CONSTRAINT customers_status_check
    CHECK (status IN ('active', 'inactive'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'People receiving care. Minimum necessary personal data only, no health information. user_id is RESTRICT, never CASCADE: a customer with operational history (care requests) cannot be hard-deleted by deleting their user record.';

-- =============================================================================
-- 5. Services
-- =============================================================================
-- Not yet surfaced by any web-portal page (no Services management UI
-- exists today — confirmed by inspecting src/app/ for a services route;
-- none found). Still required because care_request_items references
-- it and the dashboard's "service demand" chart groups by it. Columns
-- match public.services exactly.

CREATE TABLE services (
  id            BINARY(16)    NOT NULL,
  service_code  VARCHAR(50)   NOT NULL,
  name          VARCHAR(120)  NOT NULL,
  description   VARCHAR(2000) NOT NULL DEFAULT '',
  base_price    DECIMAL(12,2) NOT NULL,
  currency_code CHAR(3)       NOT NULL DEFAULT 'INR',
  price_unit    VARCHAR(20)   NOT NULL DEFAULT 'per_visit',
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY services_service_code_key (service_code),
  KEY services_is_active_idx (is_active),
  CONSTRAINT services_service_code_format
    CHECK (service_code REGEXP '^[A-Z0-9][A-Z0-9_-]{1,49}$'),
  CONSTRAINT services_name_not_blank
    CHECK (CHAR_LENGTH(TRIM(name)) > 0),
  CONSTRAINT services_base_price_non_negative
    CHECK (base_price >= 0),
  CONSTRAINT services_currency_code_format
    CHECK (currency_code REGEXP '^[A-Z]{3}$'),
  CONSTRAINT services_price_unit_check
    CHECK (price_unit IN ('per_visit', 'per_hour', 'per_day'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Organisation-managed service catalogue. Deactivate (is_active = 0), never delete: care_request_items keeps referencing historical services.';

-- =============================================================================
-- 6. Care requests and their service items
-- =============================================================================
-- Columns and the five-value status vocabulary match public.care_requests
-- exactly, including idempotency_key from migration 002 on the Postgres
-- side — this web portal's "Care Requests" page already reads/writes the
-- real Supabase table with these exact semantics, so there is no
-- discrepancy to flag here, unlike Customers/Workers above.

CREATE TABLE care_requests (
  id                     BINARY(16)    NOT NULL,
  customer_id            BINARY(16)    NOT NULL,
  submitted_by           BINARY(16)    NULL,
  status                 VARCHAR(20)   NOT NULL DEFAULT 'submitted',
  preferred_start_date   DATE          NOT NULL,
  preferred_end_date     DATE          NULL,
  preferred_time_of_day  VARCHAR(20)   NULL,
  schedule_notes         VARCHAR(1000) NULL,
  customer_notes         VARCHAR(2000) NULL,
  review_started_at      DATETIME(6)   NULL,
  reviewed_by            BINARY(16)    NULL,
  decided_at             DATETIME(6)   NULL,
  decided_by             BINARY(16)    NULL,
  decision_reason        VARCHAR(1000) NULL,
  cancelled_at           DATETIME(6)   NULL,
  cancelled_by           BINARY(16)    NULL,
  cancellation_reason    VARCHAR(1000) NULL,
  idempotency_key        BINARY(16)    NULL,
  created_at             DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at             DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY care_requests_customer_idempotency_key (customer_id, idempotency_key),
  KEY care_requests_customer_created_idx (customer_id, created_at DESC),
  KEY care_requests_status_created_idx (status, created_at),
  KEY care_requests_submitted_by_idx (submitted_by),
  KEY care_requests_reviewed_by_idx (reviewed_by),
  KEY care_requests_decided_by_idx (decided_by),
  KEY care_requests_cancelled_by_idx (cancelled_by),
  CONSTRAINT care_requests_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES customers (id) ON DELETE RESTRICT,
  CONSTRAINT care_requests_submitted_by_fkey FOREIGN KEY (submitted_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT care_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT care_requests_decided_by_fkey FOREIGN KEY (decided_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT care_requests_cancelled_by_fkey FOREIGN KEY (cancelled_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT care_requests_status_check
    CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'cancelled')),
  CONSTRAINT care_requests_time_of_day_check
    CHECK (preferred_time_of_day IS NULL OR
           preferred_time_of_day IN ('morning', 'afternoon', 'evening', 'night', 'flexible')),
  CONSTRAINT care_requests_date_range
    CHECK (preferred_end_date IS NULL OR preferred_end_date >= preferred_start_date),
  CONSTRAINT care_requests_review_recorded
    CHECK (status <> 'under_review' OR review_started_at IS NOT NULL),
  CONSTRAINT care_requests_decision_recorded
    CHECK (status NOT IN ('approved', 'rejected') OR decided_at IS NOT NULL),
  CONSTRAINT care_requests_undecided_has_no_decision
    CHECK (status NOT IN ('submitted', 'under_review') OR decided_at IS NULL),
  CONSTRAINT care_requests_rejection_reason
    CHECK (status <> 'rejected' OR decision_reason IS NOT NULL),
  CONSTRAINT care_requests_cancellation_recorded
    CHECK ((status = 'cancelled' AND cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL)
           OR (status <> 'cancelled' AND cancelled_at IS NULL))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Default status on creation is always "submitted" — never settable by the caller. Transitions enforced by the real schema''s trusted functions (start_care_request_review, decide_care_request): submitted->under_review->approved|rejected, or ...->cancelled. The backend MUST reproduce these exact transition checks (see API spec §F) — CHECK constraints here catch an invalid END STATE, not an invalid TRANSITION (e.g. they cannot prevent "submitted" jumping straight to "approved").';

CREATE TABLE care_request_items (
  id              BINARY(16)   NOT NULL,
  care_request_id BINARY(16)   NOT NULL,
  service_id      BINARY(16)   NOT NULL,
  quantity        SMALLINT     NOT NULL DEFAULT 1,
  notes           VARCHAR(500) NULL,
  created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY care_request_items_request_service_key (care_request_id, service_id),
  KEY care_request_items_service_idx (service_id),
  CONSTRAINT care_request_items_request_fkey FOREIGN KEY (care_request_id)
    REFERENCES care_requests (id) ON DELETE CASCADE,
  CONSTRAINT care_request_items_service_fkey FOREIGN KEY (service_id)
    REFERENCES services (id) ON DELETE RESTRICT,
  CONSTRAINT care_request_items_quantity_range
    CHECK (quantity BETWEEN 1 AND 100)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Services requested on a care request. CASCADE from care_requests only (deleting line items when the parent request itself is removed is fine; the request row itself is never hard-deleted by any portal operation).';

-- =============================================================================
-- 7. Workers (public.care_associates in the real/mobile schema)
-- =============================================================================
-- FLAGGED DISCREPANCY (unresolved — see API spec §5 "Workers"): the
-- real schema's care_associates.status is 'active' | 'inactive' |
-- 'suspended' (three values, no onboarding-pending concept). The web
-- portal's mock CRUD layer (src/lib/mock-data/types.ts
-- WorkerOnboardingStatus) uses 'pending' | 'active' | 'suspended' — a
-- DIFFERENT third value representing "awaiting onboarding approval",
-- which has no equivalent in the real schema at all (a worker there is
-- simply not yet 'active', i.e. effectively 'inactive', until someone
-- manually flips their status).
--
-- This migration does NOT silently pick one vocabulary over the other.
-- It keeps the REAL schema's three values ('active', 'inactive',
-- 'suspended') as the authoritative, shared-with-mobile contract, since
-- changing it would violate this task's explicit instruction not to
-- alter established workflow semantics for the web portal's
-- convenience. The organisation must decide, before a backend is built
-- against this migration, whether:
--   (a) "awaiting onboarding" should become a new, real worker status
--       (requires a reviewed migration on BOTH MySQL and the live
--       Supabase schema, since mobile reads care_associates.status too), or
--   (b) the web portal's UI should be updated to use 'inactive' as the
--       pre-approval state, matching the real schema as-is.
-- See Endpoints_API spec for how the create/status-change endpoints
-- behave under each option; this migration implements option (b)'s
-- data shape (three real values only) and the API spec flags exactly
-- where option (a) would need an additional CHECK value if chosen later.

CREATE TABLE workers (
  id                   BINARY(16)   NOT NULL,
  user_id              BINARY(16)   NOT NULL,
  public_display_name  VARCHAR(100) NOT NULL,
  phone_number         VARCHAR(16)  NULL,
  email                VARCHAR(254) NULL,
  status               VARCHAR(20)  NOT NULL DEFAULT 'inactive',
  created_by           BINARY(16)   NULL,
  created_at           DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at           DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY workers_user_id_key (user_id),
  KEY workers_status_idx (status),
  KEY workers_created_by_idx (created_by),
  FULLTEXT KEY workers_display_name_fulltext (public_display_name),
  CONSTRAINT workers_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT workers_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT workers_display_name_not_blank
    CHECK (CHAR_LENGTH(TRIM(public_display_name)) > 0),
  CONSTRAINT workers_phone_e164
    CHECK (phone_number IS NULL OR phone_number REGEXP '^\\+[1-9][0-9]{7,14}$'),
  CONSTRAINT workers_email_format
    CHECK (email IS NULL OR email REGEXP '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'),
  CONSTRAINT workers_status_check
    CHECK (status IN ('active', 'inactive', 'suspended'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Equivalent of public.care_associates, renamed to match this portal''s own UI/code terminology ("Workers"). phone_number/email are not on the real care_associates table (staff contact details live on profiles/auth.users there) — added here because the web portal''s worker form collects them directly; see API spec for this additional discrepancy. Default status on creation is "inactive" (not "active") -- see the discrepancy note above for why "pending" was not used.';

-- Training and availability are web-portal-only, UI-presentation
-- concepts with NO equivalent column anywhere in the real/mobile
-- schema (care_associates has neither). They exist only in
-- src/lib/mock-data/types.ts (MockWorker.trainingStatus/availability)
-- as fictional demo fields. They are intentionally NOT included as
-- columns here: inventing a persisted column for a value the real
-- schema and business workflow have never defined would be exactly the
-- kind of unjustified table design this task's instructions forbid.
-- If the organisation wants training/availability tracking in
-- production, that is a new, explicit schema requirement to capture
-- from the business first — flagged here as an open question, not
-- decided by this migration.

-- =============================================================================
-- 8. Care assignments (worker <-> care request; history preserved)
-- =============================================================================

CREATE TABLE care_assignments (
  id                        BINARY(16)   NOT NULL,
  care_request_id           BINARY(16)   NOT NULL,
  worker_id                 BINARY(16)   NOT NULL,
  status                    VARCHAR(20)  NOT NULL DEFAULT 'assigned',
  assigned_by               BINARY(16)   NULL,
  assigned_at               DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  responded_at              DATETIME(6)  NULL,
  ended_at                  DATETIME(6)  NULL,
  end_reason                VARCHAR(500) NULL,
  replaced_by_assignment_id BINARY(16)   NULL,
  -- Generated column + unique index: MySQL has no PostgreSQL partial
  -- unique index, so "one open assignment per (request, worker)" is
  -- reproduced with a nullable generated key that is only non-NULL for
  -- open rows, per DATABASE_PORTABILITY.md's documented translation.
  open_assignment_key BINARY(16) AS (
    CASE WHEN status IN ('assigned', 'accepted') THEN care_request_id ELSE NULL END
  ) STORED,
  created_at                DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at                DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY care_assignments_one_open_per_worker_idx (open_assignment_key, worker_id),
  KEY care_assignments_worker_status_idx (worker_id, status),
  KEY care_assignments_request_idx (care_request_id),
  KEY care_assignments_assigned_by_idx (assigned_by),
  CONSTRAINT care_assignments_request_fkey FOREIGN KEY (care_request_id)
    REFERENCES care_requests (id) ON DELETE RESTRICT,
  CONSTRAINT care_assignments_worker_fkey FOREIGN KEY (worker_id)
    REFERENCES workers (id) ON DELETE RESTRICT,
  CONSTRAINT care_assignments_assigned_by_fkey FOREIGN KEY (assigned_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT care_assignments_replaced_by_fkey FOREIGN KEY (replaced_by_assignment_id)
    REFERENCES care_assignments (id) ON DELETE RESTRICT,
  CONSTRAINT care_assignments_status_check
    CHECK (status IN ('assigned', 'accepted', 'declined', 'completed', 'cancelled', 'replaced')),
  CONSTRAINT care_assignments_response_recorded
    CHECK (status NOT IN ('accepted', 'declined') OR responded_at IS NOT NULL),
  CONSTRAINT care_assignments_open_has_no_end
    CHECK (status NOT IN ('assigned', 'accepted') OR ended_at IS NULL),
  CONSTRAINT care_assignments_closed_has_end
    CHECK (status IN ('assigned', 'accepted') OR ended_at IS NOT NULL),
  CONSTRAINT care_assignments_replacement_recorded
    CHECK ((status = 'replaced') = (replaced_by_assignment_id IS NOT NULL)),
  CONSTRAINT care_assignments_not_self_replacing
    CHECK (replaced_by_assignment_id IS NULL OR replaced_by_assignment_id <> id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'care_request_id/worker_id renamed from the real care_associate_id to match this migration''s "workers" table name; semantics unchanged from public.care_assignments. Reassignment creates a NEW row (status "replaced" on the old one) — history is never overwritten.';

-- =============================================================================
-- 9. Visits
-- =============================================================================
-- Status vocabulary matches public.visits exactly (five values,
-- including 'in_progress', which the web portal's current mock
-- VisitStatus type at src/lib/mock-data/types.ts omits — that mock
-- type only has 'scheduled'/'completed'/'missed'/'cancelled'. This is
-- a SMALLER web-portal-only gap, not a conflicting redefinition: every
-- value the mock layer uses is also a real value, it just doesn't yet
-- expose 'in_progress' in its UI. Flagged for the backend developer
-- since the real API must support all five.

CREATE TABLE visits (
  id                     BINARY(16)   NOT NULL,
  care_assignment_id     BINARY(16)   NOT NULL,
  customer_id            BINARY(16)   NOT NULL,
  status                 VARCHAR(20)  NOT NULL DEFAULT 'scheduled',
  scheduled_start_at     DATETIME(6)  NOT NULL,
  scheduled_end_at       DATETIME(6)  NOT NULL,
  scheduled_by           BINARY(16)   NULL,
  checked_in_at          DATETIME(6)  NULL,
  check_in_recorded_by   BINARY(16)   NULL,
  check_in_request_id    BINARY(16)   NULL,
  checked_out_at         DATETIME(6)  NULL,
  check_out_recorded_by  BINARY(16)   NULL,
  check_out_request_id   BINARY(16)   NULL,
  completed_at           DATETIME(6)  NULL,
  completed_by           BINARY(16)   NULL,
  exception_recorded_at  DATETIME(6)  NULL,
  exception_recorded_by  BINARY(16)   NULL,
  exception_reason       VARCHAR(500) NULL,
  created_at             DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at             DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY visits_check_in_request_id_key (check_in_request_id),
  UNIQUE KEY visits_check_out_request_id_key (check_out_request_id),
  KEY visits_assignment_idx (care_assignment_id),
  KEY visits_customer_schedule_idx (customer_id, scheduled_start_at),
  KEY visits_status_schedule_idx (status, scheduled_start_at),
  KEY visits_scheduled_by_idx (scheduled_by),
  CONSTRAINT visits_assignment_fkey FOREIGN KEY (care_assignment_id)
    REFERENCES care_assignments (id) ON DELETE RESTRICT,
  CONSTRAINT visits_customer_fkey FOREIGN KEY (customer_id)
    REFERENCES customers (id) ON DELETE RESTRICT,
  CONSTRAINT visits_scheduled_by_fkey FOREIGN KEY (scheduled_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT visits_check_in_by_fkey FOREIGN KEY (check_in_recorded_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT visits_check_out_by_fkey FOREIGN KEY (check_out_recorded_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT visits_completed_by_fkey FOREIGN KEY (completed_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT visits_exception_by_fkey FOREIGN KEY (exception_recorded_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT visits_status_check
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'missed')),
  CONSTRAINT visits_schedule_order
    CHECK (scheduled_end_at > scheduled_start_at),
  CONSTRAINT visits_checkout_after_checkin
    CHECK (checked_out_at IS NULL OR (checked_in_at IS NOT NULL AND checked_out_at >= checked_in_at)),
  CONSTRAINT visits_completion_after_checkout
    CHECK (completed_at IS NULL OR (checked_out_at IS NOT NULL AND completed_at >= checked_out_at)),
  CONSTRAINT visits_scheduled_has_no_attendance
    CHECK (status <> 'scheduled' OR (checked_in_at IS NULL AND completed_at IS NULL)),
  CONSTRAINT visits_in_progress_attendance
    CHECK (status <> 'in_progress' OR (checked_in_at IS NOT NULL AND completed_at IS NULL)),
  CONSTRAINT visits_completed_attendance
    CHECK (status <> 'completed' OR
           (checked_in_at IS NOT NULL AND checked_out_at IS NOT NULL AND completed_at IS NOT NULL)),
  CONSTRAINT visits_exception_recorded
    CHECK ((status IN ('cancelled', 'missed') AND exception_recorded_at IS NOT NULL
            AND exception_reason IS NOT NULL AND checked_in_at IS NULL)
           OR (status NOT IN ('cancelled', 'missed') AND exception_recorded_at IS NULL))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Planned schedule and actual attendance are separate fields, matching public.visits exactly. check_in/check_out_request_id are idempotency keys for offline check-in/out retries, carried over unused by the web portal today (it has no check-in UI) but required for mobile compatibility.';

-- =============================================================================
-- 10. Audit events
-- =============================================================================
-- Not yet written or read by any web-portal page today (no admin
-- audit-log view exists, and the portal's existing Customers/Workers
-- CRUD actions do not currently call an audit-write step). Included
-- because this task's own security requirements (and the real schema's
-- own design) call for auditing sensitive administrative operations,
-- and the API spec documents it as a recommended-but-not-yet-wired-up
-- endpoint. See Endpoints_API spec §J "Audit and activity".

CREATE TABLE audit_events (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  occurred_at      DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  actor_user_id    BINARY(16)      NULL,
  actor_context    VARCHAR(30)     NOT NULL,
  event_type       VARCHAR(100)    NOT NULL,
  entity_type      VARCHAR(63)     NOT NULL,
  entity_id        VARCHAR(64)     NOT NULL,
  metadata          JSON           NOT NULL,
  PRIMARY KEY (id),
  KEY audit_events_entity_idx (entity_type, entity_id, occurred_at DESC),
  KEY audit_events_occurred_at_idx (occurred_at DESC),
  KEY audit_events_actor_idx (actor_user_id),
  CONSTRAINT audit_events_event_type_format
    CHECK (event_type REGEXP '^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$'),
  CONSTRAINT audit_events_metadata_object
    CHECK (JSON_TYPE(metadata) = 'OBJECT' AND JSON_STORAGE_SIZE(metadata) <= 4096)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'No FK on actor_user_id (matches the real schema): audit history must outlive the people it mentions. metadata holds identifiers, statuses and changed column NAMES only — never personal, health or payment-credential data. Default for metadata must be supplied by the application as ''{}'' since MySQL JSON columns cannot have a literal DEFAULT before 8.0.13, and even then only a few forms are allowed — safest to make the application always pass a value.';

-- =============================================================================
-- 11. Record this migration
-- =============================================================================

INSERT INTO schema_migrations (version, description) VALUES
  ('001', 'Initial HHH web-portal schema: roles, users, user_roles, customers, services, care_requests, care_request_items, workers, care_assignments, visits, audit_events');

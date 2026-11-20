/**
 * Typed access to the local demo fixture (`demo/demo-data.json`), plus
 * "embedding" helpers that reshape the flat, normalised rows into the
 * exact nested shape Supabase's PostgREST embedding returns -- so every
 * demo read can be passed through the *same* `parseCustomer`/
 * `parseCaregiver`/`parseAssignment`/`parseVisit`/`parseVisitReport`
 * functions the real Supabase repositories already use and already have
 * tests for. No demo-only type or parser is duplicated.
 */
import raw from '../../../demo/demo-data.json';

export interface DemoService {
  id: string;
  service_code: string;
  name: string;
}

export interface DemoCustomerRow {
  id: string;
  full_name: string;
  preferred_name: string | null;
  phone_number: string | null;
  email: string | null;
  city: string | null;
  status: 'active' | 'inactive';
  profile_id: string | null;
  created_at: string;
}

export interface DemoCaregiverRow {
  id: string;
  profile_id: string;
  public_display_name: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

export interface DemoCareRequestRow {
  id: string;
  customer_id: string;
  service_ids: string[];
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'cancelled';
  preferred_start_date: string;
  preferred_end_date: string | null;
  preferred_time_of_day: string | null;
  schedule_notes: string | null;
  customer_notes: string | null;
  decision_reason: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoAssignmentRow {
  id: string;
  care_request_id: string;
  care_associate_id: string;
  status: 'assigned' | 'accepted' | 'declined' | 'completed' | 'cancelled' | 'replaced';
  assigned_at: string;
  responded_at: string | null;
  ended_at: string | null;
  end_reason: string | null;
}

export interface DemoVisitRow {
  id: string;
  care_assignment_id: string;
  customer_id: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'missed';
  scheduled_start_at: string;
  scheduled_end_at: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  completed_at: string | null;
  exception_reason: string | null;
}

export interface DemoVisitNoteRow {
  id: string;
  visit_id: string;
  body: string;
  visibility: 'care_team' | 'customer';
  created_at: string;
}

export interface DemoStaffRow {
  profile_id: string;
  display_name: string;
  account_status: 'active' | 'deactivated';
  roles: string[];
}

export interface DemoAuditEventRow {
  id: string;
  occurred_at: string;
  actor_profile_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
}

export interface DemoDataset {
  services: DemoService[];
  customers: DemoCustomerRow[];
  caregivers: DemoCaregiverRow[];
  careRequests: DemoCareRequestRow[];
  assignments: DemoAssignmentRow[];
  visits: DemoVisitRow[];
  visitNotes: DemoVisitNoteRow[];
  staff: DemoStaffRow[];
  auditEvents: DemoAuditEventRow[];
}

/** The fixture as committed to disk -- never mutated. `store.ts` clones
 * this once per process into the mutable in-memory copy every demo
 * read/write actually operates on. */
export const demoFixture: DemoDataset = raw as DemoDataset;

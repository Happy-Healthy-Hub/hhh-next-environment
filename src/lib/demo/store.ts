/**
 * Mutable, in-memory, development-only Demo Mode store. See
 * demo/README.md.
 *
 * `demo/demo-data.json` is the source of truth for the *initial* state
 * only. Every mutation (approve a request, assign a caregiver, schedule
 * a visit, change a status, grant a role...) operates on a clone kept in
 * `globalThis` -- `globalThis` survives Turbopack/Fast-Refresh module
 * re-evaluation in dev (a plain module-level `let` would otherwise reset
 * on every edit), the same technique `mock-data/store.ts` already uses.
 * The JSON file on disk is never written to. "Reset demo data" simply
 * re-clones the fixture.
 *
 * Every mutation here also appends a row to the in-memory audit log, so
 * Staff & Access's audit view stays realistic as the demo is driven.
 */
import { demoFixture, type DemoDataset } from './dataset';
import { parseCustomer } from '../customers';
import { parseCaregiver } from '../caregivers';
import { parseAssignment } from '../assignments';
import { parseVisit } from '../visits';
import { parseVisitReport } from '../reports';
import { buildStaffList, parseAuditEvent, type StaffMember, type AuditEvent } from '../staff';
import type { Customer } from '../customers';
import type { Caregiver } from '../caregivers';
import type { Assignment } from '../assignments';
import type { Visit } from '../visits';
import type { VisitReport } from '../reports';
import { CARE_REQUEST_STATUSES, type CareRequestStatus } from '../care-requests';

type MutableDataset = DemoDataset;

const globalForDemo = globalThis as unknown as { __hhhDemoStore?: MutableDataset };

function freshStore(): MutableDataset {
  return structuredClone(demoFixture);
}

function getStore(): MutableDataset {
  if (!globalForDemo.__hhhDemoStore) {
    globalForDemo.__hhhDemoStore = freshStore();
  }
  return globalForDemo.__hhhDemoStore;
}

/** The only reset path -- restores every entity to `demo-data.json`'s
 * committed contents. Never reachable outside Demo Mode (callers gate on
 * `isDemoMode()` before calling anything in this file). */
export function resetDemoStore(): void {
  globalForDemo.__hhhDemoStore = freshStore();
}

export class DemoNotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} was not found in the demo dataset.`);
    this.name = 'DemoNotFoundError';
  }
}

export class DemoStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemoStateError';
  }
}

let auditSeq = 1000;
function recordAudit(actorProfileId: string | null, eventType: string, entityType: string, entityId: string): void {
  const store = getStore();
  store.auditEvents.unshift({
    id: `demo-audit-runtime-${auditSeq++}`,
    occurred_at: new Date().toISOString(),
    actor_profile_id: actorProfileId,
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
  });
}

function findServiceName(id: string): string {
  return getStore().services.find((s) => s.id === id)?.name ?? 'Unknown service';
}

// --- Customers --------------------------------------------------------

export function demoListCustomers(): Customer[] {
  return getStore().customers.map((row) => parseCustomer(row)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function demoCreateCustomer(input: { fullName: string; phoneNumber: string | null; dateOfBirth: string | null }, actorProfileId: string): void {
  if (!input.fullName.trim()) throw new DemoStateError('Full name is required.');
  const store = getStore();
  const id = `demo-cust-runtime-${Date.now()}`;
  store.customers.unshift({
    id,
    full_name: input.fullName.trim(),
    preferred_name: null,
    phone_number: input.phoneNumber,
    email: null,
    city: null,
    status: 'active',
    profile_id: null,
    created_at: new Date().toISOString(),
  });
  recordAudit(actorProfileId, 'customer_created', 'customer', id);
}

export function demoSetCustomerStatus(customerId: string, status: 'active' | 'inactive', actorProfileId: string): void {
  const customer = getStore().customers.find((c) => c.id === customerId);
  if (!customer) throw new DemoNotFoundError('Customer', customerId);
  customer.status = status;
  recordAudit(actorProfileId, `customer_status_set_${status}`, 'customer', customerId);
}

// --- Caregivers ---------------------------------------------------------

export function demoListCaregivers(): Caregiver[] {
  return getStore().caregivers.map((row) => parseCaregiver(row)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function demoCreateCaregiver(profileId: string, displayName: string, actorProfileId: string): void {
  if (!profileId.trim() || !displayName.trim()) throw new DemoStateError('Both fields are required.');
  const store = getStore();
  const id = `demo-care-runtime-${Date.now()}`;
  store.caregivers.unshift({
    id,
    profile_id: profileId.trim(),
    public_display_name: displayName.trim(),
    status: 'active',
    created_at: new Date().toISOString(),
  });
  recordAudit(actorProfileId, 'caregiver_added', 'caregiver', id);
}

export function demoSetCaregiverStatus(
  caregiverId: string,
  status: 'active' | 'inactive' | 'suspended',
  actorProfileId: string
): void {
  const caregiver = getStore().caregivers.find((c) => c.id === caregiverId);
  if (!caregiver) throw new DemoNotFoundError('Caregiver', caregiverId);
  caregiver.status = status;
  recordAudit(actorProfileId, `caregiver_status_set_${status}`, 'caregiver', caregiverId);
}

// --- Care requests ------------------------------------------------------

function embedCareRequest(row: (typeof demoFixture.careRequests)[number]) {
  const customer = getStore().customers.find((c) => c.id === row.customer_id);
  return {
    id: row.id,
    status: row.status,
    preferred_start_date: row.preferred_start_date,
    preferred_end_date: row.preferred_end_date,
    preferred_time_of_day: row.preferred_time_of_day,
    schedule_notes: row.schedule_notes,
    customer_notes: row.customer_notes,
    decision_reason: row.decision_reason,
    cancellation_reason: row.cancellation_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customers: customer
      ? { id: customer.id, full_name: customer.full_name, preferred_name: customer.preferred_name, phone_number: customer.phone_number, email: customer.email }
      : { id: row.customer_id, full_name: 'Unknown customer', preferred_name: null, phone_number: null, email: null },
    care_request_items: row.service_ids.map((serviceId) => ({
      service_id: serviceId,
      quantity: 1,
      notes: null,
      services: { name: findServiceName(serviceId), base_price: null, currency_code: null, price_unit: null },
    })),
  };
}

/** Returns the raw, embedded-shape rows (not run through
 * `parseCareRequest`, since that function lives in `care-requests.ts`
 * and is imported by request pages directly) -- kept here only as the
 * demo equivalent of `CARE_REQUEST_SELECT`'s result shape. */
export function demoListCareRequestRows() {
  return getStore()
    .careRequests.map(embedCareRequest)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function demoStartReview(requestId: string, actorProfileId: string): void {
  const request = getStore().careRequests.find((r) => r.id === requestId);
  if (!request) throw new DemoNotFoundError('Care request', requestId);
  if (request.status !== 'submitted') throw new DemoStateError('This request is no longer awaiting review.');
  request.status = 'under_review';
  request.updated_at = new Date().toISOString();
  recordAudit(actorProfileId, 'care_request_reviewed', 'care_request', requestId);
}

export function demoDecideRequest(
  requestId: string,
  decision: 'approved' | 'rejected',
  reason: string | null,
  actorProfileId: string
): void {
  const request = getStore().careRequests.find((r) => r.id === requestId);
  if (!request) throw new DemoNotFoundError('Care request', requestId);
  if (request.status !== 'under_review') throw new DemoStateError('This request is not under review.');
  request.status = decision;
  request.decision_reason = reason;
  request.updated_at = new Date().toISOString();
  recordAudit(actorProfileId, decision === 'approved' ? 'care_request_approved' : 'care_request_rejected', 'care_request', requestId);
}

function isCareRequestStatus(value: string): value is CareRequestStatus {
  return (CARE_REQUEST_STATUSES as readonly string[]).includes(value);
}
export { isCareRequestStatus as demoIsCareRequestStatus };

// --- Assignments --------------------------------------------------------

function embedAssignment(row: (typeof demoFixture.assignments)[number]) {
  const caregiver = getStore().caregivers.find((c) => c.id === row.care_associate_id);
  const request = getStore().careRequests.find((r) => r.id === row.care_request_id);
  return {
    id: row.id,
    care_request_id: row.care_request_id,
    care_associate_id: row.care_associate_id,
    status: row.status,
    assigned_at: row.assigned_at,
    responded_at: row.responded_at,
    ended_at: row.ended_at,
    end_reason: row.end_reason,
    care_associates: { public_display_name: caregiver?.public_display_name ?? 'Unknown caregiver' },
    care_requests: request ? embedCareRequest(request) : null,
  };
}

export function demoListAssignments(): Assignment[] {
  return getStore()
    .assignments.map((row) => parseAssignment(embedAssignment(row)))
    .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
}

export function demoListApprovedRequestsAwaitingCaregiver() {
  const store = getStore();
  const openRequestIds = new Set(
    store.assignments.filter((a) => a.status === 'assigned' || a.status === 'accepted').map((a) => a.care_request_id)
  );
  return store.careRequests
    .filter((r) => r.status === 'approved' && !openRequestIds.has(r.id))
    .map((r) => {
      const customer = store.customers.find((c) => c.id === r.customer_id);
      return { id: r.id, preferred_start_date: r.preferred_start_date, customers: { id: r.customer_id, full_name: customer?.full_name ?? 'Unknown customer' } };
    });
}

export function demoAssignCaregiver(
  careRequestId: string,
  careAssociateId: string,
  replacesAssignmentId: string | null,
  actorProfileId: string
): void {
  const store = getStore();
  const request = store.careRequests.find((r) => r.id === careRequestId);
  if (!request || request.status !== 'approved') throw new DemoStateError('Only approved care requests can be assigned.');
  const caregiver = store.caregivers.find((c) => c.id === careAssociateId && c.status === 'active');
  if (!caregiver) throw new DemoStateError('Caregiver not found or not active.');

  if (replacesAssignmentId) {
    const old = store.assignments.find((a) => a.id === replacesAssignmentId);
    if (!old || old.care_request_id !== careRequestId || !(old.status === 'assigned' || old.status === 'accepted')) {
      throw new DemoStateError('The assignment being replaced is not open on this request.');
    }
    old.status = 'replaced';
    old.ended_at = new Date().toISOString();
    old.end_reason = 'Reassigned';
  }

  const id = `demo-asg-runtime-${Date.now()}`;
  store.assignments.unshift({
    id,
    care_request_id: careRequestId,
    care_associate_id: careAssociateId,
    status: 'assigned',
    assigned_at: new Date().toISOString(),
    responded_at: null,
    ended_at: null,
    end_reason: null,
  });
  recordAudit(actorProfileId, 'caregiver_assigned', 'care_assignment', id);
}

export function demoEndAssignment(assignmentId: string, outcome: 'completed' | 'cancelled', reason: string, actorProfileId: string): void {
  const assignment = getStore().assignments.find((a) => a.id === assignmentId);
  if (!assignment) throw new DemoNotFoundError('Assignment', assignmentId);
  if (!(assignment.status === 'assigned' || assignment.status === 'accepted')) {
    throw new DemoStateError('This assignment is already ended.');
  }
  assignment.status = outcome;
  assignment.ended_at = new Date().toISOString();
  assignment.end_reason = reason;
  recordAudit(actorProfileId, outcome === 'cancelled' ? 'assignment_withdrawn' : 'assignment_completed', 'care_assignment', assignmentId);
}

// --- Visits ---------------------------------------------------------------

function embedVisit(row: (typeof demoFixture.visits)[number]) {
  const customer = getStore().customers.find((c) => c.id === row.customer_id);
  const assignment = getStore().assignments.find((a) => a.id === row.care_assignment_id);
  const caregiver = assignment ? getStore().caregivers.find((c) => c.id === assignment.care_associate_id) : undefined;
  return {
    id: row.id,
    care_assignment_id: row.care_assignment_id,
    customer_id: row.customer_id,
    status: row.status,
    scheduled_start_at: row.scheduled_start_at,
    scheduled_end_at: row.scheduled_end_at,
    checked_in_at: row.checked_in_at,
    checked_out_at: row.checked_out_at,
    completed_at: row.completed_at,
    exception_reason: row.exception_reason,
    customers: { full_name: customer?.full_name ?? 'Unknown customer' },
    care_assignments: { care_associates: { public_display_name: caregiver?.public_display_name ?? 'Unknown caregiver' } },
  };
}

export function demoListVisits(): Visit[] {
  return getStore()
    .visits.map((row) => parseVisit(embedVisit(row)))
    .sort((a, b) => a.scheduledStartAt.localeCompare(b.scheduledStartAt));
}

export function demoCreateVisit(careAssignmentId: string, scheduledStartAt: string, scheduledEndAt: string, actorProfileId: string): void {
  const store = getStore();
  const assignment = store.assignments.find((a) => a.id === careAssignmentId);
  if (!assignment || !(assignment.status === 'assigned' || assignment.status === 'accepted')) {
    throw new DemoStateError('This assignment is not open.');
  }
  if (!(new Date(scheduledEndAt) > new Date(scheduledStartAt))) {
    throw new DemoStateError('The end time must be after the start time.');
  }
  const id = `demo-vis-runtime-${Date.now()}`;
  const request = store.careRequests.find((r) => r.id === assignment.care_request_id);
  store.visits.unshift({
    id,
    care_assignment_id: careAssignmentId,
    customer_id: request?.customer_id ?? '',
    status: 'scheduled',
    scheduled_start_at: scheduledStartAt,
    scheduled_end_at: scheduledEndAt,
    checked_in_at: null,
    checked_out_at: null,
    completed_at: null,
    exception_reason: null,
  });
  recordAudit(actorProfileId, 'visit_scheduled', 'visit', id);
}

export function demoCancelVisit(visitId: string, reason: string, actorProfileId: string): void {
  const visit = getStore().visits.find((v) => v.id === visitId);
  if (!visit) throw new DemoNotFoundError('Visit', visitId);
  if (!(visit.status === 'scheduled' || visit.status === 'in_progress')) {
    throw new DemoStateError('This visit can no longer be cancelled.');
  }
  visit.status = 'cancelled';
  visit.exception_reason = reason;
  recordAudit(actorProfileId, 'visit_cancelled', 'visit', visitId);
}

// --- Visit reports (read-only in this portal) ------------------------------

export function demoListVisitReports(): VisitReport[] {
  const store = getStore();
  return store.visitNotes
    .filter((n) => n.visibility === 'care_team')
    .map((n) => {
      const visit = store.visits.find((v) => v.id === n.visit_id);
      const customer = visit ? store.customers.find((c) => c.id === visit.customer_id) : undefined;
      const assignment = visit ? store.assignments.find((a) => a.id === visit.care_assignment_id) : undefined;
      const caregiver = assignment ? store.caregivers.find((c) => c.id === assignment.care_associate_id) : undefined;
      return parseVisitReport({
        id: n.id,
        visit_id: n.visit_id,
        body: n.body,
        created_at: n.created_at,
        visits: {
          scheduled_start_at: visit?.scheduled_start_at ?? n.created_at,
          customers: { full_name: customer?.full_name ?? 'Unknown customer' },
          care_assignments: { care_associates: { public_display_name: caregiver?.public_display_name ?? 'Unknown caregiver' } },
        },
      });
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// --- Staff & audit --------------------------------------------------------

export function demoListStaff(currentUserId: string): StaffMember[] {
  const store = getStore();
  const profiles = store.staff.map((s) => ({ id: s.profile_id, display_name: s.display_name, account_status: s.account_status }));
  const userRoles = store.staff.flatMap((s) => s.roles.map((role_key) => ({ user_id: s.profile_id, role_key })));
  return buildStaffList(profiles, userRoles, currentUserId);
}

export function demoGrantRole(profileId: string, roleKey: string, actorProfileId: string): void {
  if (profileId === actorProfileId) throw new DemoStateError("You can't change your own role or access.");
  const staff = getStore().staff.find((s) => s.profile_id === profileId);
  if (!staff) throw new DemoNotFoundError('Staff account', profileId);
  if (!staff.roles.includes(roleKey)) staff.roles.push(roleKey);
  recordAudit(actorProfileId, 'staff_role_granted', 'profile', profileId);
}

export function demoRevokeRole(profileId: string, roleKey: string, actorProfileId: string): void {
  if (profileId === actorProfileId) throw new DemoStateError("You can't change your own role or access.");
  const staff = getStore().staff.find((s) => s.profile_id === profileId);
  if (!staff) throw new DemoNotFoundError('Staff account', profileId);
  staff.roles = staff.roles.filter((r) => r !== roleKey);
  recordAudit(actorProfileId, 'staff_role_revoked', 'profile', profileId);
}

export function demoSetAccountStatus(profileId: string, status: 'active' | 'deactivated', actorProfileId: string): void {
  if (profileId === actorProfileId) throw new DemoStateError("You can't change your own role or access.");
  const staff = getStore().staff.find((s) => s.profile_id === profileId);
  if (!staff) throw new DemoNotFoundError('Staff account', profileId);
  staff.account_status = status;
  recordAudit(actorProfileId, status === 'deactivated' ? 'staff_access_deactivated' : 'staff_access_reactivated', 'profile', profileId);
}

export function demoListAuditEvents(): AuditEvent[] {
  return getStore()
    .auditEvents.map((row) => parseAuditEvent(row))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 100);
}

// --- Settings (my profile) -------------------------------------------------

export function demoGetDisplayName(profileId: string): string {
  return getStore().staff.find((s) => s.profile_id === profileId)?.display_name ?? '';
}

export function demoSetDisplayName(profileId: string, displayName: string): void {
  const staff = getStore().staff.find((s) => s.profile_id === profileId);
  if (!staff) throw new DemoNotFoundError('Staff account', profileId);
  staff.display_name = displayName;
}

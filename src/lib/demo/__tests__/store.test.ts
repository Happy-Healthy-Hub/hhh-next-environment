import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetDemoStore,
  demoListCustomers,
  demoCreateCustomer,
  demoSetCustomerStatus,
  demoListCaregivers,
  demoSetCaregiverStatus,
  demoListCareRequestRows,
  demoStartReview,
  demoDecideRequest,
  demoListAssignments,
  demoListApprovedRequestsAwaitingCaregiver,
  demoAssignCaregiver,
  demoEndAssignment,
  demoListVisits,
  demoCreateVisit,
  demoCancelVisit,
  demoListVisitReports,
  demoListStaff,
  demoGrantRole,
  demoRevokeRole,
  demoSetAccountStatus,
  demoListAuditEvents,
  DemoStateError,
} from '../store';
import { parseCareRequest } from '../../care-requests';

const ADMIN = 'demo-staff-01';
const COORDINATOR = 'demo-staff-02';

describe('demo store', () => {
  beforeEach(() => resetDemoStore());

  it('loads the fixture counts the task specified', () => {
    expect(demoListCustomers().length).toBeGreaterThanOrEqual(12);
    expect(demoListCaregivers().length).toBeGreaterThanOrEqual(10);
    expect(demoListCareRequestRows().length).toBeGreaterThanOrEqual(15);
    expect(demoListAssignments().length).toBeGreaterThanOrEqual(8);
    expect(demoListVisits().length).toBeGreaterThanOrEqual(15);
    expect(demoListVisitReports().length).toBeGreaterThan(0);
    expect(demoListStaff('').length).toBeGreaterThanOrEqual(5);
    expect(demoListAuditEvents().length).toBeGreaterThan(0);
  });

  it('every assignment references a real request and caregiver', () => {
    const requestIds = new Set(demoListCareRequestRows().map((r) => r.id));
    const caregiverIds = new Set(demoListCaregivers().map((c) => c.id));
    for (const assignment of demoListAssignments()) {
      expect(requestIds.has(assignment.careRequestId)).toBe(true);
      expect(caregiverIds.has(assignment.careAssociateId)).toBe(true);
    }
  });

  it('every visit resolves through parseVisit to a known customer/caregiver', () => {
    for (const visit of demoListVisits()) {
      expect(visit.customerName).not.toBe('Unknown customer');
      expect(visit.caregiverName).not.toBe('Unknown caregiver');
    }
  });

  it('reset restores the original counts after a mutation', () => {
    const before = demoListCustomers().length;
    demoCreateCustomer({ fullName: 'Test Person', phoneNumber: null, dateOfBirth: null }, ADMIN);
    expect(demoListCustomers().length).toBe(before + 1);
    resetDemoStore();
    expect(demoListCustomers().length).toBe(before);
  });

  it('creates and status-changes a customer', () => {
    demoCreateCustomer({ fullName: 'Nandini Rao', phoneNumber: '+910000009999', dateOfBirth: null }, ADMIN);
    const created = demoListCustomers().find((c) => c.fullName === 'Nandini Rao');
    expect(created).toBeDefined();
    demoSetCustomerStatus(created!.id, 'inactive', ADMIN);
    expect(demoListCustomers().find((c) => c.id === created!.id)?.status).toBe('inactive');
  });

  it('status-changes a caregiver', () => {
    const caregiver = demoListCaregivers()[0];
    demoSetCaregiverStatus(caregiver.id, 'suspended', ADMIN);
    expect(demoListCaregivers().find((c) => c.id === caregiver.id)?.status).toBe('suspended');
  });

  it('moves a submitted request through review to approved', () => {
    const submitted = demoListCareRequestRows().map(parseCareRequest).find((r) => r.status === 'submitted');
    expect(submitted).toBeDefined();
    demoStartReview(submitted!.id, COORDINATOR);
    expect(parseCareRequest(demoListCareRequestRows().find((r) => r.id === submitted!.id)).status).toBe('under_review');
    demoDecideRequest(submitted!.id, 'approved', 'Looks good.', COORDINATOR);
    expect(parseCareRequest(demoListCareRequestRows().find((r) => r.id === submitted!.id)).status).toBe('approved');
  });

  it('refuses to decide a request that is not under review', () => {
    const approved = demoListCareRequestRows().map(parseCareRequest).find((r) => r.status === 'approved');
    expect(() => demoDecideRequest(approved!.id, 'approved', null, COORDINATOR)).toThrow(DemoStateError);
  });

  it('assigns a caregiver to an approved, unassigned request', () => {
    const awaiting = demoListApprovedRequestsAwaitingCaregiver();
    expect(awaiting.length).toBeGreaterThan(0);
    const target = awaiting[0];
    const caregiver = demoListCaregivers().find((c) => c.status === 'active')!;
    demoAssignCaregiver(target.id, caregiver.id, null, ADMIN);
    const created = demoListAssignments().find((a) => a.careRequestId === target.id);
    expect(created?.careAssociateId).toBe(caregiver.id);
    expect(created?.status).toBe('assigned');
  });

  it('reassignment marks the old assignment replaced and keeps one open', () => {
    const open = demoListAssignments().find((a) => a.status === 'accepted');
    expect(open).toBeDefined();
    const newCaregiver = demoListCaregivers().find((c) => c.status === 'active' && c.id !== open!.careAssociateId)!;
    demoAssignCaregiver(open!.careRequestId, newCaregiver.id, open!.id, ADMIN);
    const all = demoListAssignments().filter((a) => a.careRequestId === open!.careRequestId);
    expect(all.find((a) => a.id === open!.id)?.status).toBe('replaced');
    expect(all.some((a) => a.careAssociateId === newCaregiver.id && a.status === 'assigned')).toBe(true);
  });

  it('withdraws an open assignment', () => {
    const open = demoListAssignments().find((a) => a.status === 'assigned');
    expect(open).toBeDefined();
    demoEndAssignment(open!.id, 'cancelled', 'Test withdrawal', ADMIN);
    expect(demoListAssignments().find((a) => a.id === open!.id)?.status).toBe('cancelled');
  });

  it('creates and cancels a visit for an open assignment', () => {
    const open = demoListAssignments().find((a) => a.status === 'accepted' || a.status === 'assigned');
    expect(open).toBeDefined();
    const before = demoListVisits().filter((v) => v.careAssignmentId === open!.id).length;
    demoCreateVisit(open!.id, '2026-12-01T04:00:00.000Z', '2026-12-01T06:00:00.000Z', ADMIN);
    const forAssignment = demoListVisits().filter((v) => v.careAssignmentId === open!.id);
    expect(forAssignment.length).toBe(before + 1);
    const created = forAssignment.find((v) => v.status === 'scheduled' && v.scheduledStartAt === '2026-12-01T04:00:00.000Z')!;
    expect(created).toBeDefined();
    demoCancelVisit(created.id, 'Test cancellation', ADMIN);
    expect(demoListVisits().find((v) => v.id === created.id)?.status).toBe('cancelled');
  });

  it('grants and revokes a staff role, recording audit events', () => {
    const before = demoListAuditEvents().length;
    const coordinatorOnly = demoListStaff(ADMIN).find((s) => !s.roles.includes('administrator') && s.accountStatus === 'active')!;
    demoGrantRole(coordinatorOnly.profileId, 'administrator', ADMIN);
    expect(demoListStaff(ADMIN).find((s) => s.profileId === coordinatorOnly.profileId)?.roles).toContain('administrator');
    demoRevokeRole(coordinatorOnly.profileId, 'administrator', ADMIN);
    expect(demoListStaff(ADMIN).find((s) => s.profileId === coordinatorOnly.profileId)?.roles).not.toContain('administrator');
    expect(demoListAuditEvents().length).toBeGreaterThan(before);
  });

  it('refuses to let an administrator change their own role or status', () => {
    expect(() => demoGrantRole(ADMIN, 'care_coordinator', ADMIN)).toThrow(DemoStateError);
    expect(() => demoRevokeRole(ADMIN, 'administrator', ADMIN)).toThrow(DemoStateError);
    expect(() => demoSetAccountStatus(ADMIN, 'deactivated', ADMIN)).toThrow(DemoStateError);
  });

  it('deactivates and reactivates a different staff account', () => {
    const other = demoListStaff(ADMIN).find((s) => s.profileId !== ADMIN && s.accountStatus === 'active')!;
    demoSetAccountStatus(other.profileId, 'deactivated', ADMIN);
    expect(demoListStaff(ADMIN).find((s) => s.profileId === other.profileId)?.accountStatus).toBe('deactivated');
    demoSetAccountStatus(other.profileId, 'active', ADMIN);
    expect(demoListStaff(ADMIN).find((s) => s.profileId === other.profileId)?.accountStatus).toBe('active');
  });
});

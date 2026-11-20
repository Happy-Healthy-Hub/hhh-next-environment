import { describe, expect, it } from 'vitest';
import { parseCustomer, isCustomerStatus } from '../customers';
import { parseCaregiver, isCaregiverStatus } from '../caregivers';
import { parseAssignment, isOpenAssignment } from '../assignments';
import { parseVisit, canCancelVisit } from '../visits';
import { buildStaffList } from '../staff';

describe('customers', () => {
  it('parses a full row', () => {
    const c = parseCustomer({
      id: 'c1',
      full_name: 'Priya Sharma',
      preferred_name: null,
      phone_number: '+919876543210',
      email: null,
      city: 'Pune',
      status: 'active',
      profile_id: null,
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(c.fullName).toBe('Priya Sharma');
    expect(c.profileId).toBeNull();
  });

  it('rejects an invented status', () => {
    expect(isCustomerStatus('incomplete')).toBe(false);
    expect(isCustomerStatus('active')).toBe(true);
  });

  it('throws on a malformed row rather than guessing', () => {
    expect(() => parseCustomer({ id: 'c1' })).toThrow();
  });
});

describe('caregivers', () => {
  it('parses a full row', () => {
    const c = parseCaregiver({
      id: 'ca1',
      profile_id: 'p1',
      public_display_name: 'Anil Demo',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(c.publicDisplayName).toBe('Anil Demo');
  });

  it('accepts the three real statuses only', () => {
    expect(isCaregiverStatus('suspended')).toBe(true);
    expect(isCaregiverStatus('pending')).toBe(false);
  });

  // Regression: a caregiver added by staff without an app account yet has
  // profile_id = NULL (same nullable state customers.profile_id already
  // allows -- see the "parses a full row" customer test above). Before
  // this fix, parseCaregiver required profile_id to be a string, so this
  // single row crashed the whole Caregivers list page for every caregiver,
  // not just this one.
  it('parses a row with no linked app account (profile_id null)', () => {
    const c = parseCaregiver({
      id: 'ca2',
      profile_id: null,
      public_display_name: 'Other Caregiver',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(c.publicDisplayName).toBe('Other Caregiver');
    expect(c.profileId).toBeNull();
  });
});

describe('assignments', () => {
  it('open means assigned or accepted only', () => {
    expect(isOpenAssignment('assigned')).toBe(true);
    expect(isOpenAssignment('accepted')).toBe(true);
    expect(isOpenAssignment('completed')).toBe(false);
    expect(isOpenAssignment('replaced')).toBe(false);
  });

  it('parses a row with embedded request/customer/services', () => {
    const a = parseAssignment({
      id: 'a1',
      care_request_id: 'r1',
      care_associate_id: 'ca1',
      status: 'assigned',
      assigned_at: '2026-01-01T00:00:00Z',
      responded_at: null,
      ended_at: null,
      end_reason: null,
      care_associates: { public_display_name: 'Anil Demo' },
      care_requests: {
        id: 'r1',
        status: 'approved',
        preferred_start_date: '2026-11-10',
        customers: { id: 'c1', full_name: 'Priya Sharma' },
        care_request_items: [{ services: { name: 'Skilled Home Nursing' } }],
      },
    });
    expect(a.caregiverName).toBe('Anil Demo');
    expect(a.request?.services).toEqual(['Skilled Home Nursing']);
  });

  it('parses the array form PostgREST can return for an embedded relation', () => {
    const a = parseAssignment({
      id: 'a1',
      care_request_id: 'r1',
      care_associate_id: 'ca1',
      status: 'accepted',
      assigned_at: '2026-01-01T00:00:00Z',
      responded_at: null,
      ended_at: null,
      end_reason: null,
      care_associates: [{ public_display_name: 'Anil Demo' }],
      care_requests: [
        {
          id: 'r1',
          status: 'approved',
          preferred_start_date: '2026-11-10',
          customers: [{ id: 'c1', full_name: 'Priya Sharma' }],
          care_request_items: [],
        },
      ],
    });
    expect(a.caregiverName).toBe('Anil Demo');
    expect(a.request?.services).toEqual([]);
  });
});

describe('visits', () => {
  it('only a scheduled or in-progress visit can be cancelled', () => {
    expect(canCancelVisit('scheduled')).toBe(true);
    expect(canCancelVisit('in_progress')).toBe(true);
    expect(canCancelVisit('completed')).toBe(false);
    expect(canCancelVisit('missed')).toBe(false);
  });

  it('parses a row with embedded customer/caregiver', () => {
    const v = parseVisit({
      id: 'v1',
      care_assignment_id: 'a1',
      customer_id: 'c1',
      status: 'scheduled',
      scheduled_start_at: '2026-11-10T09:00:00Z',
      scheduled_end_at: '2026-11-10T11:00:00Z',
      checked_in_at: null,
      checked_out_at: null,
      completed_at: null,
      exception_reason: null,
      customers: { full_name: 'Priya Sharma' },
      care_assignments: { care_associates: { public_display_name: 'Anil Demo' } },
    });
    expect(v.customerName).toBe('Priya Sharma');
    expect(v.caregiverName).toBe('Anil Demo');
  });
});

describe('buildStaffList', () => {
  it('includes only profiles holding a staff role, and flags self', () => {
    const staff = buildStaffList(
      [
        { id: 'p1', display_name: 'Asha K.', account_status: 'active' },
        { id: 'p2', display_name: 'A Customer', account_status: 'active' },
      ],
      [
        { user_id: 'p1', role_key: 'care_coordinator' },
        { user_id: 'p2', role_key: 'customer' },
      ],
      'p1'
    );
    expect(staff).toHaveLength(1);
    expect(staff[0].profileId).toBe('p1');
    expect(staff[0].isSelf).toBe(true);
    expect(staff[0].roles).toEqual(['care_coordinator']);
  });

  it('a staff member with two roles keeps both', () => {
    const staff = buildStaffList(
      [{ id: 'p1', display_name: 'Rohit M.', account_status: 'active' }],
      [
        { user_id: 'p1', role_key: 'care_coordinator' },
        { user_id: 'p1', role_key: 'administrator' },
      ],
      'someone-else'
    );
    expect(staff[0].roles).toEqual(['care_coordinator', 'administrator']);
    expect(staff[0].isSelf).toBe(false);
  });
});

import type { SupabaseClient } from '@supabase/supabase-js';
import { isDemoMode } from './demo/config';
import { demoListAssignments, demoListApprovedRequestsAwaitingCaregiver } from './demo/store';

/**
 * Assignment (`public.care_assignments`) domain types, mirroring the
 * caregiver Flutter app's AssignmentStatus exactly, and the trusted
 * `assign_care_associate` / `end_care_assignment` function bodies.
 * Re-read directly from the live schema this session.
 */

export const ASSIGNMENT_STATUSES = [
  'assigned',
  'accepted',
  'declined',
  'completed',
  'cancelled',
  'replaced',
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  assigned: 'Assigned',
  accepted: 'Acknowledged',
  declined: 'Declined',
  completed: 'Completed',
  cancelled: 'Cancelled',
  replaced: 'Reassigned',
};

export const ASSIGNMENT_STATUS_BADGE_CLASS: Record<AssignmentStatus, string> = {
  assigned: 'hhh-badge--attention',
  accepted: 'hhh-badge--positive',
  declined: 'hhh-badge--critical',
  completed: 'hhh-badge--positive',
  cancelled: 'hhh-badge--neutral',
  replaced: 'hhh-badge--neutral',
};

export function isAssignmentStatus(value: string): value is AssignmentStatus {
  return (ASSIGNMENT_STATUSES as readonly string[]).includes(value);
}

/** An assignment counts as "open" (still the live assignment for its
 * request) only in these two statuses -- mirrors the database's own
 * `care_assignments_closed_has_end` / `..._open_has_no_end` constraints. */
export function isOpenAssignment(status: AssignmentStatus): boolean {
  return status === 'assigned' || status === 'accepted';
}

export interface AssignmentRequestSummary {
  id: string;
  status: string;
  preferredStartDate: string;
  customerId: string;
  customerName: string;
  services: string[];
}

export interface Assignment {
  id: string;
  careRequestId: string;
  careAssociateId: string;
  caregiverName: string;
  status: AssignmentStatus;
  assignedAt: string;
  respondedAt: string | null;
  endedAt: string | null;
  endReason: string | null;
  request: AssignmentRequestSummary | null;
}

export const ASSIGNMENT_SELECT = `
  id, care_request_id, care_associate_id, status, assigned_at, responded_at,
  ended_at, end_reason,
  care_associates(public_display_name),
  care_requests(id, status, preferred_start_date,
    customers(id, full_name),
    care_request_items(services(name)))
`;

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function embedded(value: unknown): Record<string, unknown> | undefined {
  return (Array.isArray(value) ? value[0] : value) as Record<string, unknown> | undefined;
}

export function parseAssignment(row: unknown): Assignment {
  const r = row as Record<string, unknown>;
  if (
    typeof r?.id !== 'string' ||
    typeof r?.care_request_id !== 'string' ||
    typeof r?.care_associate_id !== 'string' ||
    typeof r?.status !== 'string' ||
    !isAssignmentStatus(r.status) ||
    typeof r?.assigned_at !== 'string'
  ) {
    throw new Error('Unexpected assignment shape');
  }
  const caregiver = embedded(r.care_associates);
  const requestRaw = embedded(r.care_requests);
  let request: AssignmentRequestSummary | null = null;
  if (requestRaw) {
    const customer = embedded(requestRaw.customers);
    const items = Array.isArray(requestRaw.care_request_items) ? requestRaw.care_request_items : [];
    if (
      typeof requestRaw.id === 'string' &&
      typeof requestRaw.status === 'string' &&
      typeof requestRaw.preferred_start_date === 'string' &&
      customer &&
      typeof customer.id === 'string' &&
      typeof customer.full_name === 'string'
    ) {
      request = {
        id: requestRaw.id,
        status: requestRaw.status,
        preferredStartDate: requestRaw.preferred_start_date,
        customerId: customer.id,
        customerName: customer.full_name,
        services: items
          .map((item) => {
            const service = embedded((item as Record<string, unknown>).services);
            return typeof service?.name === 'string' ? service.name : null;
          })
          .filter((name): name is string => name !== null),
      };
    }
  }
  return {
    id: r.id,
    careRequestId: r.care_request_id,
    careAssociateId: r.care_associate_id,
    caregiverName: typeof caregiver?.public_display_name === 'string' ? caregiver.public_display_name : 'Unknown caregiver',
    status: r.status,
    assignedAt: r.assigned_at,
    respondedAt: asString(r.responded_at),
    endedAt: asString(r.ended_at),
    endReason: asString(r.end_reason),
    request,
  };
}

export interface AwaitingRequest {
  id: string;
  preferred_start_date: string;
  customers: { id: string; full_name: string };
}

/** See `customers.ts#fetchCustomers` for the same real-vs-demo pattern. */
export async function fetchAssignments(supabase: SupabaseClient): Promise<Assignment[]> {
  if (isDemoMode()) return demoListAssignments();
  const { data, error } = await supabase.from('care_assignments').select(ASSIGNMENT_SELECT).order('assigned_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(parseAssignment);
}

export async function fetchAssignmentsForRequest(supabase: SupabaseClient, careRequestId: string): Promise<Assignment[]> {
  if (isDemoMode()) return demoListAssignments().filter((a) => a.careRequestId === careRequestId);
  const { data, error } = await supabase.from('care_assignments').select(ASSIGNMENT_SELECT).eq('care_request_id', careRequestId);
  if (error) throw error;
  return (data ?? []).map(parseAssignment);
}

export async function fetchApprovedRequestsAwaitingCaregiver(supabase: SupabaseClient): Promise<AwaitingRequest[]> {
  if (isDemoMode()) return demoListApprovedRequestsAwaitingCaregiver();
  const { data, error } = await supabase
    .from('care_requests')
    .select('id, preferred_start_date, customers(id, full_name)')
    .eq('status', 'approved')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AwaitingRequest[];
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { isDemoMode } from './demo/config';
import { demoListVisits } from './demo/store';

/**
 * Visit (`public.visits`) domain types, mirroring the caregiver Flutter
 * app's VisitStatus exactly, and the trusted `schedule_visit` /
 * `cancel_visit` / `mark_visit_missed` / `complete_visit` function
 * bodies. Re-read directly from the live schema this session.
 */

export const VISIT_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled', 'missed'] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  missed: 'Missed',
};

export const VISIT_STATUS_BADGE_CLASS: Record<VisitStatus, string> = {
  scheduled: 'hhh-badge--neutral',
  in_progress: 'hhh-badge--attention',
  completed: 'hhh-badge--positive',
  cancelled: 'hhh-badge--critical',
  missed: 'hhh-badge--critical',
};

export function isVisitStatus(value: string): value is VisitStatus {
  return (VISIT_STATUSES as readonly string[]).includes(value);
}

/** Mirrors `cancel_visit`'s own guard -- a completed/cancelled/missed
 * visit cannot be cancelled again. */
export function canCancelVisit(status: VisitStatus): boolean {
  return status === 'scheduled' || status === 'in_progress';
}

export interface Visit {
  id: string;
  careAssignmentId: string;
  customerId: string;
  customerName: string;
  caregiverName: string;
  status: VisitStatus;
  scheduledStartAt: string;
  scheduledEndAt: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  completedAt: string | null;
  exceptionReason: string | null;
}

export const VISIT_SELECT = `
  id, care_assignment_id, customer_id, status, scheduled_start_at, scheduled_end_at,
  checked_in_at, checked_out_at, completed_at, exception_reason,
  customers(full_name),
  care_assignments(care_associates(public_display_name))
`;

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function embedded(value: unknown): Record<string, unknown> | undefined {
  return (Array.isArray(value) ? value[0] : value) as Record<string, unknown> | undefined;
}

export function parseVisit(row: unknown): Visit {
  const r = row as Record<string, unknown>;
  if (
    typeof r?.id !== 'string' ||
    typeof r?.care_assignment_id !== 'string' ||
    typeof r?.customer_id !== 'string' ||
    typeof r?.status !== 'string' ||
    !isVisitStatus(r.status) ||
    typeof r?.scheduled_start_at !== 'string' ||
    typeof r?.scheduled_end_at !== 'string'
  ) {
    throw new Error('Unexpected visit shape');
  }
  const customer = embedded(r.customers);
  const assignment = embedded(r.care_assignments);
  const caregiver = embedded(assignment?.care_associates);
  return {
    id: r.id,
    careAssignmentId: r.care_assignment_id,
    customerId: r.customer_id,
    customerName: typeof customer?.full_name === 'string' ? customer.full_name : 'Unknown customer',
    caregiverName: typeof caregiver?.public_display_name === 'string' ? caregiver.public_display_name : 'Unknown caregiver',
    status: r.status,
    scheduledStartAt: r.scheduled_start_at,
    scheduledEndAt: r.scheduled_end_at,
    checkedInAt: asString(r.checked_in_at),
    checkedOutAt: asString(r.checked_out_at),
    completedAt: asString(r.completed_at),
    exceptionReason: asString(r.exception_reason),
  };
}

/** See `customers.ts#fetchCustomers` for the same real-vs-demo pattern. */
export async function fetchVisits(supabase: SupabaseClient): Promise<Visit[]> {
  if (isDemoMode()) return demoListVisits();
  const { data, error } = await supabase.from('visits').select(VISIT_SELECT).order('scheduled_start_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(parseVisit);
}

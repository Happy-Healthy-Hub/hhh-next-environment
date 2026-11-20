import type { SupabaseClient } from '@supabase/supabase-js';
import { isDemoMode } from './demo/config';
import { demoListCaregivers } from './demo/store';

/**
 * Caregiver (`public.care_associates`) domain types, mirroring the
 * Flutter caregiver app's CareAssociateStatus exactly (same database
 * column, same three values) and the trusted `create_care_associate` /
 * `set_care_associate_status` function bodies.
 */

export const CAREGIVER_STATUSES = ['active', 'inactive', 'suspended'] as const;
export type CaregiverStatus = (typeof CAREGIVER_STATUSES)[number];

export const CAREGIVER_STATUS_LABELS: Record<CaregiverStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

export const CAREGIVER_STATUS_BADGE_CLASS: Record<CaregiverStatus, string> = {
  active: 'hhh-badge--positive',
  inactive: 'hhh-badge--neutral',
  suspended: 'hhh-badge--critical',
};

export function isCaregiverStatus(value: string): value is CaregiverStatus {
  return (CAREGIVER_STATUSES as readonly string[]).includes(value);
}

export interface Caregiver {
  id: string;
  /** Null for a caregiver added without an app account yet -- the same
   * nullable `care_associates.profile_id` state `customers.profile_id`
   * already allows (see `customers.ts#parseCustomer`). Not a data defect. */
  profileId: string | null;
  publicDisplayName: string;
  status: CaregiverStatus;
  createdAt: string;
}

export const CAREGIVER_SELECT = 'id, profile_id, public_display_name, status, created_at';

interface RawCaregiverRow {
  id: unknown;
  profile_id: unknown;
  public_display_name: unknown;
  status: unknown;
  created_at: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function parseCaregiver(row: unknown): Caregiver {
  const r = row as RawCaregiverRow;
  if (
    typeof r?.id !== 'string' ||
    typeof r?.public_display_name !== 'string' ||
    typeof r?.status !== 'string' ||
    !isCaregiverStatus(r.status) ||
    typeof r?.created_at !== 'string'
  ) {
    throw new Error('Unexpected caregiver shape');
  }
  return {
    id: r.id,
    profileId: asString(r.profile_id),
    publicDisplayName: r.public_display_name,
    status: r.status,
    createdAt: r.created_at,
  };
}

/** See `customers.ts#fetchCustomers` for the same pattern. */
export async function fetchCaregivers(supabase: SupabaseClient): Promise<Caregiver[]> {
  if (isDemoMode()) return demoListCaregivers();
  const { data, error } = await supabase.from('care_associates').select(CAREGIVER_SELECT).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(parseCaregiver);
}

export interface CaregiverDetail extends Caregiver {
  assignments: CaregiverAssignment[];
  recentVisits: CaregiverVisit[];
}

export interface CaregiverAssignment {
  id: string;
  customerName: string;
  status: string;
  assignedAt: string | null;
  endedAt: string | null;
}

export interface CaregiverVisit {
  id: string;
  customerName: string;
  status: string;
  scheduledStart: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
}

export async function fetchCaregiverDetail(
  supabase: SupabaseClient,
  caregiverId: string
): Promise<CaregiverDetail | null> {
  if (isDemoMode()) {
    const all = demoListCaregivers();
    const c = all.find((c) => c.id === caregiverId);
    if (!c) return null;
    return { ...c, assignments: [], recentVisits: [] };
  }

  const { data: row, error } = await supabase
    .from('care_associates')
    .select(CAREGIVER_SELECT)
    .eq('id', caregiverId)
    .single();

  if (error || !row) return null;
  const base = parseCaregiver(row);

  const { data: assignRows } = await supabase
    .from('care_assignments')
    .select('id, status, assigned_at, ended_at, care_request:care_requests!care_assignments_care_request_id_fkey(customer:customers!care_requests_customer_id_fkey(full_name))')
    .eq('care_associate_id', caregiverId)
    .order('created_at', { ascending: false })
    .limit(15);

  const assignments: CaregiverAssignment[] = (assignRows ?? []).map((a: Record<string, unknown>) => {
    const cr = a.care_request as Record<string, unknown> | null;
    const cust = cr?.customer as Record<string, unknown> | null;
    return {
      id: a.id as string,
      customerName: cust ? (cust.full_name as string) : 'Unknown',
      status: a.status as string,
      assignedAt: (a.assigned_at as string) ?? null,
      endedAt: (a.ended_at as string) ?? null,
    };
  });

  const { data: visitRows } = await supabase
    .from('visits')
    .select('id, status, scheduled_start_at, checked_in_at, checked_out_at, customer:customers!visits_customer_id_fkey(full_name), care_assignment:care_assignments!visits_care_assignment_id_fkey(care_associate_id)')
    .order('scheduled_start_at', { ascending: false })
    .limit(50);

  const recentVisits: CaregiverVisit[] = (visitRows ?? [])
    .filter((v: Record<string, unknown>) => {
      const ca = v.care_assignment as Record<string, unknown> | null;
      return ca && ca.care_associate_id === caregiverId;
    })
    .slice(0, 10)
    .map((v: Record<string, unknown>) => {
      const cust = v.customer as Record<string, unknown> | null;
      return {
        id: v.id as string,
        customerName: cust ? (cust.full_name as string) : 'Unknown',
        status: v.status as string,
        scheduledStart: (v.scheduled_start_at as string) ?? null,
        checkedInAt: (v.checked_in_at as string) ?? null,
        checkedOutAt: (v.checked_out_at as string) ?? null,
      };
    });

  return { ...base, assignments, recentVisits };
}

export async function fetchActiveCaregivers(supabase: SupabaseClient): Promise<Caregiver[]> {
  if (isDemoMode()) return demoListCaregivers().filter((c) => c.status === 'active');
  const { data, error } = await supabase.from('care_associates').select(CAREGIVER_SELECT).eq('status', 'active');
  if (error) throw error;
  return (data ?? []).map(parseCaregiver);
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { isDemoMode } from './demo/config';
import { demoListVisitReports } from './demo/store';

/**
 * Visit reports (`public.visit_notes`), read-only from this portal.
 * There is no "reviewed" column or incident table in the schema --
 * AD67/68 (review a report) and AD69-71 (incidents) have no backend to
 * build against yet; see OPERATIONS_API_REQUIREMENTS.md.
 */

export interface VisitReport {
  id: string;
  visitId: string;
  body: string;
  createdAt: string;
  customerName: string;
  caregiverName: string;
  visitScheduledStartAt: string;
}

export const VISIT_REPORT_SELECT = `
  id, visit_id, body, created_at,
  visits(scheduled_start_at, customers(full_name),
    care_assignments(care_associates(public_display_name)))
`;

function embedded(value: unknown): Record<string, unknown> | undefined {
  return (Array.isArray(value) ? value[0] : value) as Record<string, unknown> | undefined;
}

export function parseVisitReport(row: unknown): VisitReport {
  const r = row as Record<string, unknown>;
  if (typeof r?.id !== 'string' || typeof r?.visit_id !== 'string' || typeof r?.body !== 'string' || typeof r?.created_at !== 'string') {
    throw new Error('Unexpected visit report shape');
  }
  const visit = embedded(r.visits);
  const customer = embedded(visit?.customers);
  const assignment = embedded(visit?.care_assignments);
  const caregiver = embedded(assignment?.care_associates);
  return {
    id: r.id,
    visitId: r.visit_id,
    body: r.body,
    createdAt: r.created_at,
    customerName: typeof customer?.full_name === 'string' ? customer.full_name : 'Unknown customer',
    caregiverName: typeof caregiver?.public_display_name === 'string' ? caregiver.public_display_name : 'Unknown caregiver',
    visitScheduledStartAt: typeof visit?.scheduled_start_at === 'string' ? visit.scheduled_start_at : r.created_at,
  };
}

/** See `customers.ts#fetchCustomers` for the same real-vs-demo pattern. */
export async function fetchVisitReports(supabase: SupabaseClient): Promise<VisitReport[]> {
  if (isDemoMode()) return demoListVisitReports();
  const { data, error } = await supabase
    .from('visit_notes')
    .select(VISIT_REPORT_SELECT)
    .eq('visibility', 'care_team')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(parseVisitReport);
}

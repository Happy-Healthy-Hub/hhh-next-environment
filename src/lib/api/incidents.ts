/**
 * Incident API calls via FastAPI backend.
 */

import { apiFetch } from './client';

export interface ApiIncident {
  id: string;
  incident_number: string;
  category: string;
  severity: string;
  status: string;
  customer_id: string | null;
  care_associate_id: string | null;
  visit_id: string | null;
  care_request_id: string | null;
  description: string;
  occurred_at: string | null;
  created_at: string;
}

export const INCIDENT_STATUSES = [
  'open',
  'under_review',
  'escalated',
  'resolved',
  'closed',
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export async function apiListIncidents(status?: string): Promise<ApiIncident[]> {
  return apiFetch<ApiIncident[]>('/incidents', { params: { status } });
}

export async function apiUpdateIncidentStatus(
  id: string,
  status: IncidentStatus,
  resolutionNotes: string | null
): Promise<void> {
  await apiFetch(`/incidents/${id}/status`, {
    method: 'PATCH',
    body: { status, resolution_notes: resolutionNotes },
  });
}

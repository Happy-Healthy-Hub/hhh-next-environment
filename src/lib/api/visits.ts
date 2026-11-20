/**
 * Visit API calls via FastAPI backend.
 */

import { apiFetch } from './client';

export interface ApiVisit {
  id: string;
  care_assignment_id: string;
  status: string;
  scheduled_date: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  actual_check_in: string | null;
  actual_check_out: string | null;
  created_at: string;
}

export interface ApiVisitNote {
  id: string;
  visit_id: string;
  author_profile_id: string;
  note_type: string;
  body: string;
  created_at: string;
}

export async function apiListVisits(
  status?: string,
  customerId?: string
): Promise<ApiVisit[]> {
  return apiFetch<ApiVisit[]>('/visits', {
    params: { status, customer_id: customerId },
  });
}

export async function apiGetVisit(id: string): Promise<ApiVisit> {
  return apiFetch<ApiVisit>(`/visits/${id}`);
}

export async function apiScheduleVisit(data: {
  care_assignment_id: string;
  scheduled_date: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
}): Promise<{ visit_id: string }> {
  return apiFetch('/visits', { method: 'POST', body: data });
}

export async function apiCheckInVisit(id: string): Promise<void> {
  await apiFetch(`/visits/${id}/check-in`, { method: 'POST' });
}

export async function apiCheckOutVisit(id: string): Promise<void> {
  await apiFetch(`/visits/${id}/check-out`, { method: 'POST' });
}

export async function apiCompleteVisit(id: string): Promise<void> {
  await apiFetch(`/visits/${id}/complete`, { method: 'POST' });
}

export async function apiCancelVisit(id: string): Promise<void> {
  await apiFetch(`/visits/${id}/cancel`, { method: 'POST' });
}

export async function apiMarkVisitMissed(id: string): Promise<void> {
  await apiFetch(`/visits/${id}/mark-missed`, { method: 'POST' });
}

export async function apiListVisitNotes(visitId: string): Promise<ApiVisitNote[]> {
  return apiFetch<ApiVisitNote[]>(`/visits/${visitId}/notes`);
}

export async function apiAddVisitNote(
  visitId: string,
  noteType: string,
  body: string
): Promise<{ note_id: string }> {
  return apiFetch(`/visits/${visitId}/notes`, {
    method: 'POST',
    body: { note_type: noteType, body },
  });
}

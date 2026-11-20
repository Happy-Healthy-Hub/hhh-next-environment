/**
 * Assignment API calls via FastAPI backend.
 */

import { apiFetch } from './client';

export interface ApiAssignment {
  id: string;
  care_request_id: string;
  care_associate_id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  end_reason: string | null;
  created_at: string;
}

export async function apiListAssignments(
  status?: string,
  careRequestId?: string
): Promise<ApiAssignment[]> {
  return apiFetch<ApiAssignment[]>('/assignments', {
    params: { status, care_request_id: careRequestId },
  });
}

export async function apiGetAssignment(id: string): Promise<ApiAssignment> {
  return apiFetch<ApiAssignment>(`/assignments/${id}`);
}

export async function apiCreateAssignment(data: {
  care_request_id: string;
  care_associate_id: string;
  replacing_assignment_id?: string;
}): Promise<{ assignment_id: string }> {
  return apiFetch('/assignments', { method: 'POST', body: data });
}

export async function apiRespondToAssignment(
  id: string,
  response: 'accepted' | 'declined'
): Promise<void> {
  await apiFetch(`/assignments/${id}/respond`, {
    method: 'POST',
    body: { response },
  });
}

export async function apiEndAssignment(id: string, reason: string): Promise<void> {
  await apiFetch(`/assignments/${id}/end`, {
    method: 'POST',
    body: { reason },
  });
}

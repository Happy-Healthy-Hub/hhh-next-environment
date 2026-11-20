/**
 * Care request API calls via FastAPI backend.
 */

import { apiFetch } from './client';

export interface ApiCareRequest {
  id: string;
  customer_id: string;
  status: string;
  preferred_start_date: string;
  preferred_end_date: string | null;
  preferred_time_of_day: string | null;
  schedule_notes: string | null;
  customer_notes: string | null;
  decision_reason: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiCareRequestItem {
  service_id: string;
  quantity: number;
  notes: string | null;
}

export async function apiListCareRequests(
  status?: string,
  customerId?: string
): Promise<ApiCareRequest[]> {
  return apiFetch<ApiCareRequest[]>('/care-requests', {
    params: { status, customer_id: customerId },
  });
}

export async function apiGetCareRequest(id: string): Promise<ApiCareRequest> {
  return apiFetch<ApiCareRequest>(`/care-requests/${id}`);
}

export async function apiGetCareRequestItems(id: string): Promise<ApiCareRequestItem[]> {
  return apiFetch<ApiCareRequestItem[]>(`/care-requests/${id}/items`);
}

export async function apiStartReview(requestId: string): Promise<void> {
  await apiFetch(`/care-requests/${requestId}/start-review`, { method: 'POST' });
}

export async function apiDecideRequest(
  requestId: string,
  decision: 'approved' | 'rejected',
  reason: string | null
): Promise<void> {
  await apiFetch(`/care-requests/${requestId}/decide`, {
    method: 'POST',
    body: { decision, reason },
  });
}

export async function apiCancelRequest(requestId: string, reason: string | null): Promise<void> {
  await apiFetch(`/care-requests/${requestId}/cancel`, {
    method: 'POST',
    body: { reason },
  });
}

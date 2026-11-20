/**
 * Caregiver API calls via FastAPI backend.
 */

import { apiFetch } from './client';

export interface ApiCaregiver {
  id: string;
  profile_id: string;
  status: string;
  bio: string | null;
  created_at: string;
}

export interface ApiCaregiverDetail extends ApiCaregiver {
  display_name: string | null;
  email: string | null;
}

export async function apiListCaregivers(status?: string): Promise<ApiCaregiver[]> {
  return apiFetch<ApiCaregiver[]>('/caregivers', {
    params: { status },
  });
}

export async function apiGetCaregiver(id: string): Promise<ApiCaregiverDetail> {
  return apiFetch<ApiCaregiverDetail>(`/caregivers/${id}`);
}

export async function apiListEligibleCaregivers(): Promise<ApiCaregiver[]> {
  return apiFetch<ApiCaregiver[]>('/caregivers/eligible');
}

export async function apiSetCaregiverStatus(
  id: string,
  newStatus: string
): Promise<void> {
  await apiFetch(`/caregivers/${id}/status`, {
    method: 'PATCH',
    body: { new_status: newStatus },
  });
}

/**
 * Provider organisation administration APIs via FastAPI backend.
 * Only the admin paths are exposed here; the Provider Portal itself
 * is a separate frontend that would consume the `/providers/me`,
 * `/providers/organization`, `/providers/members`, `/providers/work`
 * endpoints.
 */

import { apiFetch } from './client';

export interface ApiProviderOrganization {
  id: string;
  legal_name: string;
  display_name: string;
  category: string;
  contact_email: string | null;
  contact_phone: string | null;
  city: string | null;
  state_region: string | null;
  country_code: string;
  verification_status: string;
  verified_at: string | null;
  created_at: string;
}

export const PROVIDER_CATEGORIES = [
  'clinic',
  'hospital',
  'diagnostic',
  'physiotherapy',
  'specialist',
  'other',
] as const;

export const PROVIDER_VERIFICATION_STATUSES = [
  'pending',
  'under_review',
  'verified',
  'rejected',
  'suspended',
] as const;
export type ProviderVerificationStatus =
  (typeof PROVIDER_VERIFICATION_STATUSES)[number];

export interface ApiProviderMembership {
  id: string;
  provider_organization_id: string;
  profile_id: string;
  org_role: string;
  status: string;
  invited_at: string | null;
  activated_at: string | null;
  created_at: string;
}

export async function apiListProviderOrganizations(): Promise<ApiProviderOrganization[]> {
  return apiFetch<ApiProviderOrganization[]>('/providers/admin/organizations');
}

export async function apiGetProviderOrganization(id: string): Promise<ApiProviderOrganization> {
  return apiFetch<ApiProviderOrganization>(`/providers/admin/organizations/${id}`);
}

export async function apiListProviderOrgMembers(id: string): Promise<ApiProviderMembership[]> {
  return apiFetch<ApiProviderMembership[]>(`/providers/admin/organizations/${id}/members`);
}

export async function apiCreateProviderOrganization(data: {
  legal_name: string;
  display_name: string;
  category: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  city?: string | null;
  state_region?: string | null;
}): Promise<{ id: string }> {
  return apiFetch<{ id: string }>('/providers/admin/organizations', {
    method: 'POST',
    body: data,
  });
}

export async function apiSetProviderVerification(
  orgId: string,
  verification_status: ProviderVerificationStatus,
  verification_notes: string | null
): Promise<void> {
  await apiFetch(`/providers/admin/organizations/${orgId}/verification`, {
    method: 'PATCH',
    body: { verification_status, verification_notes },
  });
}

export async function apiAddProviderMember(
  orgId: string,
  profile_id: string,
  org_role: 'provider_admin' | 'provider_professional'
): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(
    `/providers/admin/organizations/${orgId}/members`,
    {
      method: 'POST',
      body: { profile_id, org_role },
    }
  );
}

/**
 * Provider Portal API client — calls the provider-facing FastAPI endpoints
 * (/providers/me, /providers/organization, /providers/members, /providers/work).
 *
 * These are the endpoints a provider user calls for their own data, as opposed
 * to the admin endpoints in providers.ts which HHH staff use.
 */

import { apiFetch } from './client';

export interface ProviderMembership {
  id: string;
  provider_organization_id: string;
  profile_id: string;
  org_role: string;
  status: string;
  created_at: string;
}

export interface ProviderOrganization {
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

export interface ProviderAssignment {
  id: string;
  provider_organization_id: string;
  care_request_id: string | null;
  assigned_provider_user_id: string | null;
  assignment_type: string;
  status: string;
  notes: string | null;
  assigned_at: string;
  completed_at: string | null;
}

export async function apiGetMyMembership(): Promise<ProviderMembership> {
  return apiFetch<ProviderMembership>('/providers/me');
}

export async function apiGetMyOrganization(): Promise<ProviderOrganization> {
  return apiFetch<ProviderOrganization>('/providers/organization');
}

export async function apiListMyOrgMembers(): Promise<ProviderMembership[]> {
  return apiFetch<ProviderMembership[]>('/providers/members');
}

export async function apiListMyWork(): Promise<ProviderAssignment[]> {
  return apiFetch<ProviderAssignment[]>('/providers/work');
}

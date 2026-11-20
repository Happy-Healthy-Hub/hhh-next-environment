'use server';

import { revalidatePath } from 'next/cache';
import { apiSetProviderVerification, apiAddProviderMember } from '@/lib/api/providers';
import { ApiError } from '@/lib/api/client';
import type { ProviderVerificationStatus } from '@/lib/api/providers';

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function mapApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Your session has expired. Please sign in again.';
    if (err.status === 403) return 'Only administrators can change a provider verification status or membership.';
    if (err.status === 404) return 'That record could not be found.';
    if (err.status === 409) return 'That profile is already a member of this organisation.';
    if (err.status === 422) return err.detail || 'That value is not valid.';
    return err.detail || 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

export async function setProviderVerificationAction(
  orgId: string,
  status: ProviderVerificationStatus,
  notes: string | null
): Promise<ActionResult> {
  try {
    await apiSetProviderVerification(orgId, status, notes);
  } catch (err) {
    return { ok: false, message: mapApiError(err) };
  }
  revalidatePath(`/providers/${orgId}`);
  revalidatePath('/providers');
  return { ok: true };
}

export async function addProviderMemberAction(
  orgId: string,
  profileId: string,
  orgRole: 'provider_admin' | 'provider_professional'
): Promise<ActionResult> {
  try {
    await apiAddProviderMember(orgId, profileId, orgRole);
  } catch (err) {
    return { ok: false, message: mapApiError(err) };
  }
  revalidatePath(`/providers/${orgId}`);
  return { ok: true };
}

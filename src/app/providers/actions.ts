'use server';

import { revalidatePath } from 'next/cache';
import { apiSetProviderVerification, ApiError, type ProviderVerificationStatus } from '@/lib/api';

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function mapApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Your session has expired. Please sign in again.';
    if (err.status === 403) return 'Only administrators can change a provider verification status.';
    if (err.status === 404) return 'That provider organisation could not be found.';
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
  revalidatePath('/providers');
  return { ok: true };
}

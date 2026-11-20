'use server';

import { revalidatePath } from 'next/cache';
import { isDemoMode } from '@/lib/demo/config';
import { getDemoSessionProfileId } from '@/lib/demo/auth';
import { demoStartReview, demoDecideRequest } from '@/lib/demo/store';
import { apiStartReview, apiDecideRequest, ApiError } from '@/lib/api';

export interface ActionResult {
  ok: boolean;
  message?: string;
}

/**
 * Calls the trusted `start_care_request_review` function — never a direct
 * `update care_requests`. The function itself re-checks the caller is
 * care staff and that the request is still `submitted`; this action does
 * not duplicate that logic, only surfaces its result.
 */
export async function startReview(requestId: string): Promise<ActionResult> {
  if (isDemoMode()) {
    try {
      demoStartReview(requestId, (await getDemoSessionProfileId()) ?? '');
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong.' };
    }
    revalidatePath(`/requests/${requestId}`);
    revalidatePath('/requests');
    return { ok: true };
  }
  try {
    await apiStartReview(requestId);
  } catch (err) {
    return { ok: false, message: mapApiError(err) };
  }
  revalidatePath(`/requests/${requestId}`);
  revalidatePath('/requests');
  return { ok: true };
}

/**
 * Calls the trusted `decide_care_request` function. `decision` must be
 * exactly 'approved' or 'rejected' — the function itself rejects anything
 * else and rejects a request that isn't currently `under_review`.
 */
export async function decideRequest(
  requestId: string,
  decision: 'approved' | 'rejected',
  reason: string | null
): Promise<ActionResult> {
  if (isDemoMode()) {
    try {
      demoDecideRequest(requestId, decision, reason, (await getDemoSessionProfileId()) ?? '');
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong.' };
    }
    revalidatePath(`/requests/${requestId}`);
    revalidatePath('/requests');
    return { ok: true };
  }
  try {
    await apiDecideRequest(requestId, decision, reason);
  } catch (err) {
    return { ok: false, message: mapApiError(err) };
  }
  revalidatePath(`/requests/${requestId}`);
  revalidatePath('/requests');
  return { ok: true };
}

function mapApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      // The API client raises 401 when the stored Supabase session is
      // missing or could not be refreshed. Tell the user plainly so
      // they know to sign in again rather than seeing a cryptic
      // "Not Authenticated" that reads like a server bug.
      return 'Your session has expired. Please sign in again.';
    }
    if (err.status === 403) return "You don't have permission to do that.";
    if (err.status === 409) {
      return 'This request could not be found, or is no longer in the expected state. Reload to see its current status.';
    }
    if (err.status === 422) return err.detail || 'That decision is not valid.';
    return err.detail || 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

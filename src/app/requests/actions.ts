'use server';

import { revalidatePath } from 'next/cache';
import { isDemoMode } from '@/lib/demo/config';
import { getDemoSessionProfileId } from '@/lib/demo/auth';
import { demoStartReview, demoDecideRequest } from '@/lib/demo/store';
import { apiStartReview, apiDecideRequest, ApiError } from '@/lib/api';

export interface BulkResult {
  succeeded: string[];
  failed: { id: string; message: string }[];
}

function mapApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Your session has expired. Please sign in again.';
    if (err.status === 403) return "You don't have permission to do that.";
    if (err.status === 409) return 'No longer in the expected state.';
    if (err.status === 422) return err.detail || 'That decision is not valid.';
    return err.detail || 'Something went wrong.';
  }
  return 'Something went wrong.';
}

/**
 * Bulk actions on the request list loop the same trusted RPCs the
 * single-request detail page already uses
 * (start_care_request_review/decide_care_request) -- there is no bulk
 * RPC, and this task's own rules say not to invent one or bypass the
 * per-row business-rule checks those functions already enforce (a
 * request not currently `submitted` simply fails with its real error,
 * reported per-id, never silently skipped or reported as success).
 *
 * Both bulk actions now go through the FastAPI backend (not Supabase
 * direct) so business logic, authorisation and audit remain centralised
 * on the server, consistent with the single-request detail page.
 */
export async function bulkStartReview(requestIds: string[]): Promise<BulkResult> {
  const result: BulkResult = { succeeded: [], failed: [] };
  if (isDemoMode()) {
    const actorId = (await getDemoSessionProfileId()) ?? '';
    for (const id of requestIds) {
      try {
        demoStartReview(id, actorId);
        result.succeeded.push(id);
      } catch (err) {
        result.failed.push({ id, message: err instanceof Error ? err.message : 'Something went wrong.' });
      }
    }
    revalidatePath('/requests');
    return result;
  }
  for (const id of requestIds) {
    try {
      await apiStartReview(id);
      result.succeeded.push(id);
    } catch (err) {
      result.failed.push({ id, message: mapApiError(err) });
    }
  }
  revalidatePath('/requests');
  return result;
}

export async function bulkDecide(
  requestIds: string[],
  decision: 'approved' | 'rejected',
  reason: string | null
): Promise<BulkResult> {
  const result: BulkResult = { succeeded: [], failed: [] };
  if (isDemoMode()) {
    const actorId = (await getDemoSessionProfileId()) ?? '';
    for (const id of requestIds) {
      try {
        demoDecideRequest(id, decision, reason, actorId);
        result.succeeded.push(id);
      } catch (err) {
        result.failed.push({ id, message: err instanceof Error ? err.message : 'Something went wrong.' });
      }
    }
    revalidatePath('/requests');
    return result;
  }
  for (const id of requestIds) {
    try {
      await apiDecideRequest(id, decision, reason);
      result.succeeded.push(id);
    } catch (err) {
      result.failed.push({ id, message: mapApiError(err) });
    }
  }
  revalidatePath('/requests');
  return result;
}

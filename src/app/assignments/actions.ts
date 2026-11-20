'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/demo/config';
import { getDemoSessionProfileId } from '@/lib/demo/auth';
import { demoAssignCaregiver, demoEndAssignment } from '@/lib/demo/store';
import type { ActionResult } from '../requests/[id]/actions';

/** Calls the trusted `assign_care_associate` function (or, in Local Demo
 * Mode, the local demo store). `replacesAssignmentId` is only sent when
 * reassigning an already-assigned request. */
export async function assignCaregiverAction(
  careRequestId: string,
  careAssociateId: string,
  replacesAssignmentId: string | null
): Promise<ActionResult> {
  if (isDemoMode()) {
    try {
      demoAssignCaregiver(careRequestId, careAssociateId, replacesAssignmentId, (await getDemoSessionProfileId()) ?? '');
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong.' };
    }
    revalidatePath('/assignments');
    revalidatePath(`/assignments/${careRequestId}`);
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('assign_care_associate', {
    p_care_request_id: careRequestId,
    p_care_associate_id: careAssociateId,
    p_replaces_assignment_id: replacesAssignmentId,
  });
  if (error) return { ok: false, message: mapError(error.code) };
  revalidatePath('/assignments');
  revalidatePath(`/assignments/${careRequestId}`);
  return { ok: true };
}

/** Calls the trusted `end_care_assignment` function to withdraw an open
 * assignment with no replacement. Reassigning uses `assignCaregiverAction`
 * with `replacesAssignmentId` instead -- `assign_care_associate` itself
 * marks the old assignment `replaced` and moves its scheduled visits, so
 * this function is never called for a reassignment. */
export async function endAssignmentAction(
  assignmentId: string,
  outcome: 'completed' | 'cancelled',
  reason: string
): Promise<ActionResult> {
  if (isDemoMode()) {
    try {
      demoEndAssignment(assignmentId, outcome, reason, (await getDemoSessionProfileId()) ?? '');
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong.' };
    }
    revalidatePath('/assignments');
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('end_care_assignment', {
    p_assignment_id: assignmentId,
    p_outcome: outcome,
    p_reason: reason,
  });
  if (error) return { ok: false, message: mapError(error.code) };
  revalidatePath('/assignments');
  return { ok: true };
}

function mapError(code: string | undefined): string {
  switch (code) {
    case '42501':
      return "You don't have permission to do that.";
    case 'P0002':
      return 'This request or caregiver could not be found.';
    case '55000':
      return 'This could not be completed -- it may no longer be in the expected state. Reload to see the current status.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

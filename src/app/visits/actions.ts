'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/demo/config';
import { getDemoSessionProfileId } from '@/lib/demo/auth';
import { demoCreateVisit, demoCancelVisit } from '@/lib/demo/store';
import type { ActionResult } from '../requests/[id]/actions';

/** Calls the trusted `schedule_visit` function for an open assignment (or,
 * in Local Demo Mode, the local demo store). */
export async function createVisitAction(
  careAssignmentId: string,
  scheduledStartAt: string,
  scheduledEndAt: string
): Promise<ActionResult> {
  if (isDemoMode()) {
    try {
      demoCreateVisit(careAssignmentId, scheduledStartAt, scheduledEndAt, (await getDemoSessionProfileId()) ?? '');
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong.' };
    }
    revalidatePath('/visits');
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('schedule_visit', {
    p_assignment_id: careAssignmentId,
    p_scheduled_start_at: scheduledStartAt,
    p_scheduled_end_at: scheduledEndAt,
  });
  if (error) return { ok: false, message: mapError(error.code) };
  revalidatePath('/visits');
  return { ok: true };
}

/** Calls the trusted `cancel_visit` function (or, in Local Demo Mode, the
 * local demo store). Mirrors its own guard: only a `scheduled`/
 * `in_progress` visit can be cancelled. */
export async function cancelVisitAction(visitId: string, reason: string): Promise<ActionResult> {
  if (isDemoMode()) {
    try {
      demoCancelVisit(visitId, reason, (await getDemoSessionProfileId()) ?? '');
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong.' };
    }
    revalidatePath('/visits');
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('cancel_visit', {
    p_visit_id: visitId,
    p_reason: reason,
  });
  if (error) return { ok: false, message: mapError(error.code) };
  revalidatePath('/visits');
  return { ok: true };
}

function mapError(code: string | undefined): string {
  switch (code) {
    case '42501':
      return "You don't have permission to do that.";
    case '55000':
      return 'This could not be completed -- the visit or assignment may no longer be in the expected state. Reload to see the current status.';
    case '23514':
      return 'The end time must be after the start time.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

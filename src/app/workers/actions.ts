'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/demo/config';
import { getDemoSessionProfileId } from '@/lib/demo/auth';
import { demoCreateCaregiver, demoSetCaregiverStatus } from '@/lib/demo/store';
import type { ActionResult } from '../requests/[id]/actions';

/** Calls the trusted `create_care_associate` function (or, in Local Demo
 * Mode, the local demo store). Requires the profile id of a person who
 * has already signed in at least once (so `public.profiles` has a row
 * for them) -- there is no email-based lookup available to this portal;
 * see OPERATIONS_API_REQUIREMENTS.md. */
export async function createCaregiverAction(
  profileId: string,
  publicDisplayName: string
): Promise<ActionResult> {
  if (isDemoMode()) {
    try {
      demoCreateCaregiver(profileId, publicDisplayName, (await getDemoSessionProfileId()) ?? '');
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong.' };
    }
    revalidatePath('/workers');
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_care_associate', {
    p_profile_id: profileId,
    p_public_display_name: publicDisplayName,
  });
  if (error) return { ok: false, message: mapError(error.code) };
  revalidatePath('/workers');
  return { ok: true };
}

/** Calls the trusted `set_care_associate_status` function (or, in Local
 * Demo Mode, the local demo store). */
export async function setCaregiverStatusAction(
  caregiverId: string,
  status: 'active' | 'inactive' | 'suspended'
): Promise<ActionResult> {
  if (isDemoMode()) {
    try {
      demoSetCaregiverStatus(caregiverId, status, (await getDemoSessionProfileId()) ?? '');
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong.' };
    }
    revalidatePath('/workers');
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_care_associate_status', {
    p_care_associate_id: caregiverId,
    p_status: status,
  });
  if (error) return { ok: false, message: mapError(error.code) };
  revalidatePath('/workers');
  return { ok: true };
}

function mapError(code: string | undefined): string {
  switch (code) {
    case '42501':
      return "You don't have permission to do that.";
    case 'P0002':
      return 'No active account was found for that profile id. The person must sign in to the app at least once before they can be added here.';
    case '22023':
      return 'Check the values entered -- something is not valid.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

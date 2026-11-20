'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api/client';
import { isDemoMode } from '@/lib/demo/config';
import { getDemoSessionProfileId } from '@/lib/demo/auth';
import { demoSetDisplayName } from '@/lib/demo/store';
import type { ActionResult } from '../requests/[id]/actions';

export async function updateMyDisplayNameAction(displayName: string): Promise<ActionResult> {
  const trimmed = displayName.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    return { ok: false, message: 'Display name must be 1 to 100 characters.' };
  }
  if (isDemoMode()) {
    const profileId = await getDemoSessionProfileId();
    if (!profileId) return { ok: false, message: 'Your demo session has expired. Please sign in again.' };
    try {
      demoSetDisplayName(profileId, trimmed);
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong.' };
    }
    revalidatePath('/settings');
    return { ok: true };
  }
  try {
    await apiFetch('/profiles/me', { method: 'PATCH', body: { display_name: trimmed } });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { ok: false, message: 'Your session has expired. Please sign in again.' };
    }
    return { ok: false, message: 'Something went wrong. Please try again.' };
  }
  revalidatePath('/settings');
  return { ok: true };
}

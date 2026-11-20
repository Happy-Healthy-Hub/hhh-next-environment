'use server';

import { revalidatePath } from 'next/cache';
import { isDemoMode } from '@/lib/demo/config';
import { getDemoSessionProfileId } from '@/lib/demo/auth';
import { demoGrantRole, demoRevokeRole, demoSetAccountStatus } from '@/lib/demo/store';
import { apiGrantRole, apiRevokeRole, apiSetStaffStatus, apiInviteStaff, ApiError } from '@/lib/api';
import type { StaffRoleKey } from '@/lib/staff';
import type { ActionResult } from '../requests/[id]/actions';

/**
 * Calls the trusted `grant_user_role` function (or, in Local Demo Mode,
 * the local demo store). The function itself re-checks the caller is an
 * administrator; this action does not duplicate that logic.
 */
export async function grantRoleAction(profileId: string, roleKey: string): Promise<ActionResult> {
  if (isDemoMode()) {
    try {
      demoGrantRole(profileId, roleKey, (await getDemoSessionProfileId()) ?? '');
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong.' };
    }
    revalidatePath('/staff');
    return { ok: true };
  }
  try {
    await apiGrantRole(profileId, roleKey as StaffRoleKey);
  } catch (err) {
    return { ok: false, message: mapApiError(err) };
  }
  revalidatePath('/staff');
  return { ok: true };
}

/**
 * Calls the trusted `revoke_user_role` function via FastAPI, which itself
 * refuses an administrator revoking their own administrator role -- the UI
 * also disables this control for the signed-in account's own row, but the
 * server check is the real boundary.
 */
export async function revokeRoleAction(profileId: string, roleKey: string): Promise<ActionResult> {
  if (isDemoMode()) {
    try {
      demoRevokeRole(profileId, roleKey, (await getDemoSessionProfileId()) ?? '');
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong.' };
    }
    revalidatePath('/staff');
    return { ok: true };
  }
  try {
    await apiRevokeRole(profileId, roleKey as StaffRoleKey);
  } catch (err) {
    return { ok: false, message: mapApiError(err) };
  }
  revalidatePath('/staff');
  return { ok: true };
}

/**
 * Calls the trusted `set_profile_account_status` function via FastAPI,
 * which itself refuses an administrator changing their own account status.
 */
export async function setAccountStatusAction(
  profileId: string,
  status: 'active' | 'deactivated'
): Promise<ActionResult> {
  if (isDemoMode()) {
    try {
      demoSetAccountStatus(profileId, status, (await getDemoSessionProfileId()) ?? '');
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong.' };
    }
    revalidatePath('/staff');
    return { ok: true };
  }
  try {
    await apiSetStaffStatus(profileId, status);
  } catch (err) {
    return { ok: false, message: mapApiError(err) };
  }
  revalidatePath('/staff');
  return { ok: true };
}

/**
 * Invites a new staff member via FastAPI's admin API (service-role key).
 */
export async function inviteStaffAction(
  email: string,
  roles: StaffRoleKey[]
): Promise<ActionResult> {
  try {
    await apiInviteStaff(email, roles);
  } catch (err) {
    return { ok: false, message: mapApiError(err) };
  }
  revalidatePath('/staff');
  return { ok: true };
}

function mapApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (err.status === 403) {
      return "You don't have permission to do that, or this is your own account -- an administrator cannot change their own role or access from here.";
    }
    if (err.status === 404) return 'This staff account could not be found.';
    return err.detail || 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

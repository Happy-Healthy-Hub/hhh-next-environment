import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isDemoMode } from './demo/config';
import { getDemoSessionProfileId } from './demo/auth';
import { demoListStaff } from './demo/store';
import { readPhoneSessionCookie } from './phoneAuth/session';

/**
 * The staff roles `private.is_care_staff()` recognises
 * (supabase/migrations/001_initial_core_mvp_schema.sql). Kept here only
 * for display/labelling — the actual authorisation decision belongs to
 * the database (RLS and the trusted functions), never to this list alone.
 * A user without one of these roles can still "pass" this check if the
 * database itself decides otherwise; this is a UX convenience, not the
 * security boundary.
 */
const CARE_STAFF_ROLES = ['care_coordinator', 'operations_manager', 'administrator'] as const;

export interface StaffSession {
  userId: string;
  email: string | null;
  roles: string[];
  isCareStaff: boolean;
  isAdministrator: boolean;
  /** True only for a Local Demo Mode session (see `demo/README.md`) --
   * never true for a real Supabase session, and `isDemoMode()` itself
   * can never be true in a production build. Pages use this only to
   * show demo-only UI (a banner, the Reset Demo Data control), never to
   * change what a role may do -- that is still decided by the real RLS/
   * trusted functions for a real session, or by `demo/store.ts`'s own
   * mirrored checks for a demo one. */
  isDemo: boolean;
}

/**
 * Loads the signed-in staff session. In Local Demo Mode (`isDemoMode()`,
 * itself impossible in a production build) this reads the local demo
 * cookie and the in-memory demo staff list instead of Supabase -- the
 * `supabase` parameter is then unused, kept only so every call site
 * doesn't need an `if (isDemoMode())` of its own. Otherwise, checks for
 * a FastAPI-owned phone session first (2026-11-18 migration --
 * `src/lib/phoneAuth/session.ts`; its `roles` are trusted backend data
 * because only this server's own code ever writes that cookie, from a
 * FastAPI response, never from anything a client could set), then
 * falls back to loading the signed-in user's roles from
 * `public.user_roles` (readable for the user's own id under
 * `user_roles_select` RLS) for a Supabase (dev/demo email+password)
 * session. Returns `null` if nobody is signed in by any of these.
 */
export async function loadStaffSession(
  supabase: SupabaseClient
): Promise<StaffSession | null> {
  if (isDemoMode()) {
    const profileId = await getDemoSessionProfileId();
    if (!profileId) return null;
    const staff = demoListStaff(profileId).find((s) => s.profileId === profileId);
    if (!staff || staff.accountStatus !== 'active') return null;
    return {
      userId: staff.profileId,
      email: null,
      roles: staff.roles,
      isCareStaff: staff.roles.some((role) => (CARE_STAFF_ROLES as readonly string[]).includes(role)),
      isAdministrator: staff.roles.includes('administrator'),
      isDemo: true,
    };
  }

  const phoneSession = readPhoneSessionCookie(await cookies());
  if (phoneSession) {
    return {
      userId: phoneSession.profileId,
      email: null,
      roles: phoneSession.roles,
      isCareStaff: phoneSession.roles.some((role) =>
        (CARE_STAFF_ROLES as readonly string[]).includes(role)
      ),
      isAdministrator: phoneSession.roles.includes('administrator'),
      isDemo: false,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_roles')
    .select('role_key')
    .eq('user_id', user.id);

  if (error) {
    // Fail closed: if roles can't be read, treat the user as not staff
    // rather than guessing. The page the caller renders decides what to
    // show (e.g. a retry option), never silent access.
    throw error;
  }

  const roles = (data ?? []).map((row) => row.role_key as string);
  return {
    userId: user.id,
    email: user.email ?? null,
    roles,
    isCareStaff: roles.some((role) => (CARE_STAFF_ROLES as readonly string[]).includes(role)),
    isAdministrator: roles.includes('administrator'),
    isDemo: false,
  };
}

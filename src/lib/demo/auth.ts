/**
 * Local Demo Mode authentication. This never touches Supabase Auth and
 * never creates any Supabase account -- it is a plain, signed-nowhere,
 * httpOnly cookie read/written only by this portal's own server code,
 * active only when `isDemoMode()` is true (which itself requires a
 * non-production build). See demo/README.md.
 */
import { cookies } from 'next/headers';
import { demoListStaff } from './store';

export const DEMO_SESSION_COOKIE = 'hhh_demo_staff_id';

export interface DemoRoleOption {
  profileId: string;
  displayName: string;
  roleLabel: string;
}

/** The staff accounts a demo visitor may "sign in" as -- every active
 * demo staff record, so both Administrator-only and Coordinator-visible
 * screens can be demonstrated. */
export function demoRoleOptions(): DemoRoleOption[] {
  // currentUserId '' so nobody is flagged `isSelf` here -- this list is
  // for choosing who to sign in as, not a signed-in staff table.
  return demoListStaff('')
    .filter((s) => s.accountStatus === 'active')
    .map((s) => ({
      profileId: s.profileId,
      displayName: s.displayName ?? 'Demo staff',
      roleLabel: s.roles.includes('administrator') ? 'Administrator' : 'Coordinator',
    }));
}

export async function setDemoSession(profileId: string): Promise<void> {
  const store = await cookies();
  store.set(DEMO_SESSION_COOKIE, profileId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // Session cookie -- cleared when the browser closes, same spirit as
    // a real Supabase session being short-lived in a demo context.
  });
}

export async function clearDemoSession(): Promise<void> {
  const store = await cookies();
  store.delete(DEMO_SESSION_COOKIE);
}

export async function getDemoSessionProfileId(): Promise<string | null> {
  const store = await cookies();
  return store.get(DEMO_SESSION_COOKIE)?.value ?? null;
}

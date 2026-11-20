'use server';

import { redirect } from 'next/navigation';
import { isDemoMode } from '@/lib/demo/config';
import { setDemoSession } from '@/lib/demo/auth';

/**
 * Local Demo Mode "sign in" -- sets a local, httpOnly cookie naming which
 * demo staff record to act as. Never touches Supabase Auth, never reads
 * or writes any real table. Refuses outright unless `isDemoMode()` is
 * true, which itself can never be true in a production build -- so this
 * action is dead code in production even if somehow still bundled.
 */
export async function demoSignInAction(profileId: string): Promise<void> {
  if (!isDemoMode()) {
    throw new Error('Local Demo Mode is not enabled.');
  }
  await setDemoSession(profileId);
  redirect('/dashboard');
}

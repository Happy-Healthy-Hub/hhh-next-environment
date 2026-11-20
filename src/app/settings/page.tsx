import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { apiFetch } from '@/lib/api/client';
import { AdminShell } from '../components/AdminShell';
import { HhhHelplineNotice } from '../components/HhhHelplineNotice';
import { InfoNotice } from '../components/InfoNotice';
import { MyProfileForm } from '../components/MyProfileForm';
import { isDemoMode } from '@/lib/demo/config';
import { demoGetDisplayName } from '@/lib/demo/store';

export const instant = false;

/**
 * Settings (AD86-91). Only "My profile" (display name) is real -- it is
 * the only setting backed by a column this portal is allowed to write
 * (`profiles.display_name`, under `profiles_update_own` RLS).
 * Organisation, Service configuration and Notifications have no
 * `settings`/`organisation` table in the schema at all, so they are
 * shown as honest "not available yet" notices rather than a form that
 * silently does nothing. Security (password) reuses the existing
 * "Forgot password" flow.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let displayName = '';
  if (isDemoMode()) {
    displayName = demoGetDisplayName(session.userId);
  } else {
    try {
      const data = await apiFetch<{ profile: { display_name: string | null } }>('/profiles/me');
      displayName = data.profile?.display_name ?? '';
    } catch (err) {
      console.error('Failed to load settings:', err);
      displayName = '';
    }
  }

  return (
    <AdminShell title="Settings" userEmail={session.email} isDemo={session.isDemo}>
      <div className="hhh-fade-in">
        <h2 style={{ fontSize: '1.1rem' }}>My profile</h2>
        <MyProfileForm initialDisplayName={displayName} email={session.email} />

        <h2 style={{ fontSize: '1.1rem', marginTop: 'var(--hhh-space-xxl)' }}>Security</h2>
        <InfoNotice
          title="Change your password"
          message='Use "Forgot password?" on the sign-in screen to change your password -- there is no separate change-password form here yet.'
        />

        <h2 style={{ fontSize: '1.1rem', marginTop: 'var(--hhh-space-xxl)' }}>Organisation</h2>
        <HhhHelplineNotice />
        <div style={{ marginTop: 'var(--hhh-space-md)' }}>
          <InfoNotice
            title="Not available yet"
            message="Organisation name, store links and other contact details are not stored in the database and cannot be edited from this portal. Who may edit them is also an open decision in the approved design."
          />
        </div>

        <h2 style={{ fontSize: '1.1rem', marginTop: 'var(--hhh-space-xxl)' }}>Service configuration</h2>
        <InfoNotice
          title="Not available yet"
          message="Whether service configuration is in portal scope, and who may change it, is an open decision in the approved design. The service catalogue is unchanged from the Flutter app's own catalogue."
        />

        <h2 style={{ fontSize: '1.1rem', marginTop: 'var(--hhh-space-xxl)' }}>Notification preferences</h2>
        <InfoNotice
          title="Not available yet"
          message="Notification delivery is active but per-user preference controls (mute channels, digest frequency) are not implemented yet."
        />
      </div>
    </AdminShell>
  );
}

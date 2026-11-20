import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { apiListStaff } from '@/lib/api/staff';
import { isStaffRoleKey, type StaffMember } from '@/lib/staff';
import { AdminShell } from '../components/AdminShell';
import { ErrorState } from '../components/ErrorState';
import { StaffTable } from '../components/StaffTable';

export const instant = false;

export default async function StaffPage() {
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isAdministrator) redirect('/not-authorized');

  let staff: StaffMember[];
  try {
    const apiStaff = await apiListStaff();
    staff = apiStaff.map((s) => ({
      profileId: s.profile_id,
      displayName: s.display_name,
      email: s.email,
      accountStatus: s.account_status === 'active' ? 'active' as const : 'deactivated' as const,
      roles: s.roles.filter(isStaffRoleKey),
      isSelf: s.profile_id === session.userId,
    }));
  } catch (err) {
    console.error('Failed to load staff:', err);
    return (
      <AdminShell title="Staff & Access" userEmail={session.email} isDemo={session.isDemo}>
        <ErrorState message="Something went wrong loading staff accounts. Please try reloading the page." />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Staff & Access" userEmail={session.email} isDemo={session.isDemo}>
      <div className="hhh-fade-in">
        <p style={{ color: 'var(--hhh-secondary-text)', marginTop: 0 }}>
          Only Administrator and Coordinator are approved roles today (Operations manager exists in the
          schema but has no approved portal screen yet).
        </p>
        <StaffTable staff={staff} />
      </div>
    </AdminShell>
  );
}

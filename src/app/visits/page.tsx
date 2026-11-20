import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { fetchVisits } from '@/lib/visits';
import { fetchAssignments, isOpenAssignment } from '@/lib/assignments';
import { AdminShell } from '../components/AdminShell';
import { ErrorState } from '../components/ErrorState';
import { VisitsPanel } from '../components/VisitsPanel';

export const instant = false;

/**
 * Visits & Schedule (AD58-66), wired to the real backend: `public.visits`
 * (staff see every visit, per `visits_select`'s `is_care_staff()` branch)
 * and the trusted `schedule_visit` / `cancel_visit` functions. No week/day
 * calendar grid yet (AD58/59) -- a flat, sortable list only; no
 * reschedule (no RPC exists for it) and no conflict checking (none
 * exists either) -- both are explicitly "to be confirmed" in the
 * approved design itself, not overlooked.
 */
export default async function VisitsPage() {
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let visits, allAssignments;
  try {
    [visits, allAssignments] = await Promise.all([fetchVisits(supabase), fetchAssignments(supabase)]);
  } catch (err) {
    console.error('Failed to load visits:', err);
    return (
      <AdminShell title="Visits & Scheduling" userEmail={session.email} isDemo={session.isDemo}>
        <ErrorState message="Something went wrong loading visits. Please try reloading the page." />
      </AdminShell>
    );
  }
  const openAssignments = allAssignments.filter((a) => isOpenAssignment(a.status));

  return (
    <AdminShell title="Visits & Scheduling" userEmail={session.email} isDemo={session.isDemo}>
      <VisitsPanel visits={visits} openAssignments={openAssignments} />
    </AdminShell>
  );
}

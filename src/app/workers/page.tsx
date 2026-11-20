import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { AdminShell } from '../components/AdminShell';
import { ErrorState } from '../components/ErrorState';
import { CaregiversPanel } from '../components/CaregiversPanel';
import { fetchCaregivers } from '@/lib/caregivers';

export const instant = false;

/**
 * Caregivers / Workers (AD27-40), wired to the real backend
 * (`public.care_associates`). List and status change only -- document
 * review, qualifications, verification and the "compare caregivers"
 * screens are not built (no document/qualification columns exist on
 * `care_associates`; see docs/CARE_ASSOCIATE_APP.md from the caregiver
 * app's own audit for the same finding). Adding a caregiver requires a
 * profile id, since there is no portal lookup by email -- see
 * `workers/actions.ts`.
 */
export default async function WorkersPage() {
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let caregivers;
  try {
    caregivers = await fetchCaregivers(supabase);
  } catch (err) {
    console.error('Failed to load caregivers:', err);
    return (
      <AdminShell title="Caregivers" userEmail={session.email} isDemo={session.isDemo}>
        <ErrorState message="Something went wrong loading caregivers. Please try reloading the page." />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Caregivers" userEmail={session.email} isDemo={session.isDemo}>
      <CaregiversPanel caregivers={caregivers} />
    </AdminShell>
  );
}

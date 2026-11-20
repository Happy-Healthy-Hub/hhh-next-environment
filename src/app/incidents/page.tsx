import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { apiListIncidents } from '@/lib/api/incidents';
import { ApiError } from '@/lib/api/client';
import { AdminShell } from '../components/AdminShell';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { IncidentsPanel } from './IncidentsPanel';

export const instant = false;

/**
 * Incidents (safety, medical, behavioural, etc.) list. Reads via the
 * FastAPI `/incidents` endpoint, which RLS-filters to the caller:
 * staff see every incident, reporters see their own, affected
 * customers see incidents that concern them.
 */
export default async function IncidentsPage() {
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let incidents;
  try {
    incidents = await apiListIncidents();
  } catch (err) {
    const message =
      err instanceof ApiError && err.status === 401
        ? 'Your session has expired. Please sign in again.'
        : 'Something went wrong loading incidents. Please try reloading the page.';
    return (
      <AdminShell title="Incidents" userEmail={session.email} isDemo={session.isDemo}>
        <ErrorState message={message} />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Incidents" userEmail={session.email} isDemo={session.isDemo}>
      {incidents.length === 0 ? (
        <EmptyState
          title="No incidents reported"
          message="Incidents raised by caregivers, customers or staff appear here with their current status."
        />
      ) : (
        <IncidentsPanel incidents={incidents} />
      )}
    </AdminShell>
  );
}

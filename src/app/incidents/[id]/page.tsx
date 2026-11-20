import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { apiListIncidents } from '@/lib/api/incidents';
import { ApiError } from '@/lib/api/client';
import { AdminShell } from '../../components/AdminShell';
import { ErrorState } from '../../components/ErrorState';
import { IncidentDetailPanel } from './IncidentDetailPanel';

export const instant = false;

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let incident;
  try {
    // No dedicated "get incident" endpoint yet; list and find. The
    // staff view returns everything RLS allows, so this is one query,
    // not N; listing + filtering keeps parity with how the Visits
    // detail page in this portal does it.
    const incidents = await apiListIncidents();
    incident = incidents.find((i) => i.id === id);
  } catch (err) {
    const message =
      err instanceof ApiError && err.status === 401
        ? 'Your session has expired. Please sign in again.'
        : 'Something went wrong loading this incident.';
    return (
      <AdminShell title="Incident" userEmail={session.email} isDemo={session.isDemo}>
        <ErrorState message={message} />
      </AdminShell>
    );
  }

  if (!incident) {
    return (
      <AdminShell title="Incident" userEmail={session.email} isDemo={session.isDemo}>
        <div style={{ marginBottom: 'var(--hhh-space-md)' }}>
          <Link href="/incidents" style={{ color: 'var(--hhh-dark-teal)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Back to incidents
          </Link>
        </div>
        <div className="hhh-empty-state">This incident could not be found.</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Incident" userEmail={session.email} isDemo={session.isDemo}>
      <div style={{ marginBottom: 'var(--hhh-space-md)' }}>
        <Link href="/incidents" style={{ color: 'var(--hhh-dark-teal)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to incidents
        </Link>
      </div>
      <IncidentDetailPanel incident={incident} />
    </AdminShell>
  );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { apiGetProviderOrganization, apiListProviderOrgMembers } from '@/lib/api/providers';
import { ApiError } from '@/lib/api/client';
import { AdminShell } from '../../components/AdminShell';
import { ErrorState } from '../../components/ErrorState';
import { ProviderDetailPanel } from './ProviderDetailPanel';

export const instant = false;

export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let org;
  let members;
  try {
    [org, members] = await Promise.all([
      apiGetProviderOrganization(id),
      apiListProviderOrgMembers(id),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return (
        <AdminShell title="Provider" userEmail={session.email} isDemo={session.isDemo}>
          <div style={{ marginBottom: 'var(--hhh-space-md)' }}>
            <Link href="/providers" style={{ color: 'var(--hhh-dark-teal)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
              ← Back to providers
            </Link>
          </div>
          <div className="hhh-empty-state">This provider organisation could not be found.</div>
        </AdminShell>
      );
    }
    const message =
      err instanceof ApiError && err.status === 401
        ? 'Your session has expired. Please sign in again.'
        : 'Something went wrong loading this provider organisation.';
    return (
      <AdminShell title="Provider" userEmail={session.email} isDemo={session.isDemo}>
        <ErrorState message={message} />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Provider" userEmail={session.email} isDemo={session.isDemo}>
      <div style={{ marginBottom: 'var(--hhh-space-md)' }}>
        <Link href="/providers" style={{ color: 'var(--hhh-dark-teal)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to providers
        </Link>
      </div>
      <ProviderDetailPanel
        organization={org}
        members={members}
        isAdministrator={session.isAdministrator}
      />
    </AdminShell>
  );
}

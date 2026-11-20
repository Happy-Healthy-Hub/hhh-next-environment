import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { apiListProviderOrganizations } from '@/lib/api/providers';
import { ApiError } from '@/lib/api/client';
import { AdminShell } from '../components/AdminShell';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { ProvidersPanel } from './ProvidersPanel';

export const instant = false;

/**
 * Provider organisations (third-party clinics, hospitals,
 * physiotherapists, specialists) managed by HHH staff. Reads via
 * FastAPI `/providers/admin/organizations`; administrator-only
 * verification lifecycle transitions.
 */
export default async function ProvidersPage() {
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let orgs;
  try {
    orgs = await apiListProviderOrganizations();
  } catch (err) {
    const message =
      err instanceof ApiError && err.status === 401
        ? 'Your session has expired. Please sign in again.'
        : 'Something went wrong loading provider organisations. Please try reloading the page.';
    return (
      <AdminShell title="Providers" userEmail={session.email} isDemo={session.isDemo}>
        <ErrorState message={message} />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Providers" userEmail={session.email} isDemo={session.isDemo}>
      {orgs.length === 0 ? (
        <EmptyState
          title="No provider organisations yet"
          message="Third-party care providers (clinics, hospitals, specialists, physiotherapists, diagnostics) will appear here once registered."
        />
      ) : (
        <ProvidersPanel organizations={orgs} isAdministrator={session.isAdministrator} />
      )}
    </AdminShell>
  );
}

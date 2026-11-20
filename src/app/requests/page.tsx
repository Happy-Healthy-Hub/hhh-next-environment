import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { STATUS_BADGE_CLASS, STATUS_LABELS, fetchCareRequests, type CareRequest } from '@/lib/care-requests';
import { AdminShell } from '../components/AdminShell';
import { RequestsBulkSection } from './RequestsBulkSection';

export const instant = false;

/**
 * Incoming care requests, visible to any authenticated care-staff account
 * (care coordinator, operations manager or administrator) per the live
 * `care_requests_select` RLS policy — `private.is_care_staff()` grants
 * every staff account the same visibility; the schema has no per-staff
 * caseload restriction, so this page does not invent one either. See
 * docs/OPERATIONS_PORTAL.md "Access scope" for the exact rule as read
 * from the migration.
 */
export default async function RequestsPage() {
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let requests: CareRequest[];
  try {
    requests = await fetchCareRequests(supabase);
  } catch (err) {
    console.error('Failed to load requests:', err);
    return (
      <AdminShell title="Care requests" userEmail={session.email} isDemo={session.isDemo}>
        <div role="alert" className="hhh-inline-alert">
          Something went wrong loading requests. Please try reloading the page.
        </div>
      </AdminShell>
    );
  }
  // Submitted and under-review requests need attention first; everything
  // else follows by most-recently-created.
  const actionable = requests.filter((r) => r.status === 'submitted' || r.status === 'under_review');
  const rest = requests.filter((r) => r.status !== 'submitted' && r.status !== 'under_review');

  return (
    <AdminShell title="Care requests" userEmail={session.email} isDemo={session.isDemo}>
      {requests.length === 0 ? (
        <div className="hhh-empty-state">No care requests yet.</div>
      ) : (
        <>
          {actionable.length > 0 && (
            <section style={{ marginBottom: 'var(--hhh-space-xl)' }}>
              <h2 style={{ fontSize: '1.1rem' }}>Needs attention</h2>
              <RequestsBulkSection requests={actionable} />
            </section>
          )}
          {rest.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1.1rem' }}>Other requests</h2>
              <RequestList requests={rest} />
            </section>
          )}
        </>
      )}
    </AdminShell>
  );
}

function RequestList({ requests }: { requests: CareRequest[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--hhh-space-sm)' }}>
      {requests.map((request) => (
        <li key={request.id}>
          <Link
            href={`/requests/${request.id}`}
            className="hhh-card"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 'var(--hhh-space-md)',
              textDecoration: 'none',
              color: 'inherit',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>
                {request.customer.preferredName ?? request.customer.fullName}
              </div>
              <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>
                {request.items.map((item) => item.serviceName).join(', ') || 'No services'} · Preferred
                start {request.preferredStartDate}
              </div>
            </div>
            <span className={`hhh-badge ${STATUS_BADGE_CLASS[request.status]}`}>
              {STATUS_LABELS[request.status]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

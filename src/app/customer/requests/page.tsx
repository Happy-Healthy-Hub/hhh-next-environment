import { redirect } from 'next/navigation';
import { loadCustomerSession } from '@/lib/customer-auth';
import { apiListMyRequests } from '@/lib/api/customer-portal';
import { ApiError } from '@/lib/api/client';
import { CustomerShell } from '../components/CustomerShell';

export const instant = false;

const STATUS_STYLES: Record<string, string> = {
  submitted: 'hhh-badge--default',
  under_review: 'hhh-badge--info',
  approved: 'hhh-badge--success',
  rejected: 'hhh-badge--danger',
  cancelled: 'hhh-badge--default',
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Not approved',
  cancelled: 'Cancelled',
};

export default async function CustomerRequestsPage() {
  const session = await loadCustomerSession();
  if (!session) redirect('/login');

  if (!session.customerId) {
    return (
      <CustomerShell title="My Requests" userEmail={session.email}>
        <div className="hhh-card" style={{ textAlign: 'center', padding: 'var(--hhh-space-xl)', marginTop: 'var(--hhh-space-lg)' }}>
          <p style={{ margin: 0, color: 'var(--hhh-secondary-text)' }}>
            You need a customer profile to view care requests. Please register using the Happy Healthy Hub mobile app or contact us.
          </p>
        </div>
      </CustomerShell>
    );
  }

  let requests: Awaited<ReturnType<typeof apiListMyRequests>> = [];
  let error = false;
  try {
    requests = await apiListMyRequests(session.customerId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    error = true;
  }

  return (
    <CustomerShell title="My Requests" userEmail={session.email}>
      <p style={{ color: 'var(--hhh-secondary-text)', marginTop: 0, maxWidth: 640 }}>
        Track the status of your care requests.
      </p>

      {error && (
        <div className="hhh-card" style={{ borderLeft: '4px solid var(--hhh-error)', padding: 'var(--hhh-space-md)' }}>
          <p style={{ margin: 0, color: 'var(--hhh-error)' }}>
            Could not load your requests. Please try reloading.
          </p>
        </div>
      )}

      {!error && requests.length === 0 && (
        <div className="hhh-card" style={{ textAlign: 'center', padding: 'var(--hhh-space-xl)', marginTop: 'var(--hhh-space-lg)' }}>
          <p style={{ margin: 0, color: 'var(--hhh-secondary-text)' }}>
            You have not submitted any care requests yet. Use the mobile app to request a service.
          </p>
        </div>
      )}

      {!error && requests.length > 0 && (
        <div style={{ display: 'grid', gap: 'var(--hhh-space-sm)', marginTop: 'var(--hhh-space-lg)' }}>
          {requests.map((r) => (
            <div key={r.id} className="hhh-card" style={{ padding: 'var(--hhh-space-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--hhh-space-sm)' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>
                    Request — {new Date(r.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </span>
                  {r.urgency && (
                    <span style={{ marginLeft: 8, fontSize: '0.85rem', color: 'var(--hhh-secondary-text)' }}>
                      ({r.urgency})
                    </span>
                  )}
                </div>
                <span className={`hhh-badge ${STATUS_STYLES[r.status] ?? 'hhh-badge--default'}`}>
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
              </div>
              {r.notes && (
                <p style={{ margin: '8px 0 0', color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>
                  {r.notes}
                </p>
              )}
              {r.items && r.items.length > 0 && (
                <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--hhh-secondary-text)' }}>
                  Services: {r.items.map((i) => i.service_name ?? `Service #${i.service_id.slice(0, 8)}`).join(', ')}
                </div>
              )}
              {r.decided_at && (
                <div style={{ marginTop: 4, fontSize: '0.85rem', color: 'var(--hhh-secondary-text)' }}>
                  Decided: {new Date(r.decided_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </CustomerShell>
  );
}

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import {
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
  canDecide,
  canStartReview,
  fetchCareRequest,
  formatPriceLabel,
} from '@/lib/care-requests';
import { AdminShell } from '../../components/AdminShell';
import { RequestActions } from './RequestActions';

export const instant = false;

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let request;
  try {
    request = await fetchCareRequest(supabase, id);
  } catch (err) {
    console.error('Failed to load requests/[id]:', err);
    request = null;
  }

  if (!request) {
    return (
      <AdminShell title="Care request" userEmail={session.email} isDemo={session.isDemo}>
        <div className="hhh-empty-state">
          This request could not be found. It may not exist, or you may not have access to it.
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Care request" userEmail={session.email} isDemo={session.isDemo}>
      <div className="hhh-card" style={{ marginBottom: 'var(--hhh-space-lg)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 'var(--hhh-space-md)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>{request.customer.preferredName ?? request.customer.fullName}</h2>
            {request.customer.phoneNumber && (
              <p style={{ margin: '4px 0', color: 'var(--hhh-secondary-text)' }}>
                {request.customer.phoneNumber}
              </p>
            )}
            {request.customer.email && (
              <p style={{ margin: '4px 0', color: 'var(--hhh-secondary-text)' }}>
                {request.customer.email}
              </p>
            )}
          </div>
          <span className={`hhh-badge ${STATUS_BADGE_CLASS[request.status]}`}>
            {STATUS_LABELS[request.status]}
          </span>
        </div>
      </div>

      {request.decisionReason && (
        <div className="hhh-card" style={{ marginBottom: 'var(--hhh-space-lg)' }}>
          <strong>Decision note</strong>
          <p style={{ margin: '4px 0 0' }}>{request.decisionReason}</p>
        </div>
      )}
      {request.cancellationReason && (
        <div className="hhh-card" style={{ marginBottom: 'var(--hhh-space-lg)' }}>
          <strong>Cancellation reason</strong>
          <p style={{ margin: '4px 0 0' }}>{request.cancellationReason}</p>
        </div>
      )}

      <section style={{ marginBottom: 'var(--hhh-space-lg)' }}>
        <h3>Services requested</h3>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--hhh-space-sm)' }}>
          {request.items.map((item) => {
            const priceLabel = formatPriceLabel(item);
            return (
              <li key={item.serviceId} className="hhh-card">
                <div style={{ fontWeight: 600 }}>{item.serviceName}</div>
                {item.notes && (
                  <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>
                    {item.notes}
                  </div>
                )}
                {priceLabel && (
                  <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>
                    {priceLabel}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section style={{ marginBottom: 'var(--hhh-space-lg)' }}>
        <h3>When</h3>
        <p>
          Preferred start: {request.preferredStartDate}
          {request.preferredEndDate ? ` · Until ${request.preferredEndDate}` : ''}
          {request.preferredTimeOfDay ? ` · ${request.preferredTimeOfDay}` : ''}
        </p>
        {request.scheduleNotes && <p>Scheduling notes: {request.scheduleNotes}</p>}
        {request.customerNotes && <p>Customer notes: {request.customerNotes}</p>}
      </section>

      <RequestActions
        requestId={request.id}
        canStartReview={canStartReview(request.status)}
        canDecide={canDecide(request.status)}
      />
    </AdminShell>
  );
}

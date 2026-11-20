import { redirect } from 'next/navigation';
import { loadCustomerSession } from '@/lib/customer-auth';
import { apiGetMyCustomerProfile, type CustomerProfile } from '@/lib/api/customer-portal';
import { CustomerShell } from '../components/CustomerShell';

export const instant = false;

export default async function CustomerProfilePage() {
  const session = await loadCustomerSession();
  if (!session) redirect('/login');

  let customer: CustomerProfile | null = null;
  if (session.customerId) {
    customer = await apiGetMyCustomerProfile();
  }

  return (
    <CustomerShell title="My Profile" userEmail={session.email}>
      <div className="hhh-card" style={{ maxWidth: 500, marginTop: 'var(--hhh-space-lg)' }}>
        <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>Account information</h2>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '140px 1fr', gap: 'var(--hhh-space-sm) var(--hhh-space-md)' }}>
          <dt style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem', fontWeight: 600 }}>Email</dt>
          <dd style={{ margin: 0 }}>{session.email ?? '—'}</dd>

          <dt style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem', fontWeight: 600 }}>Account ID</dt>
          <dd style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.85rem' }}>{session.userId.slice(0, 12)}…</dd>
        </dl>
      </div>

      {customer ? (
        <div className="hhh-card" style={{ maxWidth: 500, marginTop: 'var(--hhh-space-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>Customer profile</h2>
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '140px 1fr', gap: 'var(--hhh-space-sm) var(--hhh-space-md)' }}>
            {[
              { label: 'Full name', value: customer.full_name },
              { label: 'Preferred name', value: customer.preferred_name },
              { label: 'Phone', value: customer.phone_number },
              { label: 'Email', value: customer.email },
              { label: 'City', value: customer.city },
              { label: 'Status', value: customer.status },
              { label: 'Registered', value: customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : null },
            ].map((f) => (
              <div key={f.label} style={{ display: 'contents' }}>
                <dt style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem', fontWeight: 600 }}>{f.label}</dt>
                <dd style={{ margin: 0 }}>
                  {f.label === 'Status' && f.value ? (
                    <span className={`hhh-badge hhh-badge--${f.value === 'active' ? 'success' : 'default'}`}>{f.value}</span>
                  ) : (
                    f.value ?? <span style={{ color: 'var(--hhh-secondary-text)' }}>—</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <div className="hhh-card" style={{ maxWidth: 500, marginTop: 'var(--hhh-space-lg)', borderLeft: '4px solid #7a4510' }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            <strong>No customer profile found.</strong> Please register using the Happy Healthy Hub mobile app or contact us.
          </p>
        </div>
      )}
    </CustomerShell>
  );
}

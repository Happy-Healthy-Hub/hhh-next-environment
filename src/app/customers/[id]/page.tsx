import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { fetchCustomerDetail } from '@/lib/customers';
import { CUSTOMER_STATUS_BADGE_CLASS, CUSTOMER_STATUS_LABELS } from '@/lib/customers';
import { AdminShell } from '../../components/AdminShell';
import { CustomerDetailPanel } from './CustomerDetailPanel';

export const instant = false;

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let customer;
  try {
    customer = await fetchCustomerDetail(supabase, id);
  } catch (err) {
    console.error('Failed to load customers/[id]:', err);
    customer = null;
  }

  if (!customer) {
    return (
      <AdminShell title="Customer" userEmail={session.email} isDemo={session.isDemo}>
        <div style={{ marginBottom: 'var(--hhh-space-md)' }}>
          <Link href="/customers" style={{ color: 'var(--hhh-dark-teal)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Back to customers
          </Link>
        </div>
        <div className="hhh-empty-state">
          This customer could not be found. They may not exist, or you may not have access to their record.
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Customer" userEmail={session.email} isDemo={session.isDemo}>
      <div style={{ marginBottom: 'var(--hhh-space-md)' }}>
        <Link href="/customers" style={{ color: 'var(--hhh-dark-teal)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to customers
        </Link>
      </div>

      <div className="hhh-card" style={{ marginBottom: 'var(--hhh-space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--hhh-space-md)', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>{customer.preferredName ?? customer.fullName}</h2>
            {customer.preferredName && (
              <p style={{ margin: '2px 0', color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>
                Legal name: {customer.fullName}
              </p>
            )}
          </div>
          <span className={`hhh-badge ${CUSTOMER_STATUS_BADGE_CLASS[customer.status]}`}>
            {CUSTOMER_STATUS_LABELS[customer.status]}
          </span>
        </div>
      </div>

      <CustomerDetailPanel customer={customer} />
    </AdminShell>
  );
}

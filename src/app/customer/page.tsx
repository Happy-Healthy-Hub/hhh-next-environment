import { redirect } from 'next/navigation';
import Link from 'next/link';
import { loadCustomerSession } from '@/lib/customer-auth';
import { CustomerShell } from './components/CustomerShell';

export const instant = false;

export default async function CustomerHomePage() {
  const session = await loadCustomerSession();
  if (!session) redirect('/login');

  return (
    <CustomerShell title="Welcome" userEmail={session.email}>
      <div style={{ maxWidth: 640 }}>
        <h2 style={{ fontSize: '1.3rem', marginTop: 0 }}>
          {session.customerName
            ? `Hello, ${session.customerName}`
            : 'Welcome to Happy Healthy Hub'}
        </h2>
        <p style={{ color: 'var(--hhh-secondary-text)', lineHeight: 1.6 }}>
          Manage your care services, browse available services and track your care requests.
        </p>

        <div style={{ display: 'grid', gap: 'var(--hhh-space-md)', marginTop: 'var(--hhh-space-xl)' }}>
          <Link href="/customer/services" className="hhh-card" style={{ textDecoration: 'none', color: 'inherit', padding: 'var(--hhh-space-lg)', borderLeft: '4px solid var(--hhh-primary-teal)' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Browse services</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>
              View our care service catalogue and learn about available options.
            </p>
          </Link>

          <Link href="/customer/requests" className="hhh-card" style={{ textDecoration: 'none', color: 'inherit', padding: 'var(--hhh-space-lg)', borderLeft: '4px solid var(--hhh-muted-sage)' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>My care requests</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>
              {session.customerId
                ? 'Track the status of your submitted care requests.'
                : 'Register as a customer to submit and track care requests.'}
            </p>
          </Link>

          <Link href="/customer/profile" className="hhh-card" style={{ textDecoration: 'none', color: 'inherit', padding: 'var(--hhh-space-lg)', borderLeft: '4px solid var(--hhh-soft-peach)' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>My profile</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>
              View and manage your personal information.
            </p>
          </Link>
        </div>

        {!session.customerId && (
          <div className="hhh-card" style={{ marginTop: 'var(--hhh-space-xl)', borderLeft: '4px solid #7a4510', padding: 'var(--hhh-space-md)' }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              <strong>Not registered yet?</strong> You are signed in but do not have a customer profile.
              Please use the Happy Healthy Hub mobile app or contact us to complete your registration.
            </p>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}

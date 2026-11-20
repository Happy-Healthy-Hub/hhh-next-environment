import { redirect } from 'next/navigation';
import { loadCustomerSession } from '@/lib/customer-auth';
import { apiListServices } from '@/lib/api/customer-portal';
import { ApiError } from '@/lib/api/client';
import { CustomerShell } from '../components/CustomerShell';

export const instant = false;

export default async function CustomerServicesPage() {
  const session = await loadCustomerSession();
  if (!session) redirect('/login');

  let services: Awaited<ReturnType<typeof apiListServices>> = [];
  let error = false;
  try {
    services = await apiListServices();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    error = true;
  }

  const categories = [...new Set(services.map((s) => s.category).filter(Boolean))] as string[];

  return (
    <CustomerShell title="Services" userEmail={session.email}>
      <p style={{ color: 'var(--hhh-secondary-text)', marginTop: 0, maxWidth: 640 }}>
        Browse our available care services. Contact us or use the mobile app to request a service.
      </p>

      {error && (
        <div className="hhh-card" style={{ borderLeft: '4px solid var(--hhh-error)', padding: 'var(--hhh-space-md)' }}>
          <p style={{ margin: 0, color: 'var(--hhh-error)' }}>
            Could not load services. Please try reloading.
          </p>
        </div>
      )}

      {!error && services.length === 0 && (
        <div className="hhh-card" style={{ textAlign: 'center', padding: 'var(--hhh-space-xl)', marginTop: 'var(--hhh-space-lg)' }}>
          <p style={{ margin: 0, color: 'var(--hhh-secondary-text)' }}>
            No services are available at the moment. Please check back soon.
          </p>
        </div>
      )}

      {!error && services.length > 0 && (
        <div style={{ marginTop: 'var(--hhh-space-lg)' }}>
          {categories.length > 0 ? (
            categories.map((cat) => (
              <section key={cat} style={{ marginBottom: 'var(--hhh-space-xl)' }}>
                <h2 style={{ fontSize: '1.05rem', color: 'var(--hhh-secondary-text)', fontWeight: 700, textTransform: 'capitalize' }}>
                  {cat}
                </h2>
                <div style={{ display: 'grid', gap: 'var(--hhh-space-sm)' }}>
                  {services.filter((s) => s.category === cat).map((s) => (
                    <div key={s.id} className="hhh-card" style={{ padding: 'var(--hhh-space-md)' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>{s.name}</h3>
                      {s.description && (
                        <p style={{ margin: '4px 0 0', color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>
                          {s.description}
                        </p>
                      )}
                      {s.base_price != null && (
                        <div style={{ marginTop: '4px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--hhh-primary-teal)' }}>
                          From ₹{s.base_price.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div style={{ display: 'grid', gap: 'var(--hhh-space-sm)' }}>
              {services.map((s) => (
                <div key={s.id} className="hhh-card" style={{ padding: 'var(--hhh-space-md)' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>{s.name}</h3>
                  {s.description && (
                    <p style={{ margin: '4px 0 0', color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>
                      {s.description}
                    </p>
                  )}
                  {s.base_price != null && (
                    <div style={{ marginTop: '4px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--hhh-primary-teal)' }}>
                      From ₹{s.base_price.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </CustomerShell>
  );
}

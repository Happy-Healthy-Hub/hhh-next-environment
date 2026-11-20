import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { apiListModules, type AcademyModule } from '@/lib/api/academy';
import { AdminShell } from '../components/AdminShell';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';

export const instant = false;

export default async function AcademyPage() {
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let modules: AcademyModule[] = [];
  let fetchError = false;
  try {
    modules = await apiListModules();
  } catch (err) {
    console.error('Failed to load academy:', err);
    fetchError = true;
  }

  const active = modules.filter((m) => m.is_active);
  const inactive = modules.filter((m) => !m.is_active);

  return (
    <AdminShell title="Caregiver Academy" userEmail={session.email} isDemo={session.isDemo}>
      <p style={{ color: 'var(--hhh-secondary-text)', marginTop: 0, maxWidth: 640 }}>
        Training modules for care associates. Modules marked as required must be completed before a
        caregiver can be assigned to customers.
      </p>

      {fetchError ? (
        <ErrorState message="Something went wrong loading academy modules. Please try reloading the page." />
      ) : modules.length === 0 ? (
        <EmptyState
          title="No training modules"
          message="No academy modules have been created yet. An administrator can create modules via the API."
        />
      ) : (
        <>
          {active.length > 0 && (
            <section style={{ marginBottom: 'var(--hhh-space-xl)' }}>
              <h2 style={{ fontSize: '1.1rem' }}>Active modules ({active.length})</h2>
              <ModuleTable modules={active} />
            </section>
          )}
          {inactive.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--hhh-secondary-text)' }}>Inactive ({inactive.length})</h2>
              <ModuleTable modules={inactive} />
            </section>
          )}
        </>
      )}
    </AdminShell>
  );
}

function ModuleTable({ modules }: { modules: AcademyModule[] }) {
  return (
    <div className="hhh-panel" style={{ overflowX: 'auto' }}>
      <table className="hhh-data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Title</th>
            <th>Duration</th>
            <th>Required</th>
            <th>Order</th>
          </tr>
        </thead>
        <tbody>
          {modules.map((m) => (
            <tr key={m.id}>
              <td data-label="Code" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{m.code}</td>
              <td data-label="Title">
                <div style={{ fontWeight: 600 }}>{m.title}</div>
                {m.summary && (
                  <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginTop: 2 }}>{m.summary}</div>
                )}
              </td>
              <td data-label="Duration">{m.duration_minutes ? `${m.duration_minutes} min` : '—'}</td>
              <td data-label="Required">
                <span className={`hhh-badge ${m.is_required ? 'hhh-badge--attention' : 'hhh-badge--neutral'}`}>
                  {m.is_required ? 'Required' : 'Optional'}
                </span>
              </td>
              <td data-label="Order">{m.sort_order}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

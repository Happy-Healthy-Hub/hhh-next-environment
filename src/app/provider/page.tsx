import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadProviderSession } from '@/lib/provider-auth';
import { apiListMyWork } from '@/lib/api/provider-portal';
import { ApiError } from '@/lib/api/client';
import { ProviderShell } from './components/ProviderShell';

export const instant = false;

export default async function ProviderDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const session = await loadProviderSession();
  if (!session) redirect('/not-authorized');

  let assignments: Awaited<ReturnType<typeof apiListMyWork>> = [];
  let workError = false;
  try {
    assignments = await apiListMyWork();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    workError = true;
  }

  const activeAssignments = assignments.filter((a) => a.status === 'active' || a.status === 'in_progress');
  const completedAssignments = assignments.filter((a) => a.status === 'completed');

  return (
    <ProviderShell
      title="Provider Dashboard"
      userEmail={user.email ?? null}
      orgName={session.organization.display_name}
    >
      <p style={{ color: 'var(--hhh-secondary-text)', marginTop: 0, maxWidth: 640 }}>
        Welcome to {session.organization.display_name}. Manage your assignments and team.
      </p>

      <section aria-labelledby="provider-kpis" style={{ marginTop: 'var(--hhh-space-lg)' }}>
        <h2 id="provider-kpis" style={{ fontSize: '1rem', color: 'var(--hhh-secondary-text)', fontWeight: 700 }}>
          At a glance
        </h2>
        <div className="hhh-kpi-grid">
          <div className="hhh-card" style={{ textAlign: 'center', padding: 'var(--hhh-space-lg)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--hhh-primary-teal)' }}>
              {activeAssignments.length}
            </div>
            <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>Active assignments</div>
          </div>
          <div className="hhh-card" style={{ textAlign: 'center', padding: 'var(--hhh-space-lg)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--hhh-primary-teal)' }}>
              {completedAssignments.length}
            </div>
            <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>Completed</div>
          </div>
          <div className="hhh-card" style={{ textAlign: 'center', padding: 'var(--hhh-space-lg)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--hhh-primary-teal)' }}>
              {session.organization.verification_status === 'verified' ? 'Verified' : session.organization.verification_status}
            </div>
            <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>Organisation status</div>
          </div>
        </div>
      </section>

      {workError && (
        <div className="hhh-card" style={{ marginTop: 'var(--hhh-space-lg)', borderLeft: '4px solid var(--hhh-error)', padding: 'var(--hhh-space-md)' }}>
          <p style={{ margin: 0, color: 'var(--hhh-error)' }}>
            Could not load assignment data. Please try reloading the page.
          </p>
        </div>
      )}

      {!workError && activeAssignments.length > 0 && (
        <section aria-labelledby="active-work" style={{ marginTop: 'var(--hhh-space-xl)' }}>
          <h2 id="active-work" style={{ fontSize: '1rem', color: 'var(--hhh-secondary-text)', fontWeight: 700 }}>
            Active assignments
          </h2>
          <div className="hhh-table-wrap">
            <table className="hhh-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {activeAssignments.slice(0, 10).map((a) => (
                  <tr key={a.id}>
                    <td>{a.assignment_type}</td>
                    <td>
                      <span className={`hhh-badge hhh-badge--${a.status === 'in_progress' ? 'info' : 'default'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>{new Date(a.assigned_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                    <td style={{ color: 'var(--hhh-secondary-text)' }}>{a.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!workError && assignments.length === 0 && (
        <div className="hhh-card" style={{ marginTop: 'var(--hhh-space-lg)', textAlign: 'center', padding: 'var(--hhh-space-xl)' }}>
          <p style={{ margin: 0, color: 'var(--hhh-secondary-text)' }}>
            No assignments yet. New assignments from HHH will appear here.
          </p>
        </div>
      )}
    </ProviderShell>
  );
}

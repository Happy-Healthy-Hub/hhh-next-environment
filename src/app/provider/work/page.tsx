import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadProviderSession } from '@/lib/provider-auth';
import { apiListMyWork } from '@/lib/api/provider-portal';
import { ApiError } from '@/lib/api/client';
import { ProviderShell } from '../components/ProviderShell';

export const instant = false;

const STATUS_STYLES: Record<string, string> = {
  active: 'hhh-badge--info',
  in_progress: 'hhh-badge--info',
  completed: 'hhh-badge--success',
  cancelled: 'hhh-badge--default',
};

export default async function ProviderWorkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const session = await loadProviderSession();
  if (!session) redirect('/not-authorized');

  let assignments: Awaited<ReturnType<typeof apiListMyWork>> = [];
  let error = false;
  try {
    assignments = await apiListMyWork();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    error = true;
  }

  return (
    <ProviderShell
      title="Assignments"
      userEmail={user.email ?? null}
      orgName={session.organization.display_name}
    >
      <p style={{ color: 'var(--hhh-secondary-text)', marginTop: 0, maxWidth: 640 }}>
        Care assignments for {session.organization.display_name}.
      </p>

      {error && (
        <div className="hhh-card" style={{ borderLeft: '4px solid var(--hhh-error)', padding: 'var(--hhh-space-md)' }}>
          <p style={{ margin: 0, color: 'var(--hhh-error)' }}>
            Could not load assignments. Please try reloading.
          </p>
        </div>
      )}

      {!error && assignments.length === 0 && (
        <div className="hhh-card" style={{ textAlign: 'center', padding: 'var(--hhh-space-xl)', marginTop: 'var(--hhh-space-lg)' }}>
          <p style={{ margin: 0, color: 'var(--hhh-secondary-text)' }}>
            No assignments yet. Assignments from HHH care coordination will appear here.
          </p>
        </div>
      )}

      {!error && assignments.length > 0 && (
        <div className="hhh-table-wrap" style={{ marginTop: 'var(--hhh-space-lg)' }}>
          <table className="hhh-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Completed</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td>{a.assignment_type}</td>
                  <td>
                    <span className={`hhh-badge ${STATUS_STYLES[a.status] ?? 'hhh-badge--default'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>{new Date(a.assigned_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                  <td>{a.completed_at ? new Date(a.completed_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}</td>
                  <td style={{ color: 'var(--hhh-secondary-text)', maxWidth: 300 }}>{a.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProviderShell>
  );
}

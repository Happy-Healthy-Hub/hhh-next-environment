import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadProviderSession } from '@/lib/provider-auth';
import { apiListMyOrgMembers } from '@/lib/api/provider-portal';
import { ApiError } from '@/lib/api/client';
import { ProviderShell } from '../components/ProviderShell';

export const instant = false;

const ROLE_LABELS: Record<string, string> = {
  provider_admin: 'Admin',
  provider_professional: 'Professional',
};

export default async function ProviderMembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const session = await loadProviderSession();
  if (!session) redirect('/not-authorized');

  let members: Awaited<ReturnType<typeof apiListMyOrgMembers>> = [];
  let error = false;
  try {
    members = await apiListMyOrgMembers();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    error = true;
  }

  return (
    <ProviderShell
      title="Team Members"
      userEmail={user.email ?? null}
      orgName={session.organization.display_name}
    >
      <p style={{ color: 'var(--hhh-secondary-text)', marginTop: 0, maxWidth: 640 }}>
        Members of {session.organization.display_name}.
      </p>

      {error && (
        <div className="hhh-card" style={{ borderLeft: '4px solid var(--hhh-error)', padding: 'var(--hhh-space-md)' }}>
          <p style={{ margin: 0, color: 'var(--hhh-error)' }}>
            Could not load team members. Please try reloading.
          </p>
        </div>
      )}

      {!error && members.length === 0 && (
        <div className="hhh-card" style={{ textAlign: 'center', padding: 'var(--hhh-space-xl)', marginTop: 'var(--hhh-space-lg)' }}>
          <p style={{ margin: 0, color: 'var(--hhh-secondary-text)' }}>
            No team members found. Members are added by HHH administrators.
          </p>
        </div>
      )}

      {!error && members.length > 0 && (
        <div className="hhh-table-wrap" style={{ marginTop: 'var(--hhh-space-lg)' }}>
          <table className="hhh-table">
            <thead>
              <tr>
                <th>Member ID</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={m.profile_id === user.id ? { background: 'var(--hhh-sage-bg, var(--hhh-muted-sage))' } : undefined}>
                  <td>
                    {m.profile_id === user.id ? (
                      <span style={{ fontWeight: 600 }}>You</span>
                    ) : (
                      <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{m.profile_id.slice(0, 8)}…</span>
                    )}
                  </td>
                  <td>
                    <span className="hhh-badge">{ROLE_LABELS[m.org_role] ?? m.org_role}</span>
                  </td>
                  <td>
                    <span className={`hhh-badge hhh-badge--${m.status === 'active' ? 'success' : 'default'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>{new Date(m.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="hhh-card" style={{ marginTop: 'var(--hhh-space-lg)', maxWidth: 600, borderLeft: '4px solid var(--hhh-primary-teal)' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--hhh-secondary-text)' }}>
          Team members are managed by HHH administrators. Contact support to add or remove members.
        </p>
      </div>
    </ProviderShell>
  );
}

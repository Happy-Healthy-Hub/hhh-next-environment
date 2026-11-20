import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadProviderSession } from '@/lib/provider-auth';
import { ProviderShell } from '../components/ProviderShell';

export const instant = false;

export default async function ProviderProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const session = await loadProviderSession();
  if (!session) redirect('/not-authorized');

  const membership = session.membership;

  return (
    <ProviderShell
      title="My Profile"
      userEmail={user.email ?? null}
      orgName={session.organization.display_name}
    >
      <div className="hhh-card" style={{ maxWidth: 500, marginTop: 'var(--hhh-space-lg)' }}>
        <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>Your provider profile</h2>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '140px 1fr', gap: 'var(--hhh-space-sm) var(--hhh-space-md)' }}>
          <dt style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem', fontWeight: 600 }}>Email</dt>
          <dd style={{ margin: 0 }}>{user.email ?? '—'}</dd>

          <dt style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem', fontWeight: 600 }}>Organisation</dt>
          <dd style={{ margin: 0 }}>{session.organization.display_name}</dd>

          <dt style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem', fontWeight: 600 }}>Role</dt>
          <dd style={{ margin: 0 }}>
            <span className="hhh-badge">
              {membership.org_role === 'provider_admin' ? 'Admin' : membership.org_role === 'provider_professional' ? 'Professional' : membership.org_role}
            </span>
          </dd>

          <dt style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem', fontWeight: 600 }}>Status</dt>
          <dd style={{ margin: 0 }}>
            <span className={`hhh-badge hhh-badge--${membership.status === 'active' ? 'success' : 'default'}`}>
              {membership.status}
            </span>
          </dd>

          <dt style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem', fontWeight: 600 }}>Member since</dt>
          <dd style={{ margin: 0 }}>
            {new Date(membership.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
          </dd>
        </dl>
      </div>
    </ProviderShell>
  );
}

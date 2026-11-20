import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadProviderSession } from '@/lib/provider-auth';
import { ProviderShell } from '../components/ProviderShell';

export const instant = false;

export default async function ProviderOrganizationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const session = await loadProviderSession();
  if (!session) redirect('/not-authorized');

  const org = session.organization;

  const fields: { label: string; value: string | null }[] = [
    { label: 'Legal name', value: org.legal_name },
    { label: 'Display name', value: org.display_name },
    { label: 'Category', value: org.category },
    { label: 'Contact email', value: org.contact_email },
    { label: 'Contact phone', value: org.contact_phone },
    { label: 'City', value: org.city },
    { label: 'State / Region', value: org.state_region },
    { label: 'Country', value: org.country_code },
    { label: 'Verification status', value: org.verification_status },
    { label: 'Verified at', value: org.verified_at ? new Date(org.verified_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : null },
    { label: 'Registered', value: new Date(org.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) },
  ];

  return (
    <ProviderShell
      title="Organisation"
      userEmail={user.email ?? null}
      orgName={org.display_name}
    >
      <p style={{ color: 'var(--hhh-secondary-text)', marginTop: 0, maxWidth: 640 }}>
        Organisation details for {org.display_name}.
      </p>

      <div className="hhh-card" style={{ marginTop: 'var(--hhh-space-lg)', maxWidth: 600 }}>
        <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>Organisation profile</h2>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '180px 1fr', gap: 'var(--hhh-space-sm) var(--hhh-space-md)' }}>
          {fields.map((f) => (
            <div key={f.label} style={{ display: 'contents' }}>
              <dt style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem', fontWeight: 600 }}>{f.label}</dt>
              <dd style={{ margin: 0, fontSize: '0.95rem' }}>
                {f.label === 'Verification status' ? (
                  <span className={`hhh-badge hhh-badge--${f.value === 'verified' ? 'success' : f.value === 'rejected' || f.value === 'suspended' ? 'danger' : 'default'}`}>
                    {f.value ?? '—'}
                  </span>
                ) : (
                  f.value ?? <span style={{ color: 'var(--hhh-secondary-text)' }}>—</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {session.isProviderAdmin && (
        <div className="hhh-card" style={{ marginTop: 'var(--hhh-space-lg)', maxWidth: 600, borderLeft: '4px solid var(--hhh-primary-teal)' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--hhh-secondary-text)' }}>
            Organisation profile changes are managed by HHH administrators. Contact support if you need to update your details.
          </p>
        </div>
      )}
    </ProviderShell>
  );
}

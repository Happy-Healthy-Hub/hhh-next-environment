'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setProviderVerificationAction, addProviderMemberAction } from './actions';

export interface Organization {
  id: string;
  legal_name: string;
  display_name: string;
  category: string;
  contact_email: string | null;
  contact_phone: string | null;
  city: string | null;
  state_region: string | null;
  country_code: string;
  verification_status: string;
  verified_at: string | null;
  created_at: string;
}

export interface Membership {
  id: string;
  provider_organization_id: string;
  profile_id: string;
  org_role: string;
  status: string;
  invited_at: string | null;
  activated_at: string | null;
  created_at: string;
}

const PROVIDER_VERIFICATION_STATUSES = ['pending', 'under_review', 'verified', 'rejected', 'suspended'] as const;
type ProviderVerificationStatus = (typeof PROVIDER_VERIFICATION_STATUSES)[number];

const VERIFICATION_LABEL: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under review',
  verified: 'Verified',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

const VERIFICATION_BADGE: Record<string, string> = {
  pending: 'hhh-badge--attention',
  under_review: 'hhh-badge--attention',
  verified: 'hhh-badge--positive',
  rejected: 'hhh-badge--critical',
  suspended: 'hhh-badge--critical',
};

const MEMBERSHIP_BADGE: Record<string, string> = {
  invited: 'hhh-badge--attention',
  active: 'hhh-badge--positive',
  suspended: 'hhh-badge--critical',
  revoked: 'hhh-badge--neutral',
};

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--hhh-space-md)', padding: '8px 0', borderBottom: '1px solid var(--hhh-border)' }}>
      <span style={{ minWidth: 140, color: 'var(--hhh-secondary-text)', fontWeight: 600, fontSize: '0.85rem' }}>{label}</span>
      <span style={{ flex: 1 }}>{value || '—'}</span>
    </div>
  );
}

export function ProviderDetailPanel({
  organization,
  members,
  isAdministrator,
}: {
  organization: Organization;
  members: Membership[];
  isAdministrator: boolean;
}) {
  const router = useRouter();
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [verStatus, setVerStatus] = useState<ProviderVerificationStatus>(
    organization.verification_status as ProviderVerificationStatus
  );
  const [verNotes, setVerNotes] = useState('');
  const [newMemberProfileId, setNewMemberProfileId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'provider_admin' | 'provider_professional'>('provider_professional');

  function handleVerification(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await setProviderVerificationAction(organization.id, verStatus, verNotes.trim() || null);
      if (!result.ok) {
        setBanner({ tone: 'error', message: result.message ?? 'Something went wrong.' });
        return;
      }
      setBanner({ tone: 'success', message: `${organization.display_name} marked ${VERIFICATION_LABEL[verStatus] ?? verStatus}.` });
      setVerNotes('');
      router.refresh();
    });
  }

  function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newMemberProfileId.trim();
    if (!trimmed) {
      setBanner({ tone: 'error', message: 'A profile ID is required.' });
      return;
    }
    startTransition(async () => {
      const result = await addProviderMemberAction(organization.id, trimmed, newMemberRole);
      if (!result.ok) {
        setBanner({ tone: 'error', message: result.message ?? 'Something went wrong.' });
        return;
      }
      setBanner({ tone: 'success', message: `Added member as ${newMemberRole === 'provider_admin' ? 'administrator' : 'professional'}.` });
      setNewMemberProfileId('');
      setNewMemberRole('provider_professional');
      router.refresh();
    });
  }

  return (
    <div className="hhh-fade-in">
      {banner && (
        <div
          role="status"
          className={banner.tone === 'success' ? 'hhh-badge hhh-badge--positive' : 'hhh-inline-alert'}
          style={{ display: 'block', marginBottom: 'var(--hhh-space-md)' }}
        >
          {banner.message}
        </div>
      )}

      <div className="hhh-card" style={{ marginBottom: 'var(--hhh-space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--hhh-space-md)', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>{organization.display_name}</h2>
            <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginTop: 4 }}>
              {organization.legal_name}
            </div>
          </div>
          <span className={`hhh-badge ${VERIFICATION_BADGE[organization.verification_status] ?? 'hhh-badge--neutral'}`}>
            {VERIFICATION_LABEL[organization.verification_status] ?? organization.verification_status}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 'var(--hhh-space-lg)', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: 'var(--hhh-space-lg)' }}>
        <div className="hhh-card">
          <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>Organisation details</h3>
          <InfoRow label="Category" value={organization.category} />
          <InfoRow label="Email" value={organization.contact_email} />
          <InfoRow label="Phone" value={organization.contact_phone} />
          <InfoRow label="City" value={organization.city} />
          <InfoRow label="State" value={organization.state_region} />
          <InfoRow label="Country" value={organization.country_code} />
          <InfoRow label="Registered" value={new Date(organization.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })} />
          {organization.verified_at && (
            <InfoRow label="Verified" value={new Date(organization.verified_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })} />
          )}
        </div>

        {isAdministrator && (
          <div className="hhh-card">
            <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>Verification</h3>
            <form onSubmit={handleVerification} className="hhh-form-grid">
              <div>
                <label className="hhh-field-label" htmlFor="ver-status">Status</label>
                <select
                  id="ver-status"
                  className="hhh-status-select"
                  value={verStatus}
                  disabled={isPending}
                  onChange={(e) => setVerStatus(e.target.value as ProviderVerificationStatus)}
                >
                  {PROVIDER_VERIFICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {VERIFICATION_LABEL[s] ?? s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="hhh-field-label" htmlFor="ver-notes">Notes (optional)</label>
                <textarea
                  id="ver-notes"
                  className="hhh-text-field"
                  value={verNotes}
                  onChange={(e) => setVerNotes(e.target.value)}
                  rows={3}
                  disabled={isPending}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="hhh-button-primary" disabled={isPending}>
                  {isPending ? 'Saving…' : 'Apply'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="hhh-card" style={{ marginBottom: 'var(--hhh-space-lg)' }}>
        <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>
          Members
          <span style={{ fontWeight: 400, color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginLeft: 8 }}>
            ({members.length})
          </span>
        </h3>

        {members.length === 0 ? (
          <p style={{ color: 'var(--hhh-secondary-text)', margin: 0 }}>No members yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="hhh-data-table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td data-label="Profile" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{m.profile_id}</td>
                    <td data-label="Role">{m.org_role === 'provider_admin' ? 'Administrator' : 'Professional'}</td>
                    <td data-label="Status">
                      <span className={`hhh-badge ${MEMBERSHIP_BADGE[m.status] ?? 'hhh-badge--neutral'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td data-label="Added">{new Date(m.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAdministrator && (
        <div className="hhh-card">
          <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>Add a member</h3>
          <form onSubmit={handleAddMember} className="hhh-form-grid">
            <div>
              <label className="hhh-field-label" htmlFor="new-member-id">Profile ID</label>
              <input
                id="new-member-id"
                className="hhh-text-field"
                value={newMemberProfileId}
                onChange={(e) => setNewMemberProfileId(e.target.value)}
                placeholder="UUID"
                disabled={isPending}
                required
              />
              <p style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginTop: 4 }}>
                The provider user must already have an HHH account. Paste their profile ID.
              </p>
            </div>
            <div>
              <label className="hhh-field-label" htmlFor="new-member-role">Role</label>
              <select
                id="new-member-role"
                className="hhh-status-select"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as 'provider_admin' | 'provider_professional')}
                disabled={isPending}
              >
                <option value="provider_professional">Professional</option>
                <option value="provider_admin">Administrator</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="hhh-button-primary" disabled={isPending}>
                {isPending ? 'Adding…' : 'Add member'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

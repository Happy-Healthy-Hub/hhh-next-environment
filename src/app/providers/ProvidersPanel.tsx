'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FilterBar } from '../components/FilterBar';
import { setProviderVerificationAction } from './actions';

// Client-safe copies — see IncidentsPanel for the rationale.
export interface ApiProviderOrganization {
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
const PROVIDER_VERIFICATION_STATUSES = [
  'pending',
  'under_review',
  'verified',
  'rejected',
  'suspended',
] as const;
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

const CATEGORY_LABEL: Record<string, string> = {
  clinic: 'Clinic',
  hospital: 'Hospital',
  diagnostic: 'Diagnostic',
  physiotherapy: 'Physiotherapy',
  specialist: 'Specialist',
  other: 'Other',
};

export function ProvidersPanel({
  organizations,
  isAdministrator,
}: {
  organizations: ApiProviderOrganization[];
  isAdministrator: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((o) =>
      [o.display_name, o.legal_name, CATEGORY_LABEL[o.category] ?? o.category, o.city ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [organizations, query]);

  function handleVerificationChange(
    org: ApiProviderOrganization,
    nextStatus: ProviderVerificationStatus
  ) {
    startTransition(async () => {
      const result = await setProviderVerificationAction(org.id, nextStatus, null);
      if (!result.ok) {
        setBanner({ tone: 'error', message: result.message ?? 'Something went wrong.' });
        return;
      }
      setBanner({
        tone: 'success',
        message: `${org.display_name} marked ${VERIFICATION_LABEL[nextStatus] ?? nextStatus}.`,
      });
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

      <FilterBar
        value={query}
        onChange={setQuery}
        placeholder="Search by name, category or city"
        resultCount={filtered.length}
        totalCount={organizations.length}
      />

      {!isAdministrator && (
        <p style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginBottom: 'var(--hhh-space-md)' }}>
          You can view provider organisations here. Only administrators can change a provider's verification status.
        </p>
      )}

      <div className="hhh-panel" style={{ overflowX: 'auto' }}>
        <table className="hhh-data-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Category</th>
              <th>Location</th>
              <th>Registered</th>
              <th>Verification</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((org) => (
              <tr key={org.id} onClick={() => router.push(`/providers/${org.id}`)} style={{ cursor: 'pointer' }} role="link">
                <td data-label="Provider">
                  <a href={`/providers/${org.id}`} onClick={(e) => e.preventDefault()} style={{ color: 'inherit', textDecoration: 'none' }}>
                    <div style={{ fontWeight: 600 }}>{org.display_name}</div>
                    <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem' }}>
                      {org.legal_name}
                    </div>
                  </a>
                </td>
                <td data-label="Category">{CATEGORY_LABEL[org.category] ?? org.category}</td>
                <td data-label="Location">
                  {[org.city, org.state_region].filter(Boolean).join(', ') || '—'}
                </td>
                <td data-label="Registered">
                  {new Date(org.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </td>
                <td data-label="Verification" onClick={(e) => e.stopPropagation()}>
                  {isAdministrator ? (
                    <select
                      className="hhh-status-select"
                      aria-label={`Verification for ${org.display_name}`}
                      value={org.verification_status}
                      disabled={isPending}
                      onChange={(e) =>
                        handleVerificationChange(org, e.target.value as ProviderVerificationStatus)
                      }
                    >
                      {PROVIDER_VERIFICATION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {VERIFICATION_LABEL[s] ?? s}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <span
                    className={`hhh-badge ${VERIFICATION_BADGE[org.verification_status] ?? 'hhh-badge--neutral'}`}
                    style={{ marginLeft: isAdministrator ? 8 : 0 }}
                  >
                    {VERIFICATION_LABEL[org.verification_status] ?? org.verification_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

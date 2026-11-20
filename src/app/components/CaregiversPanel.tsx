'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FilterBar } from './FilterBar';
import { EmptyState } from './EmptyState';
import { Modal } from './Modal';
import { createCaregiverAction, setCaregiverStatusAction } from '@/app/workers/actions';
import {
  CAREGIVER_STATUSES,
  CAREGIVER_STATUS_BADGE_CLASS,
  CAREGIVER_STATUS_LABELS,
  type Caregiver,
  type CaregiverStatus,
} from '@/lib/caregivers';

export function CaregiversPanel({ caregivers }: { caregivers: Caregiver[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return caregivers;
    return caregivers.filter((c) =>
      [c.publicDisplayName, CAREGIVER_STATUS_LABELS[c.status]].join(' ').toLowerCase().includes(q)
    );
  }, [caregivers, query]);

  function handleStatusChange(caregiver: Caregiver, status: CaregiverStatus) {
    startTransition(async () => {
      const result = await setCaregiverStatusAction(caregiver.id, status);
      if (!result.ok) {
        setBanner({ tone: 'error', message: result.message ?? 'Something went wrong.' });
        return;
      }
      setBanner(null);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--hhh-space-md)', flexWrap: 'wrap', marginBottom: 'var(--hhh-space-sm)' }}>
        <FilterBar value={query} onChange={setQuery} placeholder="Search caregivers by name or status" resultCount={filtered.length} totalCount={caregivers.length} />
        <button type="button" className="hhh-button-primary" onClick={() => setAdding(true)}>
          Add caregiver
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={caregivers.length === 0 ? 'No caregivers yet' : 'No matching caregivers'}
          message={caregivers.length === 0 ? 'Caregivers added here appear in this list.' : 'Try a different name or status.'}
        />
      ) : (
        <div className="hhh-panel" style={{ overflowX: 'auto' }}>
          <table className="hhh-data-table">
            <thead>
              <tr>
                <th>Caregiver</th>
                <th>Added</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((caregiver) => (
                <tr key={caregiver.id} onClick={() => router.push(`/workers/${caregiver.id}`)} style={{ cursor: 'pointer' }} role="link">
                  <td data-label="Caregiver">
                    <a href={`/workers/${caregiver.id}`} onClick={(e) => e.preventDefault()} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                      {caregiver.publicDisplayName}
                    </a>
                  </td>
                  <td data-label="Added">{new Date(caregiver.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                  <td data-label="Status">
                    <select
                      className="hhh-status-select"
                      aria-label={`Status for ${caregiver.publicDisplayName}`}
                      value={caregiver.status}
                      disabled={isPending}
                      onChange={(e) => handleStatusChange(caregiver, e.target.value as CaregiverStatus)}
                    >
                      {CAREGIVER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {CAREGIVER_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    <span className={`hhh-badge ${CAREGIVER_STATUS_BADGE_CLASS[caregiver.status]}`} style={{ marginLeft: 8 }}>
                      {CAREGIVER_STATUS_LABELS[caregiver.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem' }}>
        Skills, qualifications, languages and documents are not shown here yet -- no such columns exist on
        the caregiver record today. See OPERATIONS_API_REQUIREMENTS.md.
      </p>

      {adding && (
        <AddCaregiverDialog
          onClose={() => setAdding(false)}
          onCreated={(message) => {
            setAdding(false);
            setBanner({ tone: 'success', message });
            router.refresh();
          }}
          onError={(message) => setBanner({ tone: 'error', message })}
        />
      )}
    </div>
  );
}

function AddCaregiverDialog({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [profileId, setProfileId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profileId.trim() || !displayName.trim()) {
      setFieldError('Both fields are required.');
      return;
    }
    setFieldError(null);
    startTransition(async () => {
      const result = await createCaregiverAction(profileId.trim(), displayName.trim());
      if (!result.ok) {
        const message = result.message ?? 'Something went wrong.';
        setFieldError(message);
        onError(message);
        return;
      }
      onCreated(`${displayName.trim()} was added as a caregiver.`);
    });
  }

  return (
    <Modal title="Add caregiver" onClose={onClose}>
      <form onSubmit={handleSubmit} className="hhh-form-grid">
        {fieldError && (
          <div role="alert" className="hhh-inline-alert">
            {fieldError}
          </div>
        )}
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--hhh-secondary-text)' }}>
          The person must have signed in to the Happy Healthy Hub app at least once (so their account
          exists) before they can be added here. This portal cannot look up an account by email yet -- you
          need their profile id. See OPERATIONS_API_REQUIREMENTS.md for the lookup capability a future API
          should add.
        </p>
        <div>
          <label className="hhh-field-label" htmlFor="new-caregiver-profile-id">
            Profile id
          </label>
          <input id="new-caregiver-profile-id" className="hhh-text-field" required value={profileId} onChange={(e) => setProfileId(e.target.value)} disabled={isPending} placeholder="UUID" />
        </div>
        <div>
          <label className="hhh-field-label" htmlFor="new-caregiver-name">
            Display name
          </label>
          <input id="new-caregiver-name" className="hhh-text-field" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={isPending} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--hhh-space-sm)', justifyContent: 'flex-end' }}>
          <button type="button" className="hhh-button-outlined" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button type="submit" className="hhh-button-primary" disabled={isPending}>
            {isPending ? 'Saving…' : 'Add caregiver'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

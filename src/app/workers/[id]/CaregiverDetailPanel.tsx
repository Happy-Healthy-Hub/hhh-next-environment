'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setCaregiverStatusAction } from '../actions';
import {
  CAREGIVER_STATUSES,
  CAREGIVER_STATUS_LABELS,
  type CaregiverDetail,
  type CaregiverStatus,
} from '@/lib/caregivers';
import type { CaregiverDocument } from '@/lib/api/documents';
import type { AvailabilitySlot, UnavailabilityRange } from '@/lib/api/availability';
import { WEEKDAY_LABELS } from '@/lib/weekday-labels';

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--hhh-space-md)', padding: '8px 0', borderBottom: '1px solid var(--hhh-border)' }}>
      <span style={{ minWidth: 140, color: 'var(--hhh-secondary-text)', fontWeight: 600, fontSize: '0.85rem' }}>{label}</span>
      <span style={{ flex: 1 }}>{value || '—'}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

const ASSIGNMENT_STATUS_BADGE: Record<string, string> = {
  pending: 'hhh-badge--attention',
  accepted: 'hhh-badge--positive',
  active: 'hhh-badge--positive',
  declined: 'hhh-badge--critical',
  ended: 'hhh-badge--neutral',
};

const VISIT_STATUS_BADGE: Record<string, string> = {
  scheduled: 'hhh-badge--neutral',
  checked_in: 'hhh-badge--attention',
  checked_out: 'hhh-badge--attention',
  completed: 'hhh-badge--positive',
  cancelled: 'hhh-badge--neutral',
  missed: 'hhh-badge--critical',
};

const VERIFICATION_BADGE: Record<string, string> = {
  pending: 'hhh-badge--attention',
  verified: 'hhh-badge--positive',
  rejected: 'hhh-badge--critical',
  expired: 'hhh-badge--neutral',
};

export function CaregiverDetailPanel({
  caregiver,
  documents = [],
  availabilitySlots = [],
  unavailability = [],
}: {
  caregiver: CaregiverDetail;
  documents?: CaregiverDocument[];
  availabilitySlots?: AvailabilitySlot[];
  unavailability?: UnavailabilityRange[];
}) {
  const router = useRouter();
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'visits' | 'documents' | 'availability'>('overview');

  function handleStatusChange(status: CaregiverStatus) {
    startTransition(async () => {
      const result = await setCaregiverStatusAction(caregiver.id, status);
      if (!result.ok) {
        setBanner({ tone: 'error', message: result.message ?? 'Something went wrong.' });
        return;
      }
      setBanner({ tone: 'success', message: `Status changed to ${CAREGIVER_STATUS_LABELS[status]}.` });
      router.refresh();
    });
  }

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'assignments' as const, label: 'Assignments' },
    { key: 'visits' as const, label: 'Visits' },
    { key: 'documents' as const, label: `Documents (${documents.length})` },
    { key: 'availability' as const, label: 'Availability' },
  ];

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

      <div style={{ display: 'flex', gap: 'var(--hhh-space-xs)', marginBottom: 'var(--hhh-space-lg)', borderBottom: '2px solid var(--hhh-border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 16px',
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? 'var(--hhh-dark-teal)' : 'var(--hhh-secondary-text)',
              borderBottom: activeTab === tab.key ? '2px solid var(--hhh-dark-teal)' : '2px solid transparent',
              marginBottom: '-2px',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: 'var(--hhh-space-lg)', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <div className="hhh-card">
            <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>Caregiver information</h3>
            <InfoRow label="Display name" value={caregiver.publicDisplayName} />
            <InfoRow label="Profile ID" value={caregiver.profileId ?? 'Not linked to an app account'} />
            <InfoRow label="Status" value={CAREGIVER_STATUS_LABELS[caregiver.status]} />
            <InfoRow label="Added" value={formatDate(caregiver.createdAt)} />
          </div>

          <div className="hhh-card">
            <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>Actions</h3>
            <div style={{ marginBottom: 'var(--hhh-space-md)' }}>
              <label className="hhh-field-label" htmlFor="caregiver-status">Change status</label>
              <select
                id="caregiver-status"
                className="hhh-status-select"
                value={caregiver.status}
                disabled={isPending}
                onChange={(e) => handleStatusChange(e.target.value as CaregiverStatus)}
              >
                {CAREGIVER_STATUSES.map((s) => (
                  <option key={s} value={s}>{CAREGIVER_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gap: 'var(--hhh-space-sm)', marginTop: 'var(--hhh-space-md)' }}>
              <div style={{ padding: 'var(--hhh-space-md)', background: 'var(--hhh-neutral-surface)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--hhh-secondary-text)', fontWeight: 600 }}>Assignments</div>
                <div style={{ fontWeight: 700 }}>{caregiver.assignments.length}</div>
              </div>
              <div style={{ padding: 'var(--hhh-space-md)', background: 'var(--hhh-neutral-surface)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--hhh-secondary-text)', fontWeight: 600 }}>Recent visits</div>
                <div style={{ fontWeight: 700 }}>{caregiver.recentVisits.length}</div>
              </div>
            </div>
            <p style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', margin: 'var(--hhh-space-md) 0 0' }}>
              Skills, qualifications and languages are not shown here yet — no such columns
              exist on the caregiver record today. Documents and availability are on their own tabs.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="hhh-card">
          <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>
            Assignments
            {caregiver.assignments.length > 0 && (
              <span style={{ fontWeight: 400, color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginLeft: 8 }}>
                ({caregiver.assignments.length})
              </span>
            )}
          </h3>
          {caregiver.assignments.length === 0 ? (
            <p style={{ color: 'var(--hhh-secondary-text)', margin: 0 }}>No assignments found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="hhh-data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Assigned</th>
                    <th>Ended</th>
                  </tr>
                </thead>
                <tbody>
                  {caregiver.assignments.map((a) => (
                    <tr key={a.id}>
                      <td data-label="Customer">{a.customerName}</td>
                      <td data-label="Status">
                        <span className={`hhh-badge ${ASSIGNMENT_STATUS_BADGE[a.status] ?? 'hhh-badge--neutral'}`}>
                          {a.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td data-label="Assigned">{a.assignedAt ? formatDate(a.assignedAt) : '—'}</td>
                      <td data-label="Ended">{a.endedAt ? formatDate(a.endedAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'visits' && (
        <div className="hhh-card">
          <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>
            Recent visits
            {caregiver.recentVisits.length > 0 && (
              <span style={{ fontWeight: 400, color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginLeft: 8 }}>
                ({caregiver.recentVisits.length})
              </span>
            )}
          </h3>
          {caregiver.recentVisits.length === 0 ? (
            <p style={{ color: 'var(--hhh-secondary-text)', margin: 0 }}>No visits found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="hhh-data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Scheduled</th>
                    <th>Check in</th>
                    <th>Check out</th>
                  </tr>
                </thead>
                <tbody>
                  {caregiver.recentVisits.map((v) => (
                    <tr key={v.id}>
                      <td data-label="Customer">{v.customerName}</td>
                      <td data-label="Status">
                        <span className={`hhh-badge ${VISIT_STATUS_BADGE[v.status] ?? 'hhh-badge--neutral'}`}>
                          {v.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td data-label="Scheduled">{v.scheduledStart ? formatDateTime(v.scheduledStart) : '—'}</td>
                      <td data-label="Check in">{v.checkedInAt ? formatDateTime(v.checkedInAt) : '—'}</td>
                      <td data-label="Check out">{v.checkedOutAt ? formatDateTime(v.checkedOutAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="hhh-card">
          <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>
            Documents &amp; qualifications
            {documents.length > 0 && (
              <span style={{ fontWeight: 400, color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginLeft: 8 }}>
                ({documents.length})
              </span>
            )}
          </h3>
          {documents.length === 0 ? (
            <p style={{ color: 'var(--hhh-secondary-text)', margin: 0 }}>No documents uploaded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="hhh-data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Uploaded</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td data-label="Title">{doc.title}</td>
                      <td data-label="Type">{doc.document_type.replace(/_/g, ' ')}</td>
                      <td data-label="Status">
                        <span className={`hhh-badge ${VERIFICATION_BADGE[doc.verification_status] ?? 'hhh-badge--neutral'}`}>
                          {doc.verification_status}
                        </span>
                      </td>
                      <td data-label="Uploaded">{formatDate(doc.created_at)}</td>
                      <td data-label="Expires">{doc.expires_on ? formatDate(doc.expires_on) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'availability' && (
        <div style={{ display: 'grid', gap: 'var(--hhh-space-lg)', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <div className="hhh-card">
            <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>Weekly availability</h3>
            {availabilitySlots.length === 0 ? (
              <p style={{ color: 'var(--hhh-secondary-text)', margin: 0 }}>No regular availability set.</p>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--hhh-space-sm)' }}>
                {availabilitySlots.map((slot) => (
                  <div key={slot.id} style={{ padding: '8px 12px', background: 'var(--hhh-neutral-surface)', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{WEEKDAY_LABELS[slot.weekday] ?? `Day ${slot.weekday}`}</span>
                    <span style={{ color: 'var(--hhh-secondary-text)' }}>{slot.start_time} – {slot.end_time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hhh-card">
            <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>Unavailability</h3>
            {unavailability.length === 0 ? (
              <p style={{ color: 'var(--hhh-secondary-text)', margin: 0 }}>No upcoming unavailability.</p>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--hhh-space-sm)' }}>
                {unavailability.map((u) => (
                  <div key={u.id} style={{ padding: '8px 12px', background: 'var(--hhh-neutral-surface)', borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600 }}>{formatDate(u.starts_at)} – {formatDate(u.ends_at)}</span>
                    </div>
                    {u.reason && <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginTop: 4 }}>{u.reason}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

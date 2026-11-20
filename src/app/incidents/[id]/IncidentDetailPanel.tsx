'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setIncidentStatusAction } from '../actions';

export interface Incident {
  id: string;
  incident_number: string;
  category: string;
  severity: string;
  status: string;
  customer_id: string | null;
  care_associate_id: string | null;
  visit_id: string | null;
  care_request_id: string | null;
  description: string;
  occurred_at: string | null;
  created_at: string;
}

const INCIDENT_STATUSES = ['open', 'under_review', 'escalated', 'resolved', 'closed'] as const;
type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  under_review: 'Under review',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_BADGE: Record<string, string> = {
  open: 'hhh-badge--attention',
  under_review: 'hhh-badge--attention',
  escalated: 'hhh-badge--critical',
  resolved: 'hhh-badge--positive',
  closed: 'hhh-badge--neutral',
};

const SEVERITY_BADGE: Record<string, string> = {
  low: 'hhh-badge--neutral',
  medium: 'hhh-badge--attention',
  high: 'hhh-badge--attention',
  critical: 'hhh-badge--critical',
};

const CATEGORY_LABEL: Record<string, string> = {
  medical: 'Medical',
  safety: 'Safety',
  behavioural: 'Behavioural',
  medication: 'Medication',
  fall: 'Fall',
  equipment: 'Equipment',
  conduct: 'Conduct',
  property: 'Property',
  other: 'Other',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function IncidentDetailPanel({ incident }: { incident: Incident }) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [nextStatus, setNextStatus] = useState<IncidentStatus>(incident.status as IncidentStatus);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = notes.trim() || null;
    startTransition(async () => {
      const result = await setIncidentStatusAction(incident.id, nextStatus, trimmed);
      if (!result.ok) {
        setBanner({ tone: 'error', message: result.message ?? 'Something went wrong.' });
        return;
      }
      setBanner({
        tone: 'success',
        message: `Status changed to ${STATUS_LABEL[nextStatus] ?? nextStatus}.`,
      });
      setNotes('');
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
            <div style={{ fontSize: '0.85rem', color: 'var(--hhh-secondary-text)', fontWeight: 600 }}>
              {incident.incident_number}
            </div>
            <h2 style={{ margin: '4px 0 0' }}>
              {CATEGORY_LABEL[incident.category] ?? incident.category} incident
            </h2>
            <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginTop: 4 }}>
              Reported {formatDateTime(incident.created_at)}
              {incident.occurred_at && <> · occurred {formatDateTime(incident.occurred_at)}</>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--hhh-space-sm)', flexWrap: 'wrap' }}>
            <span className={`hhh-badge ${SEVERITY_BADGE[incident.severity] ?? 'hhh-badge--neutral'}`}>
              {incident.severity}
            </span>
            <span className={`hhh-badge ${STATUS_BADGE[incident.status] ?? 'hhh-badge--neutral'}`}>
              {STATUS_LABEL[incident.status] ?? incident.status}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 'var(--hhh-space-md)', padding: 'var(--hhh-space-md)', background: 'var(--hhh-neutral-surface)', borderRadius: 8 }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--hhh-secondary-text)', fontWeight: 600, marginBottom: 4 }}>
            Description
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{incident.description}</div>
        </div>

        <div style={{ marginTop: 'var(--hhh-space-md)', display: 'grid', gap: 'var(--hhh-space-sm)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <Linked label="Customer" value={incident.customer_id} />
          <Linked label="Caregiver" value={incident.care_associate_id} />
          <Linked label="Visit" value={incident.visit_id} />
          <Linked label="Care request" value={incident.care_request_id} />
        </div>
      </div>

      <div className="hhh-card">
        <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>Update status</h3>
        <form onSubmit={handleApply} className="hhh-form-grid">
          <div>
            <label className="hhh-field-label" htmlFor="incident-next-status">New status</label>
            <select
              id="incident-next-status"
              className="hhh-status-select"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as IncidentStatus)}
              disabled={isPending}
            >
              {INCIDENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s] ?? s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="hhh-field-label" htmlFor="incident-notes">Resolution notes (optional)</label>
            <textarea
              id="incident-notes"
              className="hhh-text-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
    </div>
  );
}

function Linked({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ padding: 'var(--hhh-space-sm) var(--hhh-space-md)', background: 'var(--hhh-neutral-surface)', borderRadius: 8 }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--hhh-secondary-text)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>{value ?? '—'}</div>
    </div>
  );
}

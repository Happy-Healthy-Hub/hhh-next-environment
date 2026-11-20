'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FilterBar } from '../components/FilterBar';
import { setIncidentStatusAction } from './actions';

// Client-safe copies of the shared API types/constants. The real
// types live in @/lib/api/incidents, but importing them here would
// transitively pull in @/lib/supabase/server (next/headers) through
// the api client, which Next.js 16 rejects for a 'use client' module.
export interface ApiIncident {
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

const SEVERITY_BADGE: Record<string, string> = {
  low: 'hhh-badge--neutral',
  medium: 'hhh-badge--attention',
  high: 'hhh-badge--attention',
  critical: 'hhh-badge--critical',
};

const STATUS_BADGE: Record<string, string> = {
  open: 'hhh-badge--attention',
  under_review: 'hhh-badge--attention',
  escalated: 'hhh-badge--critical',
  resolved: 'hhh-badge--positive',
  closed: 'hhh-badge--neutral',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  under_review: 'Under review',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
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

export function IncidentsPanel({ incidents }: { incidents: ApiIncident[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return incidents;
    return incidents.filter((i) =>
      [i.incident_number, CATEGORY_LABEL[i.category] ?? i.category, STATUS_LABEL[i.status] ?? i.status, i.description]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [incidents, query]);

  function handleStatusChange(incident: ApiIncident, nextStatus: IncidentStatus) {
    startTransition(async () => {
      const result = await setIncidentStatusAction(incident.id, nextStatus, null);
      if (!result.ok) {
        setBanner({ tone: 'error', message: result.message ?? 'Something went wrong.' });
        return;
      }
      setBanner({ tone: 'success', message: `Incident ${incident.incident_number} marked ${STATUS_LABEL[nextStatus] ?? nextStatus}.` });
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
        placeholder="Search by number, category or description"
        resultCount={filtered.length}
        totalCount={incidents.length}
      />

      <div className="hhh-panel" style={{ overflowX: 'auto' }}>
        <table className="hhh-data-table">
          <thead>
            <tr>
              <th>Incident</th>
              <th>Category</th>
              <th>Severity</th>
              <th>Reported</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((incident) => (
              <tr key={incident.id} onClick={() => router.push(`/incidents/${incident.id}`)} style={{ cursor: 'pointer' }} role="link">
                <td data-label="Incident">
                  <a href={`/incidents/${incident.id}`} onClick={(e) => e.preventDefault()} style={{ color: 'inherit', textDecoration: 'none' }}>
                    <div style={{ fontWeight: 600 }}>{incident.incident_number}</div>
                    <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', maxWidth: 420, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {incident.description}
                    </div>
                  </a>
                </td>
                <td data-label="Category">{CATEGORY_LABEL[incident.category] ?? incident.category}</td>
                <td data-label="Severity">
                  <span className={`hhh-badge ${SEVERITY_BADGE[incident.severity] ?? 'hhh-badge--neutral'}`}>
                    {incident.severity}
                  </span>
                </td>
                <td data-label="Reported">
                  {new Date(incident.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </td>
                <td data-label="Status" onClick={(e) => e.stopPropagation()}>
                  <select
                    className="hhh-status-select"
                    aria-label={`Status for ${incident.incident_number}`}
                    value={incident.status}
                    disabled={isPending}
                    onChange={(e) => handleStatusChange(incident, e.target.value as IncidentStatus)}
                  >
                    {INCIDENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s] ?? s}
                      </option>
                    ))}
                  </select>
                  <span className={`hhh-badge ${STATUS_BADGE[incident.status] ?? 'hhh-badge--neutral'}`} style={{ marginLeft: 8 }}>
                    {STATUS_LABEL[incident.status] ?? incident.status}
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

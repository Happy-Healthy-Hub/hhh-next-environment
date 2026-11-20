'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FilterBar } from '../components/FilterBar';
import { setTicketStatusAction } from './actions';

// Client-safe copies — see IncidentsPanel for the rationale.
export interface ApiTicketSummary {
  id: string;
  ticket_number: string;
  requester_profile_id: string;
  requester_role: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  assigned_to_profile_id: string | null;
  created_at: string;
  updated_at: string;
}
const TICKET_STATUSES = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'] as const;
type TicketStatus = (typeof TICKET_STATUSES)[number];

const STATUS_BADGE: Record<string, string> = {
  open: 'hhh-badge--attention',
  in_progress: 'hhh-badge--attention',
  waiting_customer: 'hhh-badge--neutral',
  resolved: 'hhh-badge--positive',
  closed: 'hhh-badge--neutral',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_customer: 'Waiting on customer',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'hhh-badge--neutral',
  normal: 'hhh-badge--neutral',
  high: 'hhh-badge--attention',
  urgent: 'hhh-badge--critical',
};

export function TicketsPanel({ tickets }: { tickets: ApiTicketSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t) =>
      [t.ticket_number, t.subject, t.category, STATUS_LABEL[t.status] ?? t.status]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [tickets, query]);

  function handleStatusChange(ticket: ApiTicketSummary, nextStatus: TicketStatus) {
    startTransition(async () => {
      const result = await setTicketStatusAction(ticket.id, nextStatus);
      if (!result.ok) {
        setBanner({ tone: 'error', message: result.message ?? 'Something went wrong.' });
        return;
      }
      setBanner({ tone: 'success', message: `${ticket.ticket_number} marked ${STATUS_LABEL[nextStatus] ?? nextStatus}.` });
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
        placeholder="Search by ticket number, subject or category"
        resultCount={filtered.length}
        totalCount={tickets.length}
      />

      <div className="hhh-panel" style={{ overflowX: 'auto' }}>
        <table className="hhh-data-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Raised</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ticket) => (
              <tr key={ticket.id} onClick={() => router.push(`/tickets/${ticket.id}`)} style={{ cursor: 'pointer' }} role="link">
                <td data-label="Ticket">
                  <a href={`/tickets/${ticket.id}`} onClick={(e) => e.preventDefault()} style={{ color: 'inherit', textDecoration: 'none' }}>
                    <div style={{ fontWeight: 600 }}>{ticket.ticket_number}</div>
                    <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', maxWidth: 420, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ticket.subject}
                    </div>
                  </a>
                </td>
                <td data-label="Category" style={{ textTransform: 'capitalize' }}>
                  {ticket.category.replace(/_/g, ' ')}
                </td>
                <td data-label="Priority">
                  <span className={`hhh-badge ${PRIORITY_BADGE[ticket.priority] ?? 'hhh-badge--neutral'}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td data-label="Raised">
                  {new Date(ticket.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </td>
                <td data-label="Status" onClick={(e) => e.stopPropagation()}>
                  <select
                    className="hhh-status-select"
                    aria-label={`Status for ${ticket.ticket_number}`}
                    value={ticket.status}
                    disabled={isPending}
                    onChange={(e) => handleStatusChange(ticket, e.target.value as TicketStatus)}
                  >
                    {TICKET_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s] ?? s}
                      </option>
                    ))}
                  </select>
                  <span className={`hhh-badge ${STATUS_BADGE[ticket.status] ?? 'hhh-badge--neutral'}`} style={{ marginLeft: 8 }}>
                    {STATUS_LABEL[ticket.status] ?? ticket.status}
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

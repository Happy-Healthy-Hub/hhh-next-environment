'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addTicketMessageAction, setTicketStatusForDetailAction } from './actions';

export interface TicketDetail {
  id: string;
  ticket_number: string;
  requester_profile_id: string;
  requester_role: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  assigned_to_profile_id: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_profile_id: string;
  author_role: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

const TICKET_STATUSES = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'] as const;
type TicketStatus = (typeof TICKET_STATUSES)[number];

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_customer: 'Waiting on customer',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_BADGE: Record<string, string> = {
  open: 'hhh-badge--attention',
  in_progress: 'hhh-badge--attention',
  waiting_customer: 'hhh-badge--neutral',
  resolved: 'hhh-badge--positive',
  closed: 'hhh-badge--neutral',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'hhh-badge--neutral',
  normal: 'hhh-badge--neutral',
  high: 'hhh-badge--attention',
  urgent: 'hhh-badge--critical',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function TicketDetailPanel({
  ticket,
  initialMessages,
}: {
  ticket: TicketDetail;
  initialMessages: TicketMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(nextStatus: TicketStatus) {
    startTransition(async () => {
      const result = await setTicketStatusForDetailAction(ticket.id, nextStatus);
      if (!result.ok) {
        setBanner({ tone: 'error', message: result.message ?? 'Something went wrong.' });
        return;
      }
      setBanner({ tone: 'success', message: `Status changed to ${STATUS_LABEL[nextStatus] ?? nextStatus}.` });
      router.refresh();
    });
  }

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      setBanner({ tone: 'error', message: 'Please write a message before sending.' });
      return;
    }
    startTransition(async () => {
      const result = await addTicketMessageAction(ticket.id, trimmed, isInternal);
      if (!result.ok) {
        setBanner({ tone: 'error', message: result.message ?? 'Something went wrong.' });
        return;
      }
      // Optimistic append -- the server also revalidates the route so
      // a reload shows the canonical list, with its real id.
      setMessages((prev) => [
        ...prev,
        {
          id: 'local-' + Date.now(),
          ticket_id: ticket.id,
          author_profile_id: '',
          author_role: 'care_staff',
          body: trimmed,
          is_internal: isInternal,
          created_at: new Date().toISOString(),
        },
      ]);
      setBody('');
      setIsInternal(false);
      setBanner({ tone: 'success', message: isInternal ? 'Internal note added.' : 'Reply sent.' });
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
              {ticket.ticket_number}
            </div>
            <h2 style={{ margin: '4px 0 0' }}>{ticket.subject}</h2>
            <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginTop: 4 }}>
              {ticket.category.replace(/_/g, ' ')} · raised {formatDateTime(ticket.created_at)} by {ticket.requester_role}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--hhh-space-sm)', flexWrap: 'wrap' }}>
            <span className={`hhh-badge ${PRIORITY_BADGE[ticket.priority] ?? 'hhh-badge--neutral'}`}>
              {ticket.priority}
            </span>
            <select
              className="hhh-status-select"
              aria-label="Change ticket status"
              value={ticket.status}
              disabled={isPending}
              onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
            >
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s] ?? s}
                </option>
              ))}
            </select>
            <span className={`hhh-badge ${STATUS_BADGE[ticket.status] ?? 'hhh-badge--neutral'}`}>
              {STATUS_LABEL[ticket.status] ?? ticket.status}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 'var(--hhh-space-md)', padding: 'var(--hhh-space-md)', background: 'var(--hhh-neutral-surface)', borderRadius: 8 }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--hhh-secondary-text)', fontWeight: 600, marginBottom: 4 }}>
            Original description
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{ticket.description}</div>
        </div>
      </div>

      <div className="hhh-card" style={{ marginBottom: 'var(--hhh-space-lg)' }}>
        <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>
          Conversation
          <span style={{ fontWeight: 400, color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginLeft: 8 }}>
            ({messages.length})
          </span>
        </h3>

        {messages.length === 0 ? (
          <p style={{ color: 'var(--hhh-secondary-text)', margin: 0 }}>No replies yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--hhh-space-md)' }}>
            {messages.map((m) => (
              <li
                key={m.id}
                style={{
                  padding: 'var(--hhh-space-md)',
                  background: m.is_internal ? 'var(--hhh-soft-peach-tint, #FDF3EE)' : 'var(--hhh-neutral-surface)',
                  borderRadius: 8,
                  borderLeft: m.is_internal ? '3px solid #B3561E' : '3px solid var(--hhh-dark-teal)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--hhh-space-sm)', fontSize: '0.85rem', color: 'var(--hhh-secondary-text)', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>
                    {m.author_role.replace(/_/g, ' ')}
                    {m.is_internal && <span style={{ marginLeft: 8, color: '#B3561E' }}>· internal note</span>}
                  </span>
                  <span>{formatDateTime(m.created_at)}</span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="hhh-card">
        <h3 style={{ margin: '0 0 var(--hhh-space-md)' }}>Reply</h3>
        <form onSubmit={handleSendMessage} className="hhh-form-grid">
          <textarea
            className="hhh-text-field"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a reply or an internal note…"
            rows={4}
            disabled={isPending}
            style={{ width: '100%', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--hhh-space-sm)', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                disabled={isPending}
              />
              Internal note (visible only to staff)
            </label>
            <button type="submit" className="hhh-button-primary" disabled={isPending || !body.trim()}>
              {isPending ? 'Sending…' : isInternal ? 'Add internal note' : 'Send reply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

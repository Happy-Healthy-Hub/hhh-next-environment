import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { apiListAuditLog } from '@/lib/api/staff';
import { AdminShell } from '../../components/AdminShell';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';

export const instant = false;

export default async function AuditLogPage() {
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isAdministrator) redirect('/not-authorized');

  let events;
  try {
    const apiEvents = await apiListAuditLog();
    events = apiEvents.map((e) => ({
      id: e.id,
      occurredAt: e.occurred_at,
      eventType: e.event_type,
      entityType: e.entity_type,
      entityId: e.entity_id,
    }));
  } catch (err) {
    console.error('Failed to load staff/audit-log:', err);
    return (
      <AdminShell title="Audit log" userEmail={session.email} isDemo={session.isDemo}>
        <ErrorState message="Something went wrong loading the audit log. Please try reloading the page." />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Audit log" userEmail={session.email} isDemo={session.isDemo}>
      <p style={{ color: 'var(--hhh-secondary-text)', marginTop: 0 }}>
        The most recent 100 recorded events, newest first. This log cannot be edited or deleted from this
        portal. Export is not built yet -- see OPERATIONS_API_REQUIREMENTS.md.
      </p>
      {events.length === 0 ? (
        <EmptyState title="No events yet" message="Important actions by staff will appear here." />
      ) : (
        <div className="hhh-panel" style={{ overflowX: 'auto' }}>
          <table className="hhh-data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Event</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td data-label="When">{new Date(event.occurredAt).toLocaleString('en-IN')}</td>
                  <td data-label="Event">{event.eventType}</td>
                  <td data-label="Entity">
                    {event.entityType ? `${event.entityType}${event.entityId ? ` · ${event.entityId.slice(0, 8)}…` : ''}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { apiGetTicket, apiListTicketMessages } from '@/lib/api/tickets';
import { ApiError } from '@/lib/api/client';
import { AdminShell } from '../../components/AdminShell';
import { ErrorState } from '../../components/ErrorState';
import { TicketDetailPanel } from './TicketDetailPanel';

export const instant = false;

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let ticket;
  let messages;
  try {
    [ticket, messages] = await Promise.all([apiGetTicket(id), apiListTicketMessages(id)]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return (
        <AdminShell title="Ticket" userEmail={session.email} isDemo={session.isDemo}>
          <div style={{ marginBottom: 'var(--hhh-space-md)' }}>
            <Link href="/tickets" style={{ color: 'var(--hhh-dark-teal)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
              ← Back to tickets
            </Link>
          </div>
          <div className="hhh-empty-state">This ticket could not be found.</div>
        </AdminShell>
      );
    }
    const message =
      err instanceof ApiError && err.status === 401
        ? 'Your session has expired. Please sign in again.'
        : 'Something went wrong loading this ticket.';
    return (
      <AdminShell title="Ticket" userEmail={session.email} isDemo={session.isDemo}>
        <ErrorState message={message} />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Ticket" userEmail={session.email} isDemo={session.isDemo}>
      <div style={{ marginBottom: 'var(--hhh-space-md)' }}>
        <Link href="/tickets" style={{ color: 'var(--hhh-dark-teal)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to tickets
        </Link>
      </div>
      <TicketDetailPanel ticket={ticket} initialMessages={messages} />
    </AdminShell>
  );
}

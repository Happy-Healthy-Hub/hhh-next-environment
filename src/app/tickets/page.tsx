import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { apiListTickets } from '@/lib/api/tickets';
import { ApiError } from '@/lib/api/client';
import { AdminShell } from '../components/AdminShell';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { TicketsPanel } from './TicketsPanel';

export const instant = false;

/**
 * Support ticket list for Operations staff. Reads via FastAPI
 * `/tickets`, which RLS-filters to tickets the caller may read
 * (staff see everything).
 */
export default async function TicketsPage() {
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let tickets;
  try {
    tickets = await apiListTickets();
  } catch (err) {
    const message =
      err instanceof ApiError && err.status === 401
        ? 'Your session has expired. Please sign in again.'
        : 'Something went wrong loading tickets. Please try reloading the page.';
    return (
      <AdminShell title="Support Tickets" userEmail={session.email} isDemo={session.isDemo}>
        <ErrorState message={message} />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Support Tickets" userEmail={session.email} isDemo={session.isDemo}>
      {tickets.length === 0 ? (
        <EmptyState
          title="No tickets yet"
          message="Tickets raised by customers, caregivers or staff appear here."
        />
      ) : (
        <TicketsPanel tickets={tickets} />
      )}
    </AdminShell>
  );
}

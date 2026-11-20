import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import {
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_STATUS_BADGE_CLASS,
  isOpenAssignment,
  fetchAssignments,
  fetchApprovedRequestsAwaitingCaregiver,
  parseAssignment,
} from '@/lib/assignments';
import { AdminShell } from '../components/AdminShell';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';

export const instant = false;

/**
 * Assignments (AD51-57). "Awaiting a caregiver" is every `approved` care
 * request with no open (`assigned`/`accepted`) assignment -- computed
 * client-side from two real queries, not a new database view. Matching a
 * caregiver to a request is a human choice here; there is no automatic
 * matching or scoring, per the approved design.
 */
export default async function AssignmentsPage() {
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let assignments, allApproved;
  try {
    [allApproved, assignments] = await Promise.all([fetchApprovedRequestsAwaitingCaregiver(supabase), fetchAssignments(supabase)]);
  } catch (err) {
    console.error('Failed to load assignments:', err);
    return (
      <AdminShell title="Assignments" userEmail={session.email} isDemo={session.isDemo}>
        <ErrorState message="Something went wrong loading assignments. Please try reloading the page." />
      </AdminShell>
    );
  }

  const openRequestIds = new Set(
    assignments.filter((a) => isOpenAssignment(a.status)).map((a) => a.careRequestId)
  );
  const awaiting = allApproved.filter((r) => !openRequestIds.has(r.id));
  const open = assignments.filter((a) => isOpenAssignment(a.status));
  const closed = assignments.filter((a) => !isOpenAssignment(a.status));

  return (
    <AdminShell title="Assignments" userEmail={session.email} isDemo={session.isDemo}>
      <div className="hhh-fade-in">
        <section style={{ marginBottom: 'var(--hhh-space-xl)' }}>
          <h2 style={{ fontSize: '1.1rem' }}>Awaiting a caregiver ({awaiting.length})</h2>
          {awaiting.length === 0 ? (
            <EmptyState title="Nothing waiting" message="Every approved request already has a caregiver." />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--hhh-space-sm)' }}>
              {awaiting.map((request) => {
                const customer = Array.isArray(request.customers) ? request.customers[0] : request.customers;
                return (
                  <li key={request.id}>
                    <Link href={`/assignments/${request.id}`} className="hhh-card" style={cardLinkStyle}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{customer?.full_name ?? 'Unknown customer'}</div>
                        <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>
                          Preferred start {request.preferred_start_date}
                        </div>
                      </div>
                      <span className="hhh-button-small">Assign caregiver</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section style={{ marginBottom: 'var(--hhh-space-xl)' }}>
          <h2 style={{ fontSize: '1.1rem' }}>Assigned ({open.length})</h2>
          {open.length === 0 ? (
            <EmptyState title="No open assignments" />
          ) : (
            <AssignmentList assignments={open} />
          )}
        </section>

        <section>
          <h2 style={{ fontSize: '1.1rem' }}>History ({closed.length})</h2>
          {closed.length === 0 ? (
            <EmptyState title="No assignment history yet" />
          ) : (
            <AssignmentList assignments={closed} />
          )}
        </section>
      </div>
    </AdminShell>
  );
}

const cardLinkStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 'var(--hhh-space-md)',
  textDecoration: 'none',
  color: 'inherit',
  flexWrap: 'wrap',
};

function AssignmentList({ assignments }: { assignments: ReturnType<typeof parseAssignment>[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--hhh-space-sm)' }}>
      {assignments.map((a) => (
        <li key={a.id}>
          <Link href={`/assignments/${a.careRequestId}`} className="hhh-card" style={cardLinkStyle}>
            <div>
              <div style={{ fontWeight: 600 }}>{a.request?.customerName ?? 'Unknown customer'}</div>
              <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>
                {a.caregiverName} · {a.request?.services.join(', ') || 'No services'}
              </div>
            </div>
            <span className={`hhh-badge ${ASSIGNMENT_STATUS_BADGE_CLASS[a.status]}`}>
              {ASSIGNMENT_STATUS_LABELS[a.status]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

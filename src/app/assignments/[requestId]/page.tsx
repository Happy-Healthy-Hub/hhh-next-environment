import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { isOpenAssignment, fetchAssignmentsForRequest } from '@/lib/assignments';
import { fetchActiveCaregivers } from '@/lib/caregivers';
import { fetchCareRequest } from '@/lib/care-requests';
import { AdminShell } from '../../components/AdminShell';
import { ErrorState } from '../../components/ErrorState';
import { AssignmentDetail } from '../../components/AssignmentDetail';

export const instant = false;

/**
 * Choose a caregiver for one request (AD52-54), or view/reassign/withdraw
 * its current open assignment (AD55-56). "Eligible caregivers" is every
 * active caregiver account -- the approved design is explicit that there
 * is no matching, scoring or caseload filter.
 */
export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let request, assignments, caregivers;
  try {
    [request, assignments, caregivers] = await Promise.all([
      fetchCareRequest(supabase, requestId),
      fetchAssignmentsForRequest(supabase, requestId),
      fetchActiveCaregivers(supabase),
    ]);
  } catch (err) {
    console.error('Failed to load assignments/[requestId]:', err);
    return (
      <AdminShell title="Assignment" userEmail={session.email} isDemo={session.isDemo}>
        <ErrorState message="Something went wrong loading this request. Please try reloading the page." />
      </AdminShell>
    );
  }
  if (!request) notFound();

  const openAssignment = assignments.find((a) => isOpenAssignment(a.status)) ?? null;

  return (
    <AdminShell title={`Assignment · ${request.customer.fullName}`} userEmail={session.email} isDemo={session.isDemo}>
      <AssignmentDetail
        requestId={request.id}
        requestStatus={request.status}
        customerName={request.customer.fullName}
        preferredStartDate={request.preferredStartDate}
        services={request.items.map((i) => i.serviceName)}
        openAssignment={openAssignment}
        history={assignments.filter((a) => !isOpenAssignment(a.status))}
        eligibleCaregivers={caregivers}
      />
    </AdminShell>
  );
}

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { CARE_REQUEST_STATUSES, STATUS_LABELS, type CareRequestStatus } from '@/lib/care-requests';
import { apiListCareRequests } from '@/lib/api/care-requests';
import { apiListCustomers } from '@/lib/api/customers';
import { apiListCaregivers } from '@/lib/api/caregivers';
import { apiListVisits } from '@/lib/api/visits';
import { AdminShell } from '../components/AdminShell';
import { MetricCard } from '../components/MetricCard';
import { ErrorState } from '../components/ErrorState';
import { BarChart } from '../components/charts/BarChart';
import { ActivityChart } from '../components/charts/ActivityChart';

export const instant = false;

const STATUS_TONE: Record<CareRequestStatus, string> = {
  submitted: 'var(--hhh-secondary-text)',
  under_review: '#7a4510',
  approved: 'var(--hhh-success)',
  rejected: 'var(--hhh-error)',
  cancelled: 'var(--hhh-secondary-text)',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let requestRows: { status: string; created_at: string }[] | null = null;
  let requestsError = false;
  let customerCount = 0;
  let activeWorkerCount = 0;
  try {
    const [requests, customers, workers] = await Promise.all([
      apiListCareRequests(),
      apiListCustomers().catch(() => []),
      apiListCaregivers('active').catch(() => []),
    ]);
    requestRows = requests.map((r) => ({ status: r.status, created_at: r.created_at }));
    customerCount = customers.length;
    activeWorkerCount = workers.length;
  } catch (err) {
    console.error('Failed to load dashboard:', err);
    requestsError = true;
  }

  const statusCounts: Record<CareRequestStatus, number> = {
    submitted: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
  };
  let activitySeries: { date: string; label: string; count: number }[] = [];
  if (requestRows) {
    for (const row of requestRows) {
      const status = row.status as CareRequestStatus;
      if (status in statusCounts) statusCounts[status] += 1;
    }
    const byMonth = new Map<string, number>();
    for (const row of requestRows) {
      const d = new Date(row.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
    const monthFormatter = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });
    activitySeries = Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => {
        const [year, month] = key.split('-').map(Number);
        return { date: `${key}-01`, label: monthFormatter.format(new Date(year, month - 1, 1)), count };
      });
  }
  const totalRequests = requestRows?.length ?? 0;
  const openRequests = statusCounts.submitted + statusCounts.under_review;

  return (
    <AdminShell title="Operations Overview" userEmail={session.email} isDemo={session.isDemo}>
      <p style={{ color: 'var(--hhh-secondary-text)', marginTop: 0, maxWidth: 640 }}>
        Monitor care activity, customer services and workforce operations.
      </p>

      {requestsError ? (
        <ErrorState message="Something went wrong loading care request data. Please try reloading the page." />
      ) : (
        <>
          <section aria-labelledby="care-request-kpis" className="hhh-fade-in" style={{ marginTop: 'var(--hhh-space-lg)' }}>
            <h2 id="care-request-kpis" style={{ fontSize: '1rem', color: 'var(--hhh-secondary-text)', fontWeight: 700 }}>
              Care requests — live data
            </h2>
            <div className="hhh-kpi-grid">
              <MetricCard label="Total care requests" value={totalRequests} href="/requests" />
              <MetricCard
                label="Awaiting review"
                value={statusCounts.submitted}
                meta="Status: Submitted"
                href="/requests"
              />
              <MetricCard
                label="Open requests"
                value={openRequests}
                meta="Submitted + Being reviewed"
                href="/requests"
              />
              <MetricCard label="Approved" value={statusCounts.approved} href="/requests" />
            </div>
          </section>

          <section
            aria-labelledby="request-charts"
            className="hhh-analytics-grid hhh-fade-in"
            style={{ marginTop: 'var(--hhh-space-xl)' }}
          >
            <div className="hhh-panel">
              <h2>Care requests over time</h2>
              <div className="hhh-panel__body">
                <ActivityChart points={activitySeries} />
              </div>
            </div>
            <div className="hhh-panel">
              <h2>Care request status</h2>
              <div className="hhh-panel__body">
                <BarChart
                  title="Care requests by status"
                  rows={CARE_REQUEST_STATUSES.map((status) => ({
                    label: STATUS_LABELS[status],
                    count: statusCounts[status],
                    color: STATUS_TONE[status],
                  }))}
                />
              </div>
            </div>
          </section>
        </>
      )}

      <section aria-labelledby="platform-kpis" className="hhh-fade-in" style={{ marginTop: 'var(--hhh-space-xl)' }}>
        <h2 id="platform-kpis" style={{ fontSize: '1rem', color: 'var(--hhh-secondary-text)', fontWeight: 700 }}>
          Customers, caregivers &amp; visits — live data
        </h2>
        <div className="hhh-kpi-grid">
          <MetricCard label="Total customers" value={customerCount} href="/customers" />
          <MetricCard label="Active caregivers" value={activeWorkerCount} href="/workers" />
        </div>
      </section>
    </AdminShell>
  );
}

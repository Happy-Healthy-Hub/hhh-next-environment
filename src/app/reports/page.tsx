import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { fetchVisitReports } from '@/lib/reports';
import { AdminShell } from '../components/AdminShell';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { InfoNotice } from '../components/InfoNotice';

export const instant = false;

/**
 * Reports & Insights (AD67-77). Visit reports (AD67/68) are real, read
 * from `public.visit_notes` (`visit_notes_select` RLS already grants
 * every care-staff account read access). "Mark as reviewed" (AD67's own
 * action) is not built -- no such column exists on `visit_notes`.
 * Incidents (AD69-71) and exports (AD77) have no backend at all -- no
 * incident table exists anywhere in the schema -- so they are shown as
 * honest "not available yet" notices rather than an interactive mock-up.
 */
export default async function ReportsPage() {
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let reports;
  try {
    reports = await fetchVisitReports(supabase);
  } catch (err) {
    console.error('Failed to load reports:', err);
    return (
      <AdminShell title="Reports & Insights" userEmail={session.email} isDemo={session.isDemo}>
        <ErrorState message="Something went wrong loading visit reports. Please try reloading the page." />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Reports & Insights" userEmail={session.email} isDemo={session.isDemo}>
      <div className="hhh-fade-in">
        <h2 style={{ fontSize: '1.1rem' }}>Visit reports</h2>
        <p style={{ color: 'var(--hhh-secondary-text)', marginTop: 0 }}>
          Notes caregivers wrote during a visit. This is a record of what the caregiver wrote, not a
          clinical assessment.
        </p>
        {reports.length === 0 ? (
          <EmptyState title="No reports yet" message="Visit notes caregivers record appear here." />
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--hhh-space-sm)' }}>
            {reports.map((report) => (
              <li key={report.id} className="hhh-card">
                <div style={{ fontWeight: 600 }}>
                  {report.caregiverName} · {report.customerName}
                </div>
                <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginBottom: 'var(--hhh-space-xs)' }}>
                  Visit {new Date(report.visitScheduledStartAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })} ·
                  written {new Date(report.createdAt).toLocaleString('en-IN', { timeStyle: 'short' })}
                </div>
                <div>{report.body}</div>
              </li>
            ))}
          </ul>
        )}

        <h2 style={{ fontSize: '1.1rem', marginTop: 'var(--hhh-space-xxl)' }}>Incidents</h2>
        <div className="hhh-card" style={{ padding: 'var(--hhh-space-md)' }}>
          <p style={{ margin: 0, color: 'var(--hhh-secondary-text)' }}>
            Incident reporting and tracking is available in the{' '}
            <a href="/incidents" style={{ color: 'var(--hhh-primary-teal)', fontWeight: 600 }}>Incidents</a>{' '}
            section. Incident analytics and aggregation for this reports page are not yet built.
          </p>
        </div>

        <h2 style={{ fontSize: '1.1rem', marginTop: 'var(--hhh-space-xxl)' }}>Export</h2>
        <InfoNotice
          title="Not available yet"
          message="Exporting reports is not built. Any future export must be recorded in the audit log with the exporting staff member's name and the filters used, per the approved design."
        />
      </div>
    </AdminShell>
  );
}

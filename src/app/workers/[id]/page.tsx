import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { loadStaffSession } from '@/lib/auth';
import { fetchCaregiverDetail, CAREGIVER_STATUS_BADGE_CLASS, CAREGIVER_STATUS_LABELS } from '@/lib/caregivers';
import { apiListDocuments, type CaregiverDocument } from '@/lib/api/documents';
import { apiListAvailabilitySlots, apiListUnavailability, type AvailabilitySlot, type UnavailabilityRange } from '@/lib/api/availability';
import { AdminShell } from '../../components/AdminShell';
import { CaregiverDetailPanel } from './CaregiverDetailPanel';

export const instant = false;

export default async function CaregiverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const session = await loadStaffSession(supabase);
  if (!session) redirect('/login');
  if (!session.isCareStaff) redirect('/not-authorized');

  let caregiver;
  let documents: CaregiverDocument[] = [];
  let availabilitySlots: AvailabilitySlot[] = [];
  let unavailability: UnavailabilityRange[] = [];
  try {
    caregiver = await fetchCaregiverDetail(supabase, id);
    if (caregiver) {
      [documents, availabilitySlots, unavailability] = await Promise.all([
        apiListDocuments(id).catch(() => [] as CaregiverDocument[]),
        apiListAvailabilitySlots(id).catch(() => [] as AvailabilitySlot[]),
        apiListUnavailability(id).catch(() => [] as UnavailabilityRange[]),
      ]);
    }
  } catch (err) {
    console.error('Failed to load workers/[id]:', err);
    caregiver = null;
  }

  if (!caregiver) {
    return (
      <AdminShell title="Caregiver" userEmail={session.email} isDemo={session.isDemo}>
        <div style={{ marginBottom: 'var(--hhh-space-md)' }}>
          <Link href="/workers" style={{ color: 'var(--hhh-dark-teal)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Back to caregivers
          </Link>
        </div>
        <div className="hhh-empty-state">
          This caregiver could not be found. They may not exist, or you may not have access to their record.
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Caregiver" userEmail={session.email} isDemo={session.isDemo}>
      <div style={{ marginBottom: 'var(--hhh-space-md)' }}>
        <Link href="/workers" style={{ color: 'var(--hhh-dark-teal)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to caregivers
        </Link>
      </div>

      <div className="hhh-card" style={{ marginBottom: 'var(--hhh-space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--hhh-space-md)', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>{caregiver.publicDisplayName}</h2>
          <span className={`hhh-badge ${CAREGIVER_STATUS_BADGE_CLASS[caregiver.status]}`}>
            {CAREGIVER_STATUS_LABELS[caregiver.status]}
          </span>
        </div>
      </div>

      <CaregiverDetailPanel
        caregiver={caregiver}
        documents={documents}
        availabilitySlots={availabilitySlots}
        unavailability={unavailability}
      />
    </AdminShell>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { Modal } from './Modal';
import { createVisitAction, cancelVisitAction } from '@/app/visits/actions';
import { VISIT_STATUS_BADGE_CLASS, VISIT_STATUS_LABELS, canCancelVisit, type Visit } from '@/lib/visits';
import type { Assignment } from '@/lib/assignments';

export function VisitsPanel({
  visits,
  openAssignments,
}: {
  visits: Visit[];
  openAssignments: Assignment[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState<Visit | null>(null);
  const [reason, setReason] = useState('');
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmCancel() {
    if (!cancelling) return;
    startTransition(async () => {
      const result = await cancelVisitAction(cancelling.id, reason.trim() || 'Cancelled by staff');
      setCancelling(null);
      setReason('');
      if (!result.ok) {
        setBanner({ tone: 'error', message: result.message ?? 'Something went wrong.' });
        return;
      }
      setBanner({ tone: 'success', message: 'Visit cancelled.' });
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--hhh-space-md)' }}>
        <button type="button" className="hhh-button-primary" onClick={() => setCreating(true)} disabled={openAssignments.length === 0}>
          Create visit
        </button>
      </div>

      {visits.length === 0 ? (
        <EmptyState title="No visits scheduled" message="Visits created for an assigned request appear here." />
      ) : (
        <div className="hhh-panel" style={{ overflowX: 'auto' }}>
          <table className="hhh-data-table">
            <thead>
              <tr>
                <th>Date and time</th>
                <th>Caregiver</th>
                <th>Customer</th>
                <th>Check-in</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => (
                <tr key={visit.id}>
                  <td data-label="Date and time">
                    {new Date(visit.scheduledStartAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td data-label="Caregiver">{visit.caregiverName}</td>
                  <td data-label="Customer">{visit.customerName}</td>
                  <td data-label="Check-in">
                    {visit.checkedInAt
                      ? new Date(visit.checkedInAt).toLocaleTimeString('en-IN', { timeStyle: 'short' })
                      : 'Not yet'}
                  </td>
                  <td data-label="Status">
                    <span className={`hhh-badge ${VISIT_STATUS_BADGE_CLASS[visit.status]}`}>
                      {VISIT_STATUS_LABELS[visit.status]}
                    </span>
                  </td>
                  <td data-label="Actions">
                    {canCancelVisit(visit.status) && (
                      <button type="button" className="hhh-button-small hhh-button-small--danger" onClick={() => setCancelling(visit)}>
                        Cancel visit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem' }}>
        Check-in and check-out are times the caregiver tapped in the Worker App. There is no location
        tracking. Rescheduling and conflict checking are not built yet -- see OPERATIONS_API_REQUIREMENTS.md.
      </p>

      {creating && (
        <CreateVisitDialog
          openAssignments={openAssignments}
          onClose={() => setCreating(false)}
          onCreated={(message) => {
            setCreating(false);
            setBanner({ tone: 'success', message });
            router.refresh();
          }}
          onError={(message) => setBanner({ tone: 'error', message })}
        />
      )}

      {cancelling && (
        <ConfirmDialog
          title="Cancel this visit?"
          message={`${cancelling.caregiverName} and ${cancelling.customerName} will be told. The care request itself is not changed.`}
          confirmLabel="Cancel visit"
          destructive
          isPending={isPending}
          onConfirm={confirmCancel}
          onCancel={() => {
            setCancelling(null);
            setReason('');
          }}
        >
          <label className="hhh-field-label" htmlFor="cancel-reason">
            Reason (recorded)
          </label>
          <input id="cancel-reason" className="hhh-text-field" value={reason} onChange={(e) => setReason(e.target.value)} />
        </ConfirmDialog>
      )}
    </div>
  );
}

function CreateVisitDialog({
  openAssignments,
  onClose,
  onCreated,
  onError,
}: {
  openAssignments: Assignment[];
  onClose: () => void;
  onCreated: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [assignmentId, setAssignmentId] = useState(openAssignments[0]?.id ?? '');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('11:00');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignmentId || !date) {
      setFieldError('Choose an assignment and a date.');
      return;
    }
    const startAt = new Date(`${date}T${start}:00`);
    const endAt = new Date(`${date}T${end}:00`);
    if (!(endAt > startAt)) {
      setFieldError('The end time must be after the start time.');
      return;
    }
    setFieldError(null);
    startTransition(async () => {
      const result = await createVisitAction(assignmentId, startAt.toISOString(), endAt.toISOString());
      if (!result.ok) {
        const message = result.message ?? 'Something went wrong.';
        setFieldError(message);
        onError(message);
        return;
      }
      onCreated('Visit scheduled.');
    });
  }

  return (
    <Modal title="Create visit" onClose={onClose}>
      <form onSubmit={handleSubmit} className="hhh-form-grid">
        {fieldError && (
          <div role="alert" className="hhh-inline-alert">
            {fieldError}
          </div>
        )}
        <div>
          <label className="hhh-field-label" htmlFor="visit-assignment">
            Assignment
          </label>
          <select
            id="visit-assignment"
            className="hhh-text-field"
            value={assignmentId}
            onChange={(e) => setAssignmentId(e.target.value)}
            disabled={isPending}
          >
            {openAssignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.request?.customerName ?? 'Unknown customer'} · {a.caregiverName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="hhh-field-label" htmlFor="visit-date">
            Date
          </label>
          <input id="visit-date" type="date" className="hhh-text-field" value={date} onChange={(e) => setDate(e.target.value)} disabled={isPending} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--hhh-space-sm)' }}>
          <div style={{ flex: 1 }}>
            <label className="hhh-field-label" htmlFor="visit-start">
              Start
            </label>
            <input id="visit-start" type="time" className="hhh-text-field" value={start} onChange={(e) => setStart(e.target.value)} disabled={isPending} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="hhh-field-label" htmlFor="visit-end">
              End
            </label>
            <input id="visit-end" type="time" className="hhh-text-field" value={end} onChange={(e) => setEnd(e.target.value)} disabled={isPending} />
          </div>
        </div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--hhh-secondary-text)' }}>
          No conflict checking exists yet -- double-check the caregiver&apos;s other visits before confirming.
        </p>
        <div style={{ display: 'flex', gap: 'var(--hhh-space-sm)', justifyContent: 'flex-end' }}>
          <button type="button" className="hhh-button-outlined" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button type="submit" className="hhh-button-primary" disabled={isPending}>
            {isPending ? 'Scheduling…' : 'Confirm schedule'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

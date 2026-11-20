'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { assignCaregiverAction, endAssignmentAction } from '@/app/assignments/actions';
import {
  ASSIGNMENT_STATUS_BADGE_CLASS,
  ASSIGNMENT_STATUS_LABELS,
  type Assignment,
} from '@/lib/assignments';
import type { Caregiver } from '@/lib/caregivers';

export function AssignmentDetail({
  requestId,
  requestStatus,
  customerName,
  preferredStartDate,
  services,
  openAssignment,
  history,
  eligibleCaregivers,
}: {
  requestId: string;
  requestStatus: string;
  customerName: string;
  preferredStartDate: string;
  services: string[];
  openAssignment: Assignment | null;
  history: Assignment[];
  eligibleCaregivers: Caregiver[];
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<{ caregiverId: string; caregiverName: string } | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [reason, setReason] = useState('');
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmAssign() {
    if (!confirming) return;
    startTransition(async () => {
      const result = await assignCaregiverAction(
        requestId,
        confirming.caregiverId,
        openAssignment?.id ?? null
      );
      setConfirming(null);
      if (!result.ok) {
        setBanner({ tone: 'error', message: result.message ?? 'Something went wrong.' });
        return;
      }
      setBanner({ tone: 'success', message: `Assigned to ${confirming.caregiverName}.` });
      router.refresh();
    });
  }

  function confirmWithdraw() {
    if (!openAssignment) return;
    startTransition(async () => {
      const result = await endAssignmentAction(openAssignment.id, 'cancelled', reason.trim() || 'Withdrawn by staff');
      setWithdrawing(false);
      setReason('');
      if (!result.ok) {
        setBanner({ tone: 'error', message: result.message ?? 'Something went wrong.' });
        return;
      }
      setBanner({ tone: 'success', message: 'Assignment withdrawn.' });
      router.refresh();
    });
  }

  if (requestStatus !== 'approved') {
    return (
      <EmptyState
        title="This request is not approved"
        message={`Only approved requests can be assigned a caregiver. This request's current status is "${requestStatus}".`}
      />
    );
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
        <div style={{ fontWeight: 600 }}>{customerName}</div>
        <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>
          {services.join(', ') || 'No services'} · Preferred start {preferredStartDate}
        </div>
      </div>

      {openAssignment ? (
        <div className="hhh-card" style={{ marginBottom: 'var(--hhh-space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--hhh-space-sm)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{openAssignment.caregiverName}</div>
              <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>
                Assigned {new Date(openAssignment.assignedAt).toLocaleDateString('en-IN')}
              </div>
            </div>
            <span className={`hhh-badge ${ASSIGNMENT_STATUS_BADGE_CLASS[openAssignment.status]}`}>
              {ASSIGNMENT_STATUS_LABELS[openAssignment.status]}
            </span>
          </div>
          <div style={{ marginTop: 'var(--hhh-space-md)', display: 'flex', gap: 'var(--hhh-space-sm)' }}>
            <button type="button" className="hhh-button-small hhh-button-small--danger" onClick={() => setWithdrawing(true)}>
              Withdraw assignment
            </button>
          </div>
          <p style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem', marginBottom: 0 }}>
            The caregiver sees only this assignment in the Worker App. Choosing a different caregiver below
            reassigns this request -- the current caregiver is told they were withdrawn.
          </p>
        </div>
      ) : (
        <p style={{ color: 'var(--hhh-secondary-text)' }}>
          This request still needs a caregiver. It is not a visit yet.
        </p>
      )}

      <h2 style={{ fontSize: '1.05rem' }}>{openAssignment ? 'Reassign' : 'Eligible caregivers'}</h2>
      {eligibleCaregivers.length === 0 ? (
        <EmptyState title="No active caregivers" message="No caregiver account is currently active." />
      ) : (
        <div className="hhh-panel" style={{ overflowX: 'auto' }}>
          <table className="hhh-data-table">
            <thead>
              <tr>
                <th>Caregiver</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {eligibleCaregivers
                .filter((c) => c.id !== openAssignment?.careAssociateId)
                .map((caregiver) => (
                  <tr key={caregiver.id}>
                    <td data-label="Caregiver">{caregiver.publicDisplayName}</td>
                    <td data-label="Status">
                      <span className="hhh-badge hhh-badge--positive">Active</span>
                    </td>
                    <td data-label="Actions">
                      <button
                        type="button"
                        className="hhh-button-small"
                        onClick={() => setConfirming({ caregiverId: caregiver.id, caregiverName: caregiver.publicDisplayName })}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.85rem' }}>
        Only active caregiver accounts appear here. The list is not ranked or scored -- you make the choice.
        Skills, qualifications and availability are not shown here yet; see OPERATIONS_API_REQUIREMENTS.md.
      </p>

      {history.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.05rem' }}>History</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--hhh-space-xs)' }}>
            {history.map((a) => (
              <li key={a.id} className="hhh-card" style={{ fontSize: '0.9rem' }}>
                {a.caregiverName} · {ASSIGNMENT_STATUS_LABELS[a.status]}
                {a.endReason ? ` · ${a.endReason}` : ''}
              </li>
            ))}
          </ul>
        </>
      )}

      {confirming && (
        <ConfirmDialog
          title={`Assign ${confirming.caregiverName} to ${customerName}?`}
          message="This records your decision. The caregiver is told of the assignment in the Worker App. No acceptance is implied, and no visits are scheduled yet."
          confirmLabel="Confirm assignment"
          isPending={isPending}
          onConfirm={confirmAssign}
          onCancel={() => setConfirming(null)}
        />
      )}

      {withdrawing && (
        <ConfirmDialog
          title="Withdraw this assignment?"
          message="The caregiver is told the assignment was withdrawn. This cannot be undone from here."
          confirmLabel="Withdraw assignment"
          destructive
          isPending={isPending}
          onConfirm={confirmWithdraw}
          onCancel={() => {
            setWithdrawing(false);
            setReason('');
          }}
        >
          <label className="hhh-field-label" htmlFor="withdraw-reason">
            Reason (recorded)
          </label>
          <input
            id="withdraw-reason"
            className="hhh-text-field"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </ConfirmDialog>
      )}
    </div>
  );
}

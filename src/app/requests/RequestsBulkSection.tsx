'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { BulkActionBar } from '../components/BulkActionBar';
import { STATUS_BADGE_CLASS, STATUS_LABELS, type CareRequest } from '@/lib/care-requests';
import { bulkDecide, bulkStartReview } from './actions';

/**
 * Only wraps the "Needs attention" section -- requests outside
 * submitted/under_review have no bulk transition available, so they
 * stay the plain read-only list in page.tsx rather than being forced
 * into a selection UI that could never do anything with them.
 */
export function RequestsBulkSection({ requests }: { requests: CareRequest[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<'start-review' | 'approve' | 'reject' | null>(null);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedRequests = requests.filter((r) => selected.has(r.id));
  const allSubmitted = selectedRequests.length > 0 && selectedRequests.every((r) => r.status === 'submitted');
  const allUnderReview = selectedRequests.length > 0 && selectedRequests.every((r) => r.status === 'under_review');
  const mixed = selectedRequests.length > 0 && !allSubmitted && !allUnderReview;

  const allSelected = requests.length > 0 && selected.size === requests.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(requests.map((r) => r.id)));
  }

  function clear() {
    setSelected(new Set());
  }

  function report(kind: string, succeeded: number, failed: number) {
    if (failed === 0) {
      setBanner({ tone: 'success', message: `${succeeded} request${succeeded === 1 ? '' : 's'} ${kind}.` });
    } else {
      setBanner({
        tone: 'error',
        message: `${succeeded} request${succeeded === 1 ? '' : 's'} ${kind}, ${failed} failed (not in the expected state, or another permission issue). Reload to see the current status.`,
      });
    }
  }

  function run() {
    const ids = [...selected];
    startTransition(async () => {
      if (confirm === 'start-review') {
        const result = await bulkStartReview(ids);
        report('moved to review', result.succeeded.length, result.failed.length);
      } else if (confirm === 'approve' || confirm === 'reject') {
        const result = await bulkDecide(ids, confirm === 'approve' ? 'approved' : 'rejected', null);
        report(confirm === 'approve' ? 'approved' : 'rejected', result.succeeded.length, result.failed.length);
      }
      setConfirm(null);
      clear();
      router.refresh();
    });
  }

  return (
    <div>
      {banner && (
        <div
          role="status"
          className={banner.tone === 'success' ? 'hhh-badge hhh-badge--positive' : 'hhh-inline-alert'}
          style={{ display: 'block', marginBottom: 'var(--hhh-space-md)' }}
        >
          {banner.message}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--hhh-space-sm)', marginBottom: 'var(--hhh-space-sm)' }}>
        <input
          type="checkbox"
          className="hhh-row-checkbox"
          aria-label="Select all requests needing attention"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected;
          }}
          onChange={toggleAll}
        />
        <span style={{ fontSize: '0.85rem', color: 'var(--hhh-secondary-text)' }}>Select all</span>
      </div>

      {selected.size > 0 && (
        <BulkActionBar count={selected.size} onClear={clear}>
          {mixed ? (
            <span style={{ fontSize: '0.85rem', color: 'var(--hhh-warning-text)' }}>
              Select only submitted requests to start review, or only in-review requests to decide.
            </span>
          ) : (
            <>
              {allSubmitted && (
                <button type="button" className="hhh-button-small" onClick={() => setConfirm('start-review')}>
                  Start review
                </button>
              )}
              {allUnderReview && (
                <>
                  <button type="button" className="hhh-button-small" onClick={() => setConfirm('approve')}>
                    Approve
                  </button>
                  <button
                    type="button"
                    className="hhh-button-small hhh-button-small--danger"
                    onClick={() => setConfirm('reject')}
                  >
                    Reject
                  </button>
                </>
              )}
            </>
          )}
        </BulkActionBar>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--hhh-space-sm)' }}>
        {requests.map((request) => (
          <li
            key={request.id}
            className="hhh-card"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--hhh-space-md)' }}
          >
            <input
              type="checkbox"
              className="hhh-row-checkbox"
              aria-label={`Select request from ${request.customer.preferredName ?? request.customer.fullName}`}
              checked={selected.has(request.id)}
              onChange={() => toggle(request.id)}
            />
            <Link
              href={`/requests/${request.id}`}
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--hhh-space-md)',
                textDecoration: 'none',
                color: 'inherit',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  {request.customer.preferredName ?? request.customer.fullName}
                </div>
                <div style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>
                  {request.items.map((item) => item.serviceName).join(', ') || 'No services'} · Preferred
                  start {request.preferredStartDate}
                </div>
              </div>
              <span className={`hhh-badge ${STATUS_BADGE_CLASS[request.status]}`}>
                {STATUS_LABELS[request.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {confirm && (
        <ConfirmDialog
          title={
            confirm === 'start-review'
              ? `Start review on ${selected.size} request${selected.size === 1 ? '' : 's'}?`
              : confirm === 'approve'
                ? `Approve ${selected.size} request${selected.size === 1 ? '' : 's'}?`
                : `Reject ${selected.size} request${selected.size === 1 ? '' : 's'}?`
          }
          message="This calls the same trusted review/decision operation used for a single request, once per selected request. Any request no longer in the expected state will fail and be reported, not silently skipped."
          confirmLabel={confirm === 'start-review' ? 'Start review' : confirm === 'approve' ? 'Approve' : 'Reject'}
          destructive={confirm === 'reject'}
          isPending={isPending}
          onConfirm={run}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

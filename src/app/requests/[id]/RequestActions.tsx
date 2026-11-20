'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { decideRequest, startReview } from './actions';

/**
 * Only shows the actions the database would actually allow right now
 * (`canStartReview`/`canDecide`, mirroring `start_care_request_review`/
 * `decide_care_request`'s own status checks exactly) — no control is
 * shown that would just fail, matching the Flutter app's
 * `customerCanCancel` pattern for its own cancel button.
 */
export function RequestActions({
  requestId,
  canStartReview: showStartReview,
  canDecide: showDecide,
}: {
  requestId: string;
  canStartReview: boolean;
  canDecide: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  function handleStartReview() {
    setError(null);
    startTransition(async () => {
      const result = await startReview(requestId);
      if (!result.ok) {
        setError(result.message ?? 'Something went wrong.');
        return;
      }
      router.refresh();
    });
  }

  function handleDecide(decision: 'approved' | 'rejected') {
    setError(null);
    startTransition(async () => {
      const result = await decideRequest(requestId, decision, reason.trim() || null);
      if (!result.ok) {
        setError(result.message ?? 'Something went wrong.');
        return;
      }
      router.refresh();
    });
  }

  if (!showStartReview && !showDecide) {
    return (
      <p style={{ color: 'var(--hhh-secondary-text)' }}>
        No action is available for this request in its current status.
      </p>
    );
  }

  return (
    <div className="hhh-card">
      {error && (
        <div role="alert" className="hhh-inline-alert" style={{ marginBottom: 'var(--hhh-space-md)' }}>
          {error}
        </div>
      )}

      {showStartReview && (
        <button
          type="button"
          className="hhh-button-primary"
          onClick={handleStartReview}
          disabled={isPending}
        >
          {isPending ? 'Starting review…' : 'Start review'}
        </button>
      )}

      {showDecide && (
        <div style={{ display: 'grid', gap: 'var(--hhh-space-md)' }}>
          <div>
            <label className="hhh-field-label" htmlFor="decision-reason">
              Note (shown to the customer if you reject this request)
            </label>
            <textarea
              id="decision-reason"
              className="hhh-text-field"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={isPending}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--hhh-space-sm)', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="hhh-button-primary"
              onClick={() => handleDecide('approved')}
              disabled={isPending}
            >
              {isPending ? 'Saving…' : 'Approve'}
            </button>
            <button
              type="button"
              className="hhh-button-outlined"
              onClick={() => handleDecide('rejected')}
              disabled={isPending}
            >
              {isPending ? 'Saving…' : 'Reject'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

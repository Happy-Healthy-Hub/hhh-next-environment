'use client';

import { Modal } from './Modal';

/**
 * Required before every destructive or consequential action (single or
 * bulk delete, bulk status change) -- names the operation and the exact
 * number of affected records, never a generic "are you sure?".
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  isPending = false,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Optional extra fields (e.g. a required reason) shown between the
   * message and the action buttons. */
  children?: React.ReactNode;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p style={{ marginTop: 0 }}>{message}</p>
      {children}
      <div style={{ display: 'flex', gap: 'var(--hhh-space-sm)', justifyContent: 'flex-end', marginTop: 'var(--hhh-space-lg)' }}>
        <button type="button" className="hhh-button-outlined" onClick={onCancel} disabled={isPending}>
          Cancel
        </button>
        <button
          type="button"
          className={destructive ? 'hhh-button-danger' : 'hhh-button-primary'}
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

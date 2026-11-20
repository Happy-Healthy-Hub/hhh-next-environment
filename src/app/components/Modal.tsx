'use client';

import { useEffect, useRef } from 'react';

/**
 * A minimal, dependency-free accessible dialog: focus moves in on open,
 * Escape and a backdrop click close it, and it's marked up as
 * `role="dialog"`/`aria-modal` with a labelled title -- no new UI
 * library was added for this, consistent with the rest of the portal's
 * plain-CSS, no-component-framework convention.
 */
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="hhh-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hhh-modal-title"
        tabIndex={-1}
        className={`hhh-modal${wide ? ' hhh-modal--wide' : ''}`}
      >
        <div className="hhh-modal__header">
          <h2 id="hhh-modal-title">{title}</h2>
          <button type="button" aria-label="Close dialog" className="hhh-modal__close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="hhh-modal__body">{children}</div>
      </div>
    </div>
  );
}

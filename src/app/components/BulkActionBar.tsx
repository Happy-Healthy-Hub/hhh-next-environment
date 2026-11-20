'use client';

/**
 * Contextual toolbar shown only once at least one row is selected --
 * not a permanent row of buttons on every row. Appears above the table,
 * sticky-adjacent to the filter bar, consistent across Customers,
 * Workers (and any future bulk-capable table).
 */
export function BulkActionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="hhh-bulk-bar" role="toolbar" aria-label="Bulk actions">
      <span className="hhh-bulk-bar__count">{count} selected</span>
      <div className="hhh-bulk-bar__actions">{children}</div>
      <button type="button" className="hhh-bulk-bar__clear" onClick={onClear}>
        Clear selection
      </button>
    </div>
  );
}

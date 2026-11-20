/**
 * A restrained, hand-rolled horizontal bar chart. No charting dependency
 * was added for this: the project is deliberately minimal (plain CSS,
 * no component framework -- see operations-portal/README.md), and a
 * handful of SVG rectangles is simpler and lighter than pinning and
 * configuring a full charting library for three small charts.
 *
 * Renders a visible bar per row plus a visually-hidden data table, so a
 * screen reader gets the same information a sighted user gets from the
 * bars -- raw SVG shapes alone announce nothing meaningful.
 */
export interface BarChartRow {
  label: string;
  count: number;
  /** Per-row colour override (e.g. to match a status badge's tone). The
   * label and number are always shown too, so colour is never the only
   * way a row's meaning is conveyed. */
  color?: string;
}

export function BarChart({
  title,
  rows,
  barColor = 'var(--hhh-primary-teal)',
}: {
  title: string;
  rows: BarChartRow[];
  barColor?: string;
}) {
  if (rows.length === 0) {
    return <p style={{ color: 'var(--hhh-secondary-text)' }}>No data for this chart yet.</p>;
  }
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div role="img" aria-label={`${title}: ${rows.map((r) => `${r.label} ${r.count}`).join(', ')}`}>
      <div style={{ display: 'grid', gap: 'var(--hhh-space-sm)' }}>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{ display: 'grid', gridTemplateColumns: '140px 1fr 40px', alignItems: 'center', gap: 'var(--hhh-space-sm)' }}
          >
            <span style={{ fontSize: '0.9rem', color: 'var(--hhh-primary-text)' }}>{row.label}</span>
            <div
              style={{
                background: 'var(--hhh-neutral-surface)',
                borderRadius: 6,
                height: 14,
                overflow: 'hidden',
              }}
            >
              <div
                className="hhh-bar-fill"
                style={{
                  width: `${(row.count / max) * 100}%`,
                  background: row.color ?? barColor,
                  height: '100%',
                  borderRadius: 6,
                  minWidth: row.count > 0 ? 4 : 0,
                }}
              />
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, textAlign: 'right' }}>{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

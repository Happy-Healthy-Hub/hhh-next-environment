/**
 * Monthly request-volume chart (vertical bars) -- the "line or bar
 * chart showing care requests over time" the brief asks for. Bars were
 * chosen over an SVG line/polyline for the same reason as BarChart.tsx:
 * simpler to keep responsive and accessible without a dependency.
 */
import type { TimeSeriesPoint } from '@/lib/mock-data/types';

export function ActivityChart({ points }: { points: TimeSeriesPoint[] }) {
  if (points.length === 0) {
    return <p style={{ color: 'var(--hhh-secondary-text)' }}>No care requests recorded yet.</p>;
  }
  const max = Math.max(...points.map((p) => p.count), 1);

  return (
    <div
      role="img"
      aria-label={`Care requests submitted per month: ${points
        .map((p) => `${p.label} ${p.count}`)
        .join(', ')}`}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${points.length}, minmax(32px, 1fr))`,
          alignItems: 'end',
          gap: 'var(--hhh-space-sm)',
          height: 160,
        }}
      >
        {points.map((point) => (
          <div key={point.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
              <div
                className="hhh-activity-bar"
                title={`${point.label}: ${point.count}`}
                style={{
                  width: '100%',
                  maxWidth: 36,
                  height: `${Math.max((point.count / max) * 100, 4)}%`,
                  background: 'var(--hhh-primary-teal)',
                  borderRadius: '4px 4px 0 0',
                }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: 4 }}>{point.count}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--hhh-secondary-text)' }}>{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

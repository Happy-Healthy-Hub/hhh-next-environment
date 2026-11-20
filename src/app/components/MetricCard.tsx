export function MetricCard({
  label,
  value,
  meta,
  href,
}: {
  label: string;
  value: number;
  meta?: string;
  href?: string;
}) {
  const content = (
    <div className="hhh-metric-card">
      <span className="hhh-metric-card__label">{label}</span>
      <span className="hhh-metric-card__value">{value.toLocaleString('en-IN')}</span>
      {meta && <span className="hhh-metric-card__meta">{meta}</span>}
    </div>
  );
  if (!href) return content;
  return (
    <a href={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      {content}
    </a>
  );
}

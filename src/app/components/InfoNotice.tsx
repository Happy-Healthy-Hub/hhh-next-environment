/**
 * An honest "this isn't built yet" notice -- used wherever a screen has
 * no backend capability to build against, instead of a dead button or a
 * fabricated interactive mock-up.
 */
export function InfoNotice({ title, message }: { title: string; message: string }) {
  return (
    <div className="hhh-card" style={{ borderStyle: 'dashed' }}>
      <div style={{ fontWeight: 600, marginBottom: 'var(--hhh-space-xs)' }}>{title}</div>
      <div style={{ color: 'var(--hhh-secondary-text)' }}>{message}</div>
    </div>
  );
}

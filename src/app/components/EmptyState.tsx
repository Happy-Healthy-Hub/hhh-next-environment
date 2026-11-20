export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="hhh-empty-state">
      <p style={{ fontWeight: 600, color: 'var(--hhh-primary-text)', margin: '0 0 4px 0' }}>{title}</p>
      {message && <p style={{ margin: 0 }}>{message}</p>}
    </div>
  );
}

'use client';

interface FilterBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  resultCount: number;
  totalCount: number;
}

export function FilterBar({ value, onChange, placeholder, resultCount, totalCount }: FilterBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--hhh-space-md)',
        marginBottom: 'var(--hhh-space-md)',
        flexWrap: 'wrap',
      }}
    >
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="hhh-filter-input"
      />
      <span style={{ fontSize: '0.85rem', color: 'var(--hhh-secondary-text)' }}>
        {value ? `${resultCount} of ${totalCount}` : `${totalCount} total`}
      </span>
    </div>
  );
}

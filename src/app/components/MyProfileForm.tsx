'use client';

import { useState, useTransition } from 'react';
import { updateMyDisplayNameAction } from '@/app/settings/actions';

export function MyProfileForm({ initialDisplayName, email }: { initialDisplayName: string; email: string | null }) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateMyDisplayNameAction(displayName);
      setBanner(
        result.ok
          ? { tone: 'success', message: 'Saved.' }
          : { tone: 'error', message: result.message ?? 'Something went wrong.' }
      );
    });
  }

  return (
    <form onSubmit={handleSubmit} className="hhh-form-grid" style={{ maxWidth: 420 }}>
      {banner && (
        <div
          role="status"
          className={banner.tone === 'success' ? 'hhh-badge hhh-badge--positive' : 'hhh-inline-alert'}
          style={{ display: 'block' }}
        >
          {banner.message}
        </div>
      )}
      <div>
        <label className="hhh-field-label" htmlFor="settings-display-name">
          Display name
        </label>
        <input
          id="settings-display-name"
          className="hhh-text-field"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={isPending}
        />
      </div>
      <div>
        <label className="hhh-field-label" htmlFor="settings-email">
          Work email
        </label>
        <input id="settings-email" className="hhh-text-field" value={email ?? 'Not available'} disabled readOnly />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="hhh-button-primary" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

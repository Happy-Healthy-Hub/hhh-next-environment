'use client';

import { useState, useTransition } from 'react';
import { demoSignInAction } from './demo-actions';
import type { DemoRoleOption } from '@/lib/demo/auth';

/**
 * Local Demo Mode "sign in": choose which fictional staff account to act
 * as. Never calls Supabase Auth. Only rendered by `login/page.tsx` when
 * `isDemoMode()` is true, which itself can never be true in a production
 * build. See `demo/README.md`.
 */
export function DemoLoginForm({ options }: { options: DemoRoleOption[] }) {
  const [selected, setSelected] = useState(options[0]?.profileId ?? '');
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <div
        role="status"
        className="hhh-badge hhh-badge--attention"
        style={{ display: 'block', marginBottom: 'var(--hhh-space-md)' }}
      >
        LOCAL DEMO MODE -- fictional data only, never the real backend.
      </div>
      <label className="hhh-field-label" htmlFor="demo-staff">
        Sign in as
      </label>
      <select
        id="demo-staff"
        className="hhh-text-field"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={isPending}
        style={{ marginBottom: 'var(--hhh-space-md)' }}
      >
        {options.map((option) => (
          <option key={option.profileId} value={option.profileId}>
            {option.displayName} -- {option.roleLabel}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="hhh-button-primary"
        style={{ width: '100%' }}
        disabled={isPending || !selected}
        onClick={() => startTransition(() => demoSignInAction(selected))}
      >
        {isPending ? 'Signing in…' : 'Sign in to the demo'}
      </button>
    </div>
  );
}

'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resetDemoDataAction } from '@/lib/demo/actions';

/** Only ever rendered by `AdminHeader` when `isDemo` is true, which
 * itself only happens for a Local Demo Mode session -- see
 * `demo/README.md`. */
export function ResetDemoDataButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="hhh-button-outlined"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await resetDemoDataAction();
          router.refresh();
        })
      }
    >
      {isPending ? 'Resetting…' : 'Reset Demo Data'}
    </button>
  );
}

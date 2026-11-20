'use client';

import { ResetDemoDataButton } from './ResetDemoDataButton';

/**
 * Top header for the admin shell: page title, menu toggle (narrow
 * screens only, via CSS), authenticated user and sign-out. No search or
 * notifications are shown -- neither is implemented, and the brief is
 * explicit that a nonfunctional search/notification affordance must not
 * be displayed as if it works.
 *
 * `isDemo` adds a DEMO badge and the "Reset Demo Data" control -- only
 * ever true for a Local Demo Mode session (see `demo/README.md`), never
 * for a real one, and Demo Mode itself can never be active in a
 * production build.
 */
export function AdminHeader({
  title,
  userEmail,
  onToggleSidebar,
  isDemo = false,
}: {
  title: string;
  userEmail: string | null;
  onToggleSidebar: () => void;
  isDemo?: boolean;
}) {
  return (
    <header
      className="hhh-admin-header"
      style={{
        padding: '12px var(--hhh-space-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--hhh-space-md)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--hhh-space-sm)' }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="hhh-admin-menu-toggle"
          style={{
            background: 'transparent',
            border: '1px solid var(--hhh-border)',
            borderRadius: 8,
            width: 40,
            height: 40,
            cursor: 'pointer',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--hhh-space-md)' }}>
        {isDemo && <span className="hhh-badge hhh-badge--attention">DEMO MODE</span>}
        {userEmail && (
          <span style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>{userEmail}</span>
        )}
        {isDemo && <ResetDemoDataButton />}
        <form action="/auth/signout" method="post">
          <button type="submit" className="hhh-button-outlined">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}

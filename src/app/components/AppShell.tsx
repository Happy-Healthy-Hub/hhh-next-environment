import Link from 'next/link';

/**
 * Persistent navigation + page title for every authenticated page, per
 * DESIGN.md section 7 "App shell: persistent navigation, page title,
 * breadcrumb where helpful, account/session menu and responsive content
 * region."
 */
export function AppShell({
  title,
  userEmail,
  children,
}: {
  title: string;
  userEmail: string | null;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: 'var(--hhh-white)',
          borderBottom: '1px solid var(--hhh-border)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--hhh-space-md)',
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/requests"
          style={{
            fontWeight: 800,
            fontSize: '1.1rem',
            color: 'var(--hhh-dark-teal)',
            textDecoration: 'none',
          }}
        >
          Happy Healthy Hub — Operations
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--hhh-space-md)' }}>
          {userEmail && (
            <span style={{ color: 'var(--hhh-secondary-text)', fontSize: '0.9rem' }}>
              {userEmail}
            </span>
          )}
          <form action="/auth/signout" method="post">
            <button type="submit" className="hhh-button-outlined">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 960,
          margin: '0 auto',
          padding: 'var(--hhh-space-lg) var(--hhh-space-md)',
        }}
      >
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        {children}
      </main>
    </div>
  );
}

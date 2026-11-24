'use client';

import { useState } from 'react';
import { ProviderSidebar } from './ProviderSidebar';
import { AdminHeader } from '../../components/AdminHeader';

export function ProviderShell({
  title,
  userEmail,
  orgName,
  children,
}: {
  title: string;
  userEmail: string | null;
  orgName: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="hhh-admin-shell">
      <ProviderSidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="hhh-admin-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="hhh-admin-main">
        <AdminHeader
          title={title}
          userEmail={userEmail}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        <main className="hhh-admin-content">
          <p style={{ margin: '0 0 var(--hhh-space-md)', color: 'var(--hhh-secondary-text)' }}>
            Organisation: {orgName}
          </p>
          {children}
        </main>
      </div>
    </div>
  );
}

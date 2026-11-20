'use client';

import { useState } from 'react';
import { CustomerSidebar } from './CustomerSidebar';
import { AdminHeader } from '../../components/AdminHeader';

export function CustomerShell({
  title,
  userEmail,
  children,
}: {
  title: string;
  userEmail: string | null;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="hhh-admin-shell">
      <CustomerSidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
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
        <main className="hhh-admin-content">{children}</main>
      </div>
    </div>
  );
}

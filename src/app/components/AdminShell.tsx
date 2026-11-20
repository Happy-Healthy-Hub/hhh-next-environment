'use client';

import { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

/**
 * The authenticated admin-portal shell: sidebar + header + content
 * region (DESIGN.md section 7 / the brief's section 6). On narrow
 * screens the sidebar becomes a toggle-controlled drawer (CSS in
 * globals.css, `.hhh-admin-sidebar`) rather than permanently covering
 * the page content.
 */
export function AdminShell({
  title,
  userEmail,
  children,
  isDemo = false,
}: {
  title: string;
  userEmail: string | null;
  children: React.ReactNode;
  isDemo?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="hhh-admin-shell">
      <AdminSidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="hhh-admin-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="hhh-admin-main">
        <AdminHeader title={title} userEmail={userEmail} onToggleSidebar={() => setSidebarOpen((v) => !v)} isDemo={isDemo} />
        <main className="hhh-admin-content">{children}</main>
      </div>
    </div>
  );
}

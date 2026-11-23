'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavIcon } from './NavIcon';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: 'overview' as const },
  { href: '/admin/customers', label: 'Customers', icon: 'customers' as const },
  { href: '/admin/workers', label: 'Caregivers', icon: 'workers' as const },
  { href: '/admin/providers', label: 'Providers', icon: 'providers' as const },
  { href: '/admin/requests', label: 'Care Requests', icon: 'requests' as const },
  { href: '/admin/assignments', label: 'Assignments', icon: 'assignments' as const },
  { href: '/admin/visits', label: 'Visits & Scheduling', icon: 'visits' as const },
  { href: '/admin/incidents', label: 'Incidents', icon: 'incidents' as const },
  { href: '/admin/tickets', label: 'Support Tickets', icon: 'tickets' as const },
  { href: '/admin/academy', label: 'Caregiver Academy', icon: 'academy' as const },
  { href: '/admin/reports', label: 'Reports & Insights', icon: 'reports' as const },
  { href: '/admin/notifications', label: 'Notifications', icon: 'notifications' as const },
  { href: '/admin/staff', label: 'Staff & Access', icon: 'staff' as const },
  { href: '/admin/settings', label: 'Settings', icon: 'settings' as const },
];

/**
 * Deep-teal admin sidebar (DESIGN.md token `--hhh-dark-teal`). Every
 * item has a text label, not just an icon -- the brief is explicit that
 * icon-only navigation is not acceptable for a primary nav.
 */
export function AdminSidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Operations workspace navigation"
      className={`hhh-admin-sidebar${open ? ' hhh-admin-sidebar--open' : ''}`}
    >
      <div>
        <div className="hhh-admin-brand">Happy Healthy Hub</div>
        <div className="hhh-admin-brand__sub">Operations Workspace</div>
      </div>
      <ul className="hhh-admin-nav-list">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={onNavigate}
                className="hhh-nav-link"
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

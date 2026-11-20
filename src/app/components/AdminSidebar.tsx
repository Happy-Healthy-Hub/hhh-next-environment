'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavIcon } from './NavIcon';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: 'overview' as const },
  { href: '/customers', label: 'Customers', icon: 'customers' as const },
  { href: '/workers', label: 'Caregivers', icon: 'workers' as const },
  { href: '/providers', label: 'Providers', icon: 'providers' as const },
  { href: '/requests', label: 'Care Requests', icon: 'requests' as const },
  { href: '/assignments', label: 'Assignments', icon: 'assignments' as const },
  { href: '/visits', label: 'Visits & Scheduling', icon: 'visits' as const },
  { href: '/incidents', label: 'Incidents', icon: 'incidents' as const },
  { href: '/tickets', label: 'Support Tickets', icon: 'tickets' as const },
  { href: '/academy', label: 'Caregiver Academy', icon: 'academy' as const },
  { href: '/reports', label: 'Reports & Insights', icon: 'reports' as const },
  { href: '/notifications', label: 'Notifications', icon: 'notifications' as const },
  { href: '/staff', label: 'Staff & Access', icon: 'staff' as const },
  { href: '/settings', label: 'Settings', icon: 'settings' as const },
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

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin/customer', label: 'Home', icon: 'home' },
  { href: '/admin/customer/services', label: 'Services', icon: 'services' },
  { href: '/admin/customer/requests', label: 'My Requests', icon: 'requests' },
  { href: '/admin/customer/profile', label: 'My Profile', icon: 'profile' },
] as const;

function CustomerNavIcon({ name }: { name: string }) {
  const size = 20;
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
    case 'services':
      return <svg {...common}><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>;
    case 'requests':
      return <svg {...common}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
    case 'profile':
      return <svg {...common}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="10" /></svg>;
  }
}

export function CustomerSidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Customer portal navigation"
      className={`hhh-admin-sidebar${open ? ' hhh-admin-sidebar--open' : ''}`}
    >
      <div>
        <div className="hhh-admin-brand">Happy Healthy Hub</div>
        <div className="hhh-admin-brand__sub">My Care Portal</div>
      </div>
      <ul className="hhh-admin-nav-list">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== '/admin/customer' && pathname.startsWith(`${item.href}/`));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={onNavigate}
                className="hhh-nav-link"
              >
                <CustomerNavIcon name={item.icon} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

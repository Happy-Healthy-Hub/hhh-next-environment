'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/provider', label: 'Dashboard', icon: 'dashboard' },
  { href: '/provider/work', label: 'Assignments', icon: 'work' },
  { href: '/provider/organization', label: 'Organisation', icon: 'org' },
  { href: '/provider/members', label: 'Team Members', icon: 'members' },
  { href: '/provider/profile', label: 'My Profile', icon: 'profile' },
] as const;

function ProviderNavIcon({ name }: { name: string }) {
  const size = 20;
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'dashboard':
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
    case 'work':
      return <svg {...common}><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M9 14l2 2 4-4" /></svg>;
    case 'org':
      return <svg {...common}><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" /></svg>;
    case 'members':
      return <svg {...common}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>;
    case 'profile':
      return <svg {...common}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="10" /></svg>;
  }
}

export function ProviderSidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Provider workspace navigation"
      className={`hhh-admin-sidebar${open ? ' hhh-admin-sidebar--open' : ''}`}
    >
      <div>
        <div className="hhh-admin-brand">Happy Healthy Hub</div>
        <div className="hhh-admin-brand__sub">Provider Portal</div>
      </div>
      <ul className="hhh-admin-nav-list">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== '/provider' && pathname.startsWith(`${item.href}/`));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={onNavigate}
                className="hhh-nav-link"
              >
                <ProviderNavIcon name={item.icon} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

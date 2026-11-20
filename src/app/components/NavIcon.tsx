/**
 * A small set of simple, consistent outline icons for the sidebar.
 * Decorative only (aria-hidden) -- every nav item also has a text label,
 * per the brief's "do not rely on icons alone for critical navigation".
 * No icon package was added for six icons; hand-drawn SVG keeps this
 * project's deliberate zero-dependency, plain-CSS approach.
 */
const PATHS: Record<string, string> = {
  overview: 'M3 12 9 6l4 4 8-8M3 20h18M7 20v-6M12 20v-9M17 20v-4M21 20v-7',
  customers: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 21c0-3.3 3.6-6 8-6s8 2.7 8 6',
  workers: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5M16 7h5M16 11h5M16 15h3',
  requests: 'M6 3h9l4 4v14H6V3ZM14 3v5h5M9 12h6M9 16h6',
  visits: 'M4 7h16M4 11h16M4 15h10M7 3v4M17 3v4M4 19h16',
  assignments: 'M9 11l3 3 7-7M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
  reports: 'M4 20V10M10 20V4M16 20v-7M4 20h16',
  notifications: 'M12 3a5 5 0 0 0-5 5v3.3c0 .6-.2 1.2-.6 1.7L5 15h14l-1.4-2a2.7 2.7 0 0 1-.6-1.7V8a5 5 0 0 0-5-5ZM9.5 19a2.5 2.5 0 0 0 5 0',
  staff: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5M16 7l1.5 1.5L21 5',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.067-.395.1-.796.1-1.2Z',
  incidents: 'M12 3 2 20h20L12 3ZM12 10v5M12 17.5v.5',
  tickets: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V7ZM10 5v14',
  providers: 'M3 10 12 4l9 6v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V10Z',
  academy: 'M12 3 2 9l10 6 10-6-10-6ZM2 9v6l10 6 10-6V9',
};

export function NavIcon({ name }: { name: keyof typeof PATHS }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

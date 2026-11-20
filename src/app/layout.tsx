import type { Metadata } from 'next';
import { Fraunces } from 'next/font/google';
import './globals.css';

// Used only by the public landing page (src/app/landing.css's
// --land-serif-font) for large editorial headings; the admin portal
// keeps its existing system sans-serif stack untouched.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--land-serif-font',
  display: 'swap',
});

// Every page below already sets `instant = false` for its own blocking-
// navigation validation, but Cache Components' static-shell check runs at
// the highest `instant` boundary in the tree -- which, without this, is
// the root layout's own (unset, so implicitly validated) boundary. That
// is what the "Next.js encountered the unstable value Date.now() while
// prerendering" dev-overlay error on /workers and /requests is actually
// about: Supabase's auth client calls Date.now() internally for session
// expiry while loadStaffSession() runs, and the whole portal is
// authenticated server-rendered (no page here has a real static shell to
// validate), so this is the documented fix -- not a bug in our own
// Date usage. See instant.md's "Disabling static shell validation".
export const instant = false;

export const metadata: Metadata = {
  title: 'Happy Healthy Hub — Operations',
  description:
    'Authenticated operational portal for Happy Healthy Hub care staff.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fraunces.variable}>
      <body>{children}</body>
    </html>
  );
}

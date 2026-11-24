import type { Metadata, Viewport } from 'next';
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
  metadataBase: new URL('https://hhh.foundation'),
  title: 'Happy Healthy Hub — Silverage Care Services',
  description:
    'Happy Healthy Hub supports older adults and their families with thoughtful home-based care, companionship and dependable assistance in Pune and Delhi.',
  applicationName: 'Happy Healthy Hub',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Happy Healthy Hub — Silverage Care Services',
    description:
      'Thoughtful care, meaningful companionship and dependable support for older adults and their families in Pune and Delhi.',
    url: '/',
    siteName: 'Happy Healthy Hub',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/images/hhh-og.png',
        width: 1200,
        height: 630,
        alt: 'Happy Healthy Hub — thoughtful elder-care support and companionship',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Happy Healthy Hub — Silverage Care Services',
    description:
      'Thoughtful care, meaningful companionship and dependable support for older adults and their families.',
    images: ['/images/hhh-og.png'],
  },
  icons: { icon: '/icon.png', apple: '/apple-icon.png' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#FAF8F3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fraunces.variable}>
      <body>{children}</body>
    </html>
  );
}

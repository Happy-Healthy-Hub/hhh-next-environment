'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const LINKS = [
  { href: '#about', label: 'About' },
  { href: '#services', label: 'Our Services' },
  { href: '#academy', label: 'Caregiver Academy' },
  { href: '#faq', label: 'FAQs' },
  { href: '#contact', label: 'Contact' },
];

/**
 * Sticky glass navigation: translucent at the top, more opaque +
 * blurred once the visitor scrolls. No login/registration form here --
 * only a link to the existing staff sign-in route, which is a real,
 * already-built destination, not an invented portal URL.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  function handleLinkClick() {
    setOpen(false);
  }

  return (
    <nav className={`hhh-land-nav${scrolled ? ' hhh-land-nav--scrolled' : ''}`} aria-label="Primary">
      <div className="hhh-land-nav__bar">
        <a href="#top" className="hhh-land-nav__brand">
          <Image src="/hhh-logo.png" alt="Happy Healthy Hub logo" width={34} height={34} priority />
          <span className="hhh-land-nav__brand-text">
            <span className="hhh-land-nav__brand-name">Happy Healthy Hub</span>
            <span className="hhh-land-nav__brand-tag">Silverage Care Services</span>
          </span>
        </a>

        <ul className="hhh-land-nav__links">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="hhh-land-nav__link">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <a href="#services" className="hhh-land-nav__cta">
          Explore Care Services
        </a>

        <button
          type="button"
          className="hhh-land-nav__toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="hhh-land-mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      <div className="hhh-land-nav__mobile">
        <div id="hhh-land-mobile-menu" className={`hhh-land-nav__mobile-panel${open ? ' is-open' : ''}`}>
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hhh-land-nav__mobile-link" onClick={handleLinkClick}>
              {link.label}
            </a>
          ))}
          <a href="#services" className="hhh-land-nav__mobile-cta" onClick={handleLinkClick}>
            Explore Care Services
          </a>
        </div>
      </div>
    </nav>
  );
}

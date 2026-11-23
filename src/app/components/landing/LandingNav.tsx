'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { RegistrationModal } from './RegistrationModal';

const LINKS = [
  { href: '#about', label: 'About' },
  { href: '#services', label: 'Our Services' },
  { href: '#academy', label: 'Caregiver Academy' },
  { href: '#faq', label: 'FAQs' },
  { href: '#contact', label: 'Contact' },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const registrationTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const closeRegistration = useCallback(() => setRegistrationOpen(false), []);

  function openRegistration(trigger: HTMLButtonElement) {
    registrationTriggerRef.current = trigger;
    setMenuOpen(false);
    setRegistrationOpen(true);
  }

  return (
    <>
      <nav className={`hhh-land-nav${scrolled ? ' hhh-land-nav--scrolled' : ''}`} aria-label="Primary">
        <div className="hhh-land-nav__bar">
          <a href="#top" className="hhh-land-nav__brand" aria-label="Happy Healthy Hub home">
            <Image
              src="/images/hhh-logo.webp"
              alt=""
              width={72}
              height={72}
              loading="eager"
            />
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

          <button
            type="button"
            className="hhh-land-nav__cta"
            onClick={(event) => openRegistration(event.currentTarget)}
          >
            Register
          </button>

          <button
            ref={menuButtonRef}
            type="button"
            className="hhh-land-nav__toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="hhh-land-mobile-menu"
            onClick={() => setMenuOpen((current) => !current)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="hhh-land-nav__mobile">
            <div id="hhh-land-mobile-menu" className="hhh-land-nav__mobile-panel is-open">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="hhh-land-nav__mobile-link"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <button
                type="button"
                className="hhh-land-nav__mobile-cta"
                onClick={(event) => openRegistration(event.currentTarget)}
              >
                Register with HHH
              </button>
            </div>
          </div>
        )}
      </nav>

      <RegistrationModal
        open={registrationOpen}
        onClose={closeRegistration}
        returnFocusRef={registrationTriggerRef}
      />
    </>
  );
}

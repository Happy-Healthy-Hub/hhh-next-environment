'use client';

import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { PhoneLoginForm } from './PhoneLoginForm';

/**
 * Phone + OTP is the primary staff sign-in flow (2026-11-18 migration).
 * Email/password (the pre-existing LoginForm) stays reachable only
 * through an explicit disclosure, and only outside a production build
 * -- mirrors the Flutter app's SignInScreen exactly, so the two
 * clients never disagree about what "demo login" means or when it's
 * available.
 */
export function StaffLoginFlow() {
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const isProduction = process.env.NODE_ENV === 'production';

  if (showPasswordLogin) {
    return (
      <>
        <LoginForm />
        {!isProduction && (
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--hhh-primary-teal)',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              marginTop: 'var(--hhh-space-md)',
              display: 'block',
            }}
            onClick={() => setShowPasswordLogin(false)}
          >
            Use mobile number instead
          </button>
        )}
      </>
    );
  }

  return (
    <>
      <PhoneLoginForm />
      {!isProduction && (
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--hhh-primary-teal)',
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: 0,
            marginTop: 'var(--hhh-space-md)',
            display: 'block',
          }}
          onClick={() => setShowPasswordLogin(true)}
        >
          Demo: sign in with email &amp; password
        </button>
      )}
    </>
  );
}

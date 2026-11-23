'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Phone + OTP sign-in (2026-11-18 "Final Phone OTP Architecture
 * Corrections" directive) -- the primary staff sign-in flow, same
 * architecture as the Flutter app's `HhhAuthRepository`. Supabase Auth
 * is never called for this: every request goes to this app's own
 * `/api/auth/phone/*` Route Handlers, which proxy to FastAPI
 * (`src/lib/phoneAuth/session.ts`). A successful verification's
 * access/refresh tokens never reach this component or any browser
 * JS -- the Route Handler sets them straight into an HttpOnly cookie.
 * Whether this account may use the portal is still decided after
 * sign-in, from that cookie's backend-sourced `roles` (src/lib/auth.ts)
 * -- a verified phone number grants nothing by itself.
 */

const INDIA_MOBILE = /^[6-9]\d{9}$/;

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-()]/g, '');
  let local = digits;
  if (local.startsWith('+91')) local = local.slice(3);
  else if (local.length === 12 && local.startsWith('91')) local = local.slice(2);
  else if (local.length === 11 && local.startsWith('0')) local = local.slice(1);
  return INDIA_MOBILE.test(local) ? `+91${local}` : null;
}

export function PhoneLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Plain boolean state instead of comparing Date.now() to a deadline
  // during render (an impure call in render, flagged by the React
  // Compiler's purity rule) -- a timeout flips this back after the
  // cooldown, so render itself only ever reads state.
  const [canResend, setCanResend] = useState(false);

  function startResendCooldown() {
    setCanResend(false);
    setTimeout(() => setCanResend(true), 30_000);
  }

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const response = await fetch('/api/auth/phone/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: normalized }),
    });
    setIsSubmitting(false);
    if (!response.ok) {
      // Same "never confirm whether the account exists" posture as
      // LoginForm's own email error message.
      setError('Could not send a verification code. Please try again.');
      return;
    }
    setPhoneE164(normalized);
    startResendCooldown();
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !phoneE164) return;
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const response = await fetch('/api/auth/phone/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: phoneE164, code }),
    });

    if (!response.ok) {
      setIsSubmitting(false);
      setError('Incorrect or expired code.');
      return;
    }

    router.replace('/admin');
    router.refresh();
  }

  async function resend() {
    if (!canResend || !phoneE164) return;
    setIsSubmitting(true);
    setError(null);
    const response = await fetch('/api/auth/phone/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: phoneE164 }),
    });
    setIsSubmitting(false);
    if (!response.ok) {
      setError('Could not resend the code. Please try again.');
      return;
    }
    startResendCooldown();
  }

  if (phoneE164) {
    return (
      <form onSubmit={verifyCode} noValidate>
        <p style={{ color: 'var(--hhh-secondary-text)', marginTop: 0 }}>
          Enter the 6-digit code sent to {phoneE164}.
        </p>
        <div style={{ marginBottom: 'var(--hhh-space-md)' }}>
          <label className="hhh-field-label" htmlFor="otp-code">
            Code
          </label>
          <input
            id="otp-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            className="hhh-text-field"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 'var(--hhh-space-md)',
          }}
        >
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: 'var(--hhh-primary-teal)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
            onClick={() => {
              setPhoneE164(null);
              setCode('');
              setError(null);
            }}
            disabled={isSubmitting}
          >
            Wrong number?
          </button>
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: 'var(--hhh-primary-teal)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
            onClick={resend}
            disabled={isSubmitting || !canResend}
          >
            Resend code
          </button>
        </div>
        {error && (
          <div role="alert" className="hhh-inline-alert" style={{ marginBottom: 'var(--hhh-space-md)' }}>
            {error}
          </div>
        )}
        <button type="submit" className="hhh-button-primary" style={{ width: '100%' }} disabled={isSubmitting}>
          {isSubmitting ? 'Verifying…' : 'Verify'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={requestCode} noValidate>
      <div style={{ marginBottom: 'var(--hhh-space-md)' }}>
        <label className="hhh-field-label" htmlFor="phone">
          Mobile number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="98765 43210"
          required
          className="hhh-text-field"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          disabled={isSubmitting}
        />
      </div>
      {error && (
        <div role="alert" className="hhh-inline-alert" style={{ marginBottom: 'var(--hhh-space-md)' }}>
          {error}
        </div>
      )}
      <button type="submit" className="hhh-button-primary" style={{ width: '100%' }} disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send code'}
      </button>
    </form>
  );
}

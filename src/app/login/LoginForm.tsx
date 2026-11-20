'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Email/password sign-in — the same method the Flutter customer app uses
 * (see lib/features/authentication). Deliberately not a role selector or
 * any other client-chosen access level: whether this account may use the
 * portal is decided after sign-in, by reading `user_roles` server-side
 * (src/lib/auth.ts), never by anything chosen here.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      // Deliberately does not say whether the account exists, matching
      // the Flutter app's sign-in error handling
      // (invalid_credentials in supabase_error_mapper.dart).
      setError('Unable to sign in with those details. Check your email and password and try again.');
      setIsSubmitting(false);
      return;
    }

    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ marginBottom: 'var(--hhh-space-md)' }}>
        <label className="hhh-field-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="hhh-text-field"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
        />
      </div>
      <div style={{ marginBottom: 'var(--hhh-space-md)' }}>
        <label className="hhh-field-label" htmlFor="password">
          Password
        </label>
        <div style={{ display: 'flex', gap: 'var(--hhh-space-sm)' }}>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className="hhh-text-field"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
          />
          <button
            type="button"
            className="hhh-button-outlined"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((value) => !value)}
            disabled={isSubmitting}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {error && (
        <div role="alert" className="hhh-inline-alert" style={{ marginBottom: 'var(--hhh-space-md)' }}>
          {error}
        </div>
      )}
      <button type="submit" className="hhh-button-primary" style={{ width: '100%' }} disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

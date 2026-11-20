import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PHONE_SESSION_COOKIE,
  PhoneAuthApiError,
  clearPhoneSessionCookie,
  isExpiringSoon,
  readPhoneSessionCookie,
  refreshPhoneSession,
  requestPhoneOtp,
  resendPhoneOtp,
  revokePhoneSession,
  setPhoneSessionCookie,
  verifyPhoneOtp,
  type PhoneSessionCookie,
} from '../session';

/**
 * FastAPI-owned phone+OTP session (2026-11-18 "Final Phone OTP
 * Architecture Corrections" directive). No live backend here -- a
 * mocked `fetch` stands in, same posture as the Flutter app's own
 * `HhhAuthRepository` tests (fake HTTP transport, not a live server).
 */

function fakeSession(overrides: Partial<PhoneSessionCookie> = {}): PhoneSessionCookie {
  return {
    accessToken: 'access.token.value',
    refreshToken: 'refresh-token-value',
    profileId: '11111111-1111-1111-1111-111111111111',
    phoneNumber: '+919876543210',
    roles: [],
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

class FakeCookieJar {
  private readonly store = new Map<string, string>();

  get(name: string) {
    const value = this.store.get(name);
    return value === undefined ? undefined : { value };
  }

  set(name: string, value: string, options: Record<string, unknown> = {}) {
    this.store.set(name, value);
    void options; // part of the cookie-jar shape; this fake doesn't need it
  }
}

describe('readPhoneSessionCookie / setPhoneSessionCookie / clearPhoneSessionCookie', () => {
  it('round-trips a session through the cookie jar', () => {
    const jar = new FakeCookieJar();
    const session = fakeSession();

    setPhoneSessionCookie(jar, session);
    expect(readPhoneSessionCookie(jar)).toEqual(session);

    clearPhoneSessionCookie(jar);
    expect(readPhoneSessionCookie(jar)).toBeNull();
  });

  it('returns null for a missing or malformed cookie', () => {
    const jar = new FakeCookieJar();
    expect(readPhoneSessionCookie(jar)).toBeNull();

    jar.set(PHONE_SESSION_COOKIE, 'not json', {});
    expect(readPhoneSessionCookie(jar)).toBeNull();
  });
});

describe('isExpiringSoon', () => {
  it('is false for a session well within its lifetime', () => {
    expect(isExpiringSoon(fakeSession())).toBe(false);
  });

  it('is true for a session expiring within the next minute', () => {
    expect(
      isExpiringSoon(fakeSession({ expiresAt: new Date(Date.now() + 30_000).toISOString() }))
    ).toBe(true);
  });

  it('is true for an already-expired session', () => {
    expect(
      isExpiringSoon(fakeSession({ expiresAt: new Date(Date.now() - 1_000).toISOString() }))
    ).toBe(true);
  });
});

describe('requestPhoneOtp / resendPhoneOtp', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('posts the phone number to FastAPI and returns the expiry', async () => {
    let capturedUrl = '';
    let capturedBody = '';
    global.fetch = (async (url: string, init?: { body?: string }) => {
      capturedUrl = url;
      capturedBody = init?.body ?? '';
      return new Response(JSON.stringify({ expires_in_seconds: 300 }), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await requestPhoneOtp('+919876543210');

    expect(result).toEqual({ expires_in_seconds: 300 });
    expect(capturedUrl).toContain('/api/v1/auth/phone/request-otp');
    expect(JSON.parse(capturedBody)).toEqual({ phone_number: '+919876543210' });
  });

  it('throws PhoneAuthApiError with the backend detail on failure', async () => {
    global.fetch = vi.fn(
      async () => new Response(JSON.stringify({ detail: 'Too many requests.' }), { status: 429 })
    ) as unknown as typeof fetch;

    await expect(resendPhoneOtp('+919876543210')).rejects.toMatchObject({
      status: 429,
      detail: 'Too many requests.',
    });
  });
});

describe('verifyPhoneOtp', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps the backend response into a PhoneSessionCookie', async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            verified: true,
            access_token: 'access.token.value',
            refresh_token: 'refresh-token-value',
            user_id: '11111111-1111-1111-1111-111111111111',
            roles: ['care_coordinator'],
          }),
          { status: 200 }
        )
    ) as unknown as typeof fetch;

    const session = await verifyPhoneOtp('+919876543210', '123456');

    expect(session.accessToken).toBe('access.token.value');
    expect(session.refreshToken).toBe('refresh-token-value');
    expect(session.profileId).toBe('11111111-1111-1111-1111-111111111111');
    expect(session.phoneNumber).toBe('+919876543210');
    expect(session.roles).toEqual(['care_coordinator']);
    expect(isExpiringSoon(session)).toBe(false);
  });

  it('throws PhoneAuthApiError on an incorrect code', async () => {
    global.fetch = vi.fn(
      async () => new Response(JSON.stringify({ detail: 'Incorrect code.' }), { status: 400 })
    ) as unknown as typeof fetch;

    await expect(verifyPhoneOtp('+919876543210', '000000')).rejects.toBeInstanceOf(PhoneAuthApiError);
  });
});

describe('refreshPhoneSession', () => {
  const originalFetch = global.fetch;
  const stale = fakeSession();

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns a rotated session on success', async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            verified: true,
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            user_id: stale.profileId,
            roles: [],
          }),
          { status: 200 }
        )
    ) as unknown as typeof fetch;

    const refreshed = await refreshPhoneSession(stale);

    expect(refreshed).not.toBeNull();
    expect(refreshed!.accessToken).toBe('new-access-token');
    expect(refreshed!.refreshToken).toBe('new-refresh-token');
  });

  it('returns null (not a throw) when the refresh token is rejected', async () => {
    global.fetch = vi.fn(
      async () => new Response(JSON.stringify({ detail: 'Invalid refresh token' }), { status: 401 })
    ) as unknown as typeof fetch;

    expect(await refreshPhoneSession(stale)).toBeNull();
  });

  it('keeps the stale session on a transient network/server failure', async () => {
    global.fetch = vi.fn(async () => new Response('bad gateway', { status: 502 })) as unknown as typeof fetch;

    expect(await refreshPhoneSession(stale)).toEqual(stale);
  });
});

describe('revokePhoneSession', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('never throws even when the backend call fails', async () => {
    global.fetch = vi.fn(async () => new Response('error', { status: 500 })) as unknown as typeof fetch;
    await expect(revokePhoneSession('refresh-token-value')).resolves.toBeUndefined();
  });
});

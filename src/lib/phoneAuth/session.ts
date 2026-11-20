/**
 * FastAPI-owned phone+OTP session for the Operations Portal
 * (2026-11-18 "Final Phone OTP Architecture Corrections" directive).
 *
 * Supabase Auth is never called for phone OTP generation, delivery or
 * verification -- all of it goes through FastAPI's `/auth/phone/*`
 * endpoints (same backend, same contract, as the Flutter app's
 * `HhhAuthRepository`). The session this produces is independent of
 * the Supabase session `src/lib/supabase/*` manages: it lives in a
 * single HttpOnly cookie (never readable or writable by browser JS),
 * written only by this module's own server-side code after reading a
 * FastAPI response -- so `roles` here is "trusted backend data", not
 * client-supplied, even though it rides in a cookie for convenience.
 */

import type { NextResponse } from 'next/server';

const API_BASE_URL = process.env.HHH_API_URL ?? 'http://localhost:8000';

export const PHONE_SESSION_COOKIE = 'hhh_phone_session';

// Matches the backend's default PHONE_REFRESH_TOKEN_TTL_SECONDS
// (app/core/config.py) -- the cookie's own lifetime should outlive a
// single access-token cycle so a returning staff member doesn't have
// to re-verify an OTP just because the browser was closed overnight.
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

// Matches the backend's default PHONE_ACCESS_TOKEN_TTL_SECONDS. The
// verify/refresh responses don't echo the expiry back, so -- same
// assumption the Flutter app makes -- this is the backend's documented
// default, not a value read off the wire.
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

export interface PhoneSessionCookie {
  accessToken: string;
  refreshToken: string;
  profileId: string;
  phoneNumber: string;
  roles: string[];
  /** ISO timestamp; see ACCESS_TOKEN_TTL_MS for how this is derived. */
  expiresAt: string;
}

export class PhoneAuthApiError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = 'PhoneAuthApiError';
  }
}

async function callPhoneAuthApi<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/phone${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!response.ok) {
    let detail = 'Request failed';
    try {
      const errorBody = await response.json();
      detail = errorBody.detail ?? detail;
    } catch {
      // response wasn't JSON
    }
    throw new PhoneAuthApiError(response.status, detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function requestPhoneOtp(phoneNumber: string): Promise<{ expires_in_seconds: number }> {
  return callPhoneAuthApi('/request-otp', { phone_number: phoneNumber });
}

export function resendPhoneOtp(phoneNumber: string): Promise<{ expires_in_seconds: number }> {
  return callPhoneAuthApi('/resend-otp', { phone_number: phoneNumber });
}

interface VerifyOrRefreshResponse {
  verified: boolean;
  access_token: string;
  refresh_token: string;
  user_id: string;
  roles: string[];
}

export async function verifyPhoneOtp(phoneNumber: string, code: string): Promise<PhoneSessionCookie> {
  const result = await callPhoneAuthApi<VerifyOrRefreshResponse>('/verify-otp', {
    phone_number: phoneNumber,
    code,
  });
  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    profileId: result.user_id,
    phoneNumber,
    roles: result.roles,
    expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString(),
  };
}

/** Returns `null` (rather than throwing) on an invalid/expired refresh
 * token -- callers treat that the same as "no session": clear the
 * cookie and send the user back to sign in, never surface a 500 for
 * what is an ordinary session expiry. */
export async function refreshPhoneSession(stale: PhoneSessionCookie): Promise<PhoneSessionCookie | null> {
  try {
    const result = await callPhoneAuthApi<VerifyOrRefreshResponse>('/refresh', {
      refresh_token: stale.refreshToken,
    });
    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      profileId: result.user_id,
      phoneNumber: stale.phoneNumber,
      roles: result.roles,
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString(),
    };
  } catch (error) {
    if (error instanceof PhoneAuthApiError && error.status === 401) return null;
    // Network/5xx: leave the stale session in place rather than
    // signing the user out over a transient backend error.
    return stale;
  }
}

/** Best-effort -- the cookie is cleared by the caller regardless of
 * whether the backend could revoke the refresh token server-side. */
export async function revokePhoneSession(refreshToken: string): Promise<void> {
  try {
    await callPhoneAuthApi('/sign-out', { refresh_token: refreshToken });
  } catch {
    // See doc comment.
  }
}

export function isExpiringSoon(session: PhoneSessionCookie): boolean {
  return Date.parse(session.expiresAt) - Date.now() < 60_000;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}

/** Reads the cookie from anything exposing `.get(name)` -- both
 * `next/headers`'s `ReadonlyRequestCookies` and
 * `NextRequest.cookies`/`RequestCookies` satisfy this. */
export function readPhoneSessionCookie(
  cookies: { get(name: string): { value: string } | undefined }
): PhoneSessionCookie | null {
  const raw = cookies.get(PHONE_SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PhoneSessionCookie;
  } catch {
    return null;
  }
}

export function setPhoneSessionCookie(
  cookies: { set(name: string, value: string, options: Record<string, unknown>): void },
  session: PhoneSessionCookie
): void {
  cookies.set(PHONE_SESSION_COOKIE, JSON.stringify(session), cookieOptions());
}

export function clearPhoneSessionCookie(
  cookies: { set(name: string, value: string, options: Record<string, unknown>): void }
): void {
  cookies.set(PHONE_SESSION_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
}

/** Convenience for Route Handlers using the Web Response `Set-Cookie`
 * surface (`NextResponse.cookies`), which has the same `set` shape. */
export function setPhoneSessionOnResponse(response: NextResponse, session: PhoneSessionCookie): void {
  setPhoneSessionCookie(response.cookies, session);
}

export function clearPhoneSessionOnResponse(response: NextResponse): void {
  clearPhoneSessionCookie(response.cookies);
}

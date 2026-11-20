/**
 * FastAPI backend client for the Operations Portal.
 *
 * Gets the current Supabase session's access token and forwards it as a
 * Bearer token to the HHH FastAPI backend. Used server-side only (Server
 * Components, Server Actions, Route Handlers).
 */

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
  isExpiringSoon,
  readPhoneSessionCookie,
  refreshPhoneSession,
  setPhoneSessionCookie,
} from '@/lib/phoneAuth/session';

const API_BASE_URL = process.env.HHH_API_URL ?? 'http://localhost:8000';

class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

export { ApiError };

/**
 * Reads a valid access token for the signed-in user.
 *
 * `getSession()` alone is unsafe here: it returns whatever is in the
 * auth cookie without validating it. If the stored token has expired
 * (the default Supabase lifetime is one hour) the cookie still exists,
 * `getSession()` returns it, and FastAPI's JWT verifier rejects it with
 * `401 Not authenticated`. That is exactly the symptom reported from
 * the Operations Portal: a staff user signs in, leaves the tab open
 * long enough for the token to expire, clicks "Approve" and sees
 * "Not Authenticated" even though the page itself rendered fine
 * (middleware runs `getUser()` on every navigation, which does refresh,
 * but a server action does not go through middleware).
 *
 * `getUser()` round-trips to Supabase to validate the token. When the
 * token is close to expiry (or has just expired), the `@supabase/ssr`
 * client uses the refresh token to mint a new access token and writes
 * the refreshed cookies through the `setAll` callback we gave the
 * server client. Only after that validation do we pull the (now
 * refreshed) access token out of the session and hand it to FastAPI.
 *
 * A server action can write cookies, so the refreshed token persists
 * for subsequent requests from the same tab. If validation itself
 * fails (no session, revoked refresh token) we return `null` and the
 * caller raises a clean 401 instead of forwarding a stale token.
 */
async function getAccessToken(): Promise<string | null> {
  // A FastAPI-owned phone session (2026-11-18 migration) takes priority
  // -- the two session kinds are mutually exclusive in practice. Same
  // proactive-refresh approach as the Flutter app's ApiClient: checked
  // and refreshed here, before the request that needs it, rather than
  // reactively on a 401.
  const cookieStore = await cookies();
  const phoneSession = readPhoneSessionCookie(cookieStore);
  if (phoneSession) {
    if (!isExpiringSoon(phoneSession)) return phoneSession.accessToken;
    const refreshed = await refreshPhoneSession(phoneSession);
    if (!refreshed) return null;
    try {
      setPhoneSessionCookie(cookieStore, refreshed);
    } catch {
      // Called from a Server Component where cookies can't be written
      // -- same tolerated limitation as src/lib/supabase/server.ts's
      // own setAll. middleware.ts refreshes the cookie regardless.
    }
    return refreshed.accessToken;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

  const token = await getAccessToken();
  if (!token) {
    throw new ApiError(401, 'Not authenticated');
  }

  let url = `${API_BASE_URL}/api/v1${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) searchParams.set(key, String(value));
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
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
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

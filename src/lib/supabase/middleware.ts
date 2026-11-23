import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  clearPhoneSessionOnResponse,
  isExpiringSoon,
  readPhoneSessionCookie,
  refreshPhoneSession,
  setPhoneSessionOnResponse,
} from '@/lib/phoneAuth/session';

/**
 * Refreshes the active session on every request and redirects
 * unauthenticated users away from protected routes. This is the actual
 * authentication enforcement boundary for routing — never a client-side
 * check alone (DESIGN.md section 8.4: "access must be enforced by the
 * backend"). Role/permission checks beyond "is signed in" still happen
 * per-page and, ultimately, in RLS and the trusted database functions
 * (Supabase session) or FastAPI's own service-role role lookup (phone
 * session -- 2026-11-18 migration; see `src/lib/phoneAuth/session.ts`).
 *
 * The two session kinds are mutually exclusive in practice, so a
 * present phone-session cookie is checked first and, if valid (or
 * refreshable), short-circuits the Supabase check entirely.
 */
export async function updateSession(request: NextRequest) {
  const phoneResult = await checkAndRefreshPhoneSession(request);
  if (phoneResult) return phoneResult;

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // No backend configured: do not silently let protected routes
    // through. The login page itself remains reachable so it can show
    // the real configuration/authentication error instead of looping.
    return isPublicAdminPath(request.nextUrl.pathname)
      ? NextResponse.next({ request })
      : redirectToLogin(request);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = isPublicAdminPath(pathname);

  if (!user && !isPublicPath) {
    return redirectToLogin(request);
  }

  return response;
}

/**
 * Returns a response to use immediately when a phone session cookie is
 * present (refreshing it first if it's close to expiry), or `null` when
 * there is no phone session at all -- the caller then falls through to
 * the ordinary Supabase check. A phone session that turns out to be
 * invalid (refresh rejected) is treated as "signed out": the cookie is
 * cleared and, on a protected path, the request is redirected to login
 * -- it never falls through to the Supabase check, since a stale phone
 * cookie says nothing about whether a Supabase session also exists.
 */
async function checkAndRefreshPhoneSession(request: NextRequest): Promise<NextResponse | null> {
  const session = readPhoneSessionCookie(request.cookies);
  if (!session) return null;

  const { pathname } = request.nextUrl;
  const isPublicPath = isPublicAdminPath(pathname);

  if (!isExpiringSoon(session)) {
    return isPublicPath ? null : NextResponse.next({ request });
  }

  const refreshed = await refreshPhoneSession(session);
  if (!refreshed) {
    if (isPublicPath) {
      const response = NextResponse.next({ request });
      clearPhoneSessionOnResponse(response);
      return response;
    }
    const response = redirectToLogin(request);
    clearPhoneSessionOnResponse(response);
    return response;
  }

  const response = NextResponse.next({ request });
  setPhoneSessionOnResponse(response, refreshed);
  return response;
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  loginUrl.search = '';
  return NextResponse.redirect(loginUrl);
}

function isPublicAdminPath(pathname: string) {
  return pathname === '/admin/login';
}

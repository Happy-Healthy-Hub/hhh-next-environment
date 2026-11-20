import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Server-side Supabase client for Server Components, Route Handlers and
 * Server Actions. Reads/writes the auth session via cookies, which the
 * root `middleware.ts` keeps refreshed. Still only the publishable/anon
 * key — authorisation is enforced by RLS and the trusted database
 * functions, not by this client holding elevated privilege.
 *
 * `await connection()` tells Next.js this render is genuinely per-request
 * (it reads the request's own cookies), fixing the dev-overlay's "Next.js
 * encountered the unstable value Date.now() while prerendering" error on
 * /workers and /requests -- that Date.now() call is Supabase's own auth
 * client checking session expiry inside loadStaffSession(), not anything
 * this app calls directly, and there is no static shell to prerender for
 * an authenticated, per-user portal page regardless.
 */
export async function createClient() {
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set (see .env.local.example).'
    );
  }
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies can't be written
          // (e.g. a page render, as opposed to a Server Action or Route
          // Handler). Safe to ignore here: middleware.ts refreshes the
          // session on every request regardless.
        }
      },
    },
  });
}

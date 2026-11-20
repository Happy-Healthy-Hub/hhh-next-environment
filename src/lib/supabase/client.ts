import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client. Uses only the publishable/anon key via
 * NEXT_PUBLIC_* env vars — these are safe to ship to the browser, the same
 * way the Flutter app ships its own publishable key. The service-role key
 * must never appear here or in any NEXT_PUBLIC_* variable.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set (see .env.local.example).'
    );
  }
  return createBrowserClient(url, key);
}

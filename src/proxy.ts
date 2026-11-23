import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Refresh and enforce authentication for every canonical admin URL.
 * Page-level role checks and backend authorization remain the final boundary.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ['/admin/:path*'],
};

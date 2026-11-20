import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/demo/config';
import { clearDemoSession } from '@/lib/demo/auth';
import { clearPhoneSessionOnResponse, readPhoneSessionCookie, revokePhoneSession } from '@/lib/phoneAuth/session';

export async function POST(request: Request) {
  if (isDemoMode()) {
    await clearDemoSession();
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // A phone session (2026-11-18 migration) and a Supabase session are
  // mutually exclusive in practice, but checking the phone cookie
  // unconditionally and clearing it on the response either way is
  // cheap and means this one route stays the single sign-out
  // destination for every session kind, matching StaffLoginFlow's
  // "the two clients never disagree about what demo login means"
  // posture for sign-in.
  const cookieStore = await cookies();
  const phoneSession = readPhoneSessionCookie(cookieStore);
  const response = NextResponse.redirect(new URL('/login', request.url));
  if (phoneSession) {
    await revokePhoneSession(phoneSession.refreshToken);
    clearPhoneSessionOnResponse(response);
    return response;
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  return response;
}

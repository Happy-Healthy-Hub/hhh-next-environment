import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { clearPhoneSessionOnResponse, readPhoneSessionCookie, revokePhoneSession } from '@/lib/phoneAuth/session';

/** Revokes the phone session's refresh token server-side (best effort)
 * and always clears the local cookie, mirroring Supabase sign-out's
 * own "clear the local session regardless" behaviour. */
export async function POST() {
  const cookieStore = await cookies();
  const session = readPhoneSessionCookie(cookieStore);

  if (session) await revokePhoneSession(session.refreshToken);

  const response = NextResponse.json(null, { status: 204 });
  clearPhoneSessionOnResponse(response);
  return response;
}

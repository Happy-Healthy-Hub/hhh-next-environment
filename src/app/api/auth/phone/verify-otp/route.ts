import { NextResponse, type NextRequest } from 'next/server';
import { PhoneAuthApiError, setPhoneSessionOnResponse, verifyPhoneOtp } from '@/lib/phoneAuth/session';

/**
 * BFF proxy to FastAPI's `/auth/phone/verify-otp`. On success this is
 * the only place the session is minted: the response never echoes the
 * access/refresh tokens back to the page -- they go straight into an
 * HttpOnly cookie set on this same response, so the tokens never touch
 * browser JS at all.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const phoneNumber = typeof body?.phoneNumber === 'string' ? body.phoneNumber : null;
  const code = typeof body?.code === 'string' ? body.code : null;
  if (!phoneNumber || !code) {
    return NextResponse.json({ detail: 'phoneNumber and code are required' }, { status: 422 });
  }

  try {
    const session = await verifyPhoneOtp(phoneNumber, code);
    const response = NextResponse.json({ verified: true });
    setPhoneSessionOnResponse(response, session);
    return response;
  } catch (error) {
    if (error instanceof PhoneAuthApiError) {
      return NextResponse.json({ detail: error.detail }, { status: error.status });
    }
    return NextResponse.json({ detail: 'Could not reach the authentication service.' }, { status: 502 });
  }
}

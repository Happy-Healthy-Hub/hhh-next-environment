import { NextResponse, type NextRequest } from 'next/server';
import { PhoneAuthApiError, requestPhoneOtp } from '@/lib/phoneAuth/session';

/** BFF proxy to FastAPI's `/auth/phone/request-otp`. A thin passthrough
 * -- this route never touches cookies, since a request/resend never
 * produces a session by itself. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const phoneNumber = typeof body?.phoneNumber === 'string' ? body.phoneNumber : null;
  if (!phoneNumber) {
    return NextResponse.json({ detail: 'phoneNumber is required' }, { status: 422 });
  }

  try {
    const result = await requestPhoneOtp(phoneNumber);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PhoneAuthApiError) {
      return NextResponse.json({ detail: error.detail }, { status: error.status });
    }
    return NextResponse.json({ detail: 'Could not reach the authentication service.' }, { status: 502 });
  }
}

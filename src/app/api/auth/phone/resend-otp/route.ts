import { NextResponse, type NextRequest } from 'next/server';
import { PhoneAuthApiError, resendPhoneOtp } from '@/lib/phoneAuth/session';

/** BFF proxy to FastAPI's `/auth/phone/resend-otp`. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const phoneNumber = typeof body?.phoneNumber === 'string' ? body.phoneNumber : null;
  if (!phoneNumber) {
    return NextResponse.json({ detail: 'phoneNumber is required' }, { status: 422 });
  }

  try {
    const result = await resendPhoneOtp(phoneNumber);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PhoneAuthApiError) {
      return NextResponse.json({ detail: error.detail }, { status: error.status });
    }
    return NextResponse.json({ detail: 'Could not reach the authentication service.' }, { status: 502 });
  }
}

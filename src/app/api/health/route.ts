import { NextResponse } from 'next/server'

export async function GET() {
  const missingMobileAuthConfig: string[] = [];

  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!googleClientId) {
    missingMobileAuthConfig.push("GOOGLE_CLIENT_ID");
  }

  const mobileJwtSecret = process.env.MOBILE_JWT_SECRET;
  if (!mobileJwtSecret) {
    missingMobileAuthConfig.push("MOBILE_JWT_SECRET");
  } else if (mobileJwtSecret.length < 32) {
    missingMobileAuthConfig.push("MOBILE_JWT_SECRET (min 32 chars)");
  }

  const mobileAuthReady = missingMobileAuthConfig.length === 0;
  const statusCode = mobileAuthReady ? 200 : 503;

  return NextResponse.json(
    {
      status: mobileAuthReady ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'spotter-app',
      checks: {
        mobileAuth: {
          ready: mobileAuthReady,
          missing: missingMobileAuthConfig,
        },
      },
    },
    { status: statusCode }
  );
}

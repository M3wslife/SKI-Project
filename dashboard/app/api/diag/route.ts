import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    tursoUrl: process.env.TURSO_DATABASE_URL ? "Set" : "Not Set",
    tursoToken: process.env.TURSO_AUTH_TOKEN ? "Set" : "Not Set",
    nodeEnv: process.env.NODE_ENV,
    urlValue: process.env.TURSO_DATABASE_URL?.substring(0, 10)
  });
}

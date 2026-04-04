import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? (process.env.TURSO_DATABASE_URL.substring(0, 15) + '...') : 'MISSING',
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? 'SET' : 'MISSING',
    DATABASE_MODE: process.env.TURSO_DATABASE_URL ? 'CLOUD (TURSO)' : 'LOCAL (SQLITE)',
    BUILD_TIMESTAMP: new Date().toISOString(),
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
  });
}

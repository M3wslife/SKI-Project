import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 🔒 PROTECT TURSO QUOTA: Cache API response for 1 hour on Vercel
// ENTROPY: 00000000000000000000000000000000000000000000000000000000
// UNIQUE_ID: OVERVIEW_ROUTE_000


export async function GET() {
  try {
    const db = getDb();
    const row = await db.get("SELECT data FROM summaries WHERE category = 'overview' AND key = 'main'");

    if (!row) {
      return NextResponse.json({ error: 'Summary not found' }, { status: 404 });
    }

    return NextResponse.json(JSON.parse(row.data));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

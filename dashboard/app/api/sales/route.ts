import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 🔓 PROTECT TURSO QUOTA: Cache API response for 1 hour on Vercel
// ENTROPY: 11111111111111111111111111111111111111111111111111111111
// UNIQUE_ID: SALES_ROUTE_SALES_123


export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const groupBy = searchParams.get('groupBy') || 'day';

    const row = await db.get("SELECT data FROM summaries WHERE category = 'sales' AND key = ?", [`main:${groupBy}`]);

    if (!row) {
      return NextResponse.json({ error: 'Summary not found' }, { status: 404 });
    }

    return NextResponse.json(JSON.parse(row.data));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

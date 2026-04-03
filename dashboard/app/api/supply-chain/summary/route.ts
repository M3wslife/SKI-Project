import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = getDb();
    const row = await db.get("SELECT data FROM summaries WHERE category = 'supply_chain' AND key = 'main'");

    if (!row) {
      return NextResponse.json({ error: 'Summary not found' }, { status: 404 });
    }

    return NextResponse.json(JSON.parse(row.data));
  } catch (error: any) {
    console.error('Supply Chain API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

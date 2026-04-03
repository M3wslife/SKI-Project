import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 🔓 PROTECT TURSO QUOTA: Cache API response for 1 hour on Vercel
// ENTROPY: 4723948723948723948723948723948723948723948723948723948723
// UNIQUE_ID: PL_ROUTE_777_888_999_ABC


export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const month = searchParams.get('month') || '';

    // Query pre-calculated summary
    const key = year === 'all' ? 'main:all:' : `main:${year}:${month}`;
    const row = await db.get("SELECT data FROM summaries WHERE category = 'pl' AND key = ?", [key]);

    if (!row) {
      // If specific month not found, maybe it's just not generated yet, or use yearly
      const yearsRow = await db.get("SELECT data FROM summaries WHERE category = 'pl' AND key = 'available_years'");
      const years = yearsRow ? JSON.parse(yearsRow.data) : [];
      return NextResponse.json({ 
        summary: { total_orders: 0, total_revenue: 0, total_vat: 0, total_net: 0, avg_order_value: 0 },
        rows: [],
        years,
        assignees: [],
        channels: [],
        itemChannels: [],
        shops: [],
        monthlyData: [],
        gradeData: []
      });
    }

    const data = JSON.parse(row.data);
    const yearsRow = await db.get("SELECT data FROM summaries WHERE category = 'pl' AND key = 'available_years'");
    const years = yearsRow ? JSON.parse(yearsRow.data) : [];

    return NextResponse.json({ 
      ...data,
      summary: data.totals, // Map internal 'totals' to expected 'summary'
      rows: data.dailyRows || [],
      years,
      itemChannels: data.channels // Compatibility
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

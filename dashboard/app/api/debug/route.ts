import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    
    // 1. Check Row Counts
    const invoiceCount = await db.get("SELECT COUNT(*) as count FROM invoices");
    const itemCount = await db.get("SELECT COUNT(*) as count FROM invoice_items");
    const summaryCount = await db.get("SELECT COUNT(*) as count FROM summaries");

    // 2. Check Samples
    const samples = await db.all("SELECT id, timestamp, status FROM invoices LIMIT 3");
    
    // 3. Test Year Filter
    const test2026 = await db.get(`
      SELECT COUNT(*) as count FROM invoices i 
      WHERE strftime('%Y', datetime(i.timestamp/1000, 'unixepoch')) = '2026'
    `);

    return NextResponse.json({
      counts: { invoices: invoiceCount.count, items: itemCount.count, summaries: summaryCount.count },
      samples,
      test2026
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

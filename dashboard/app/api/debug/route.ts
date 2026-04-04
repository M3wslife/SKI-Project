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

    // 2. Check Indexes
    const indexes = await db.all("SELECT * FROM sqlite_master WHERE type = 'index'");

    // 3. Explain Query Plan for a typical filtered query
    const explainPlan = await db.all(`
      EXPLAIN QUERY PLAN
      SELECT * FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      WHERE i.assignee_name = 'วีระชัย'
    `);

    return NextResponse.json({
      counts: { invoices: invoiceCount.count, items: itemCount.count, summaries: summaryCount.count },
      indexes,
      explainPlan
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

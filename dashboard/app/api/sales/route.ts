import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const groupBy = searchParams.get('groupBy') || 'day';

    let dateFormat = '%Y-%m-%d';
    if (groupBy === 'month') dateFormat = '%Y-%m';
    else if (groupBy === 'week') dateFormat = '%Y-W%W';

    // Revenue time series from invoice_items
    const timeSeries = await db.all(`
      SELECT 
        strftime('${dateFormat}', datetime(it.timestamp/1000, 'unixepoch')) as period,
        COUNT(DISTINCT it.invoice_id) as orders,
        ROUND(SUM(it.pre_tax_amount), 0) as revenue,
        ROUND(SUM(it.net_amount), 0) as net_amount
      FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      WHERE i.status NOT IN ('VOIDED')
      GROUP BY period
      ORDER BY period ASC
      LIMIT 30
    `);

    // Top 10 SKUs by revenue
    const topSkus = await db.all(`
      SELECT it.sku, it.name,
        ROUND(SUM(it.quantity), 0) as qty,
        ROUND(SUM(it.pre_tax_amount), 0) as revenue
      FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      WHERE i.status NOT IN ('VOIDED')
      GROUP BY it.sku
      ORDER BY revenue DESC
      LIMIT 10
    `);

    // Top 10 customers
    const topCustomers = await db.all(`
      SELECT 
        i.customer_name as name,
        ROUND(SUM(it.pre_tax_amount), 0) as revenue
      FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      WHERE i.status NOT IN ('VOIDED')
      GROUP BY name
      ORDER BY revenue DESC
      LIMIT 10
    `);

    // Invoice status breakdown
    const statusBreakdown = await db.all(`
      SELECT status as name, COUNT(*) as value
      FROM invoices
      GROUP BY status
    `);

    return NextResponse.json({ timeSeries, topSkus, topCustomers, statusBreakdown });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const revalidate = 3600; // 🔒 PROTECT TURSO QUOTA: Cache API response for 1 hour on Vercel


export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const groupBy = searchParams.get('groupBy') || 'day';

    // 🟢 QUOTA OPTIMIZATION: Check summaries first
    const cacheKey = `main:${groupBy}`;
    const row = await db.get("SELECT data FROM summaries WHERE category = 'sales' AND key = ?", [cacheKey]);
    
    if (row) {
      console.log(`[ACL] Sales cache hit for: ${cacheKey}`);
      return NextResponse.json(JSON.parse(row.data));
    }

    console.log(`[ACL] Sales cache miss for: ${cacheKey}. Running raw SQL...`);

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

    const result = { timeSeries, topSkus, topCustomers, statusBreakdown };

    // 🟢 LAZY MATERIALIZATION: Cache the result
    try {
      await db.run(`
        INSERT INTO summaries (category, key, data, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(category, key) DO UPDATE SET
          data = excluded.data,
          updated_at = CURRENT_TIMESTAMP
      `, ['sales', cacheKey, JSON.stringify(result)]);
    } catch (err) {
      console.warn('[ACL] Failed to cache sales summary:', err);
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

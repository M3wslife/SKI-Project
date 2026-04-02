import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 🔒 PROTECT TURSO QUOTA: Cache API response for 1 hour on Vercel


export async function GET() {
  try {
    const db = getDb();

    // KPI summary from invoice_items
    const kpis = await db.get(`
      SELECT
        COUNT(DISTINCT it.invoice_id) as total_orders,
        ROUND(SUM(it.pre_tax_amount), 0) as total_revenue,
        ROUND(SUM(it.pre_tax_amount) / COUNT(DISTINCT it.invoice_id), 0) as avg_order_value,
        ROUND(SUM(it.net_amount), 0) as total_net
      FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      WHERE i.status NOT IN ('VOIDED')
    `) as { total_orders: number; total_revenue: number; avg_order_value: number; total_net: number };

    // Active SKU count
    const skuCount = await db.get(`
      SELECT COUNT(DISTINCT product_id) as active_skus,
        ROUND(SUM(available), 0) as total_available
      FROM inventory_warehouse_stock
      WHERE available > 0
    `) as { active_skus: number; total_available: number };

    // Revenue by day trend
    const revenueTrend = await db.all(`
      SELECT 
        strftime('%Y-%m-%d', datetime(it.timestamp/1000, 'unixepoch')) as date,
        COUNT(DISTINCT it.invoice_id) as orders,
        ROUND(SUM(it.pre_tax_amount), 0) as revenue
      FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      WHERE i.status NOT IN ('VOIDED')
      GROUP BY date
      ORDER BY date ASC
      LIMIT 30
    `);

    // Top 6 customers
    const topCustomers = await db.all(`
      SELECT 
        i.customer_name as name,
        ROUND(SUM(it.pre_tax_amount), 0) as revenue
      FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      WHERE i.status NOT IN ('VOIDED')
      GROUP BY name
      ORDER BY revenue DESC
      LIMIT 6
    `);

    // Total revenue for % calc
    const totalRev = (kpis.total_revenue || 0);
    const customersWithPct = topCustomers.map((c: any) => ({
      ...c,
      pct: totalRev > 0 ? Math.round((c.revenue / totalRev) * 100 * 10) / 10 : 0
    }));

    // Invoice status breakdown
    const statusBreakdown = await db.all(`
      SELECT status as id, COUNT(*) as value
      FROM invoices
      GROUP BY status
    `);

    // Top 5 SKUs
    const topSkus = await db.all(`
      SELECT it.sku, it.name,
        ROUND(SUM(it.quantity), 0) as qty,
        ROUND(SUM(it.pre_tax_amount), 0) as revenue
      FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      WHERE i.status NOT IN ('VOIDED')
      GROUP BY it.sku
      ORDER BY revenue DESC
      LIMIT 5
    `);

    return NextResponse.json({
      kpis: { ...kpis, ...skuCount },
      revenueTrend,
      topCustomers: customersWithPct,
      statusBreakdown,
      topSkus,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

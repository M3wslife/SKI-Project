import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 🔒 PROTECT TURSO QUOTA: Cache API response for 1 hour on Vercel


export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year') || '2026';
    const month = searchParams.get('month') || '';

    // Summary totals
    const summary = await db.get(`
      SELECT
        COUNT(DISTINCT it.invoice_id) as total_orders,
        ROUND(SUM(it.pre_tax_amount), 2) as total_revenue,
        ROUND(SUM(it.vat_amount), 2) as total_vat,
        ROUND(SUM(it.net_amount), 2) as total_net,
        ROUND(SUM(it.pre_tax_amount) / COUNT(DISTINCT it.invoice_id), 2) as avg_order_value
      FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      WHERE (strftime('%Y', datetime(it.timestamp/1000, 'unixepoch')) = ? OR ? = '')
      AND (strftime('%m', datetime(it.timestamp/1000, 'unixepoch')) = ? OR ? = '')
      AND i.status NOT IN ('VOIDED')
    `, [year, year, month, month]) as { total_orders: number; total_revenue: number; total_vat: number; total_net: number; avg_order_value: number };

    // Daily breakdown
    const rows = await db.all(`
      SELECT
        strftime('%Y-%m-%d', datetime(it.timestamp/1000, 'unixepoch')) as date,
        COUNT(DISTINCT it.invoice_id) as orders,
        ROUND(SUM(it.pre_tax_amount), 2) as revenue,
        ROUND(SUM(it.vat_amount), 2) as vat_amount,
        ROUND(SUM(it.net_amount), 2) as net_amount
      FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      WHERE (strftime('%Y', datetime(it.timestamp/1000, 'unixepoch')) = ? OR ? = '')
      AND (strftime('%m', datetime(it.timestamp/1000, 'unixepoch')) = ? OR ? = '')
      AND i.status NOT IN ('VOIDED')
      GROUP BY date
      ORDER BY date DESC
    `, [year, year, month, month]);

    // Assignees breakdown
    const assignees = await db.all(`
      SELECT
        COALESCE(i.assignee_name, 'Unassigned') as name,
        ROUND(SUM(it.pre_tax_amount), 2) as value
      FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      WHERE (strftime('%Y', datetime(i.timestamp/1000, 'unixepoch')) = ? OR ? = '')
      AND (strftime('%m', datetime(i.timestamp/1000, 'unixepoch')) = ? OR ? = '')
      AND i.status NOT IN ('VOIDED')
      GROUP BY 1
      ORDER BY value DESC
    `, [year, year, month, month]);

    // Channels breakdown using official sale_channel column
    const itemChannels = await db.all(`
      SELECT
        COALESCE(it.sale_channel, 'Other') as name,
        ROUND(SUM(it.pre_tax_amount), 2) as value
      FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      WHERE (strftime('%Y', datetime(i.timestamp/1000, 'unixepoch')) = ? OR ? = '')
      AND (strftime('%m', datetime(i.timestamp/1000, 'unixepoch')) = ? OR ? = '')
      AND i.status NOT IN ('VOIDED')
      GROUP BY 1
      ORDER BY value DESC
    `, [year, year, month, month]);

    // Shops breakdown using official shop_name column
    const shops = await db.all(`
      SELECT
        COALESCE(it.shop_name, 'Other') as name,
        ROUND(SUM(it.pre_tax_amount), 2) as value
      FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      WHERE (strftime('%Y', datetime(i.timestamp/1000, 'unixepoch')) = ? OR ? = '')
      AND (strftime('%m', datetime(i.timestamp/1000, 'unixepoch')) = ? OR ? = '')
      AND i.status NOT IN ('VOIDED')
      GROUP BY 1
      ORDER BY value DESC
      LIMIT 10
    `, [year, year, month, month]);

    // Monthly data for trend
    const monthlyData = await db.all(`
      SELECT
        strftime('%Y-%m', datetime(i.timestamp/1000, 'unixepoch')) as month,
        ROUND(SUM(it.pre_tax_amount), 2) as revenue,
        COUNT(DISTINCT i.id) as orders
      FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      WHERE (strftime('%Y', datetime(i.timestamp/1000, 'unixepoch')) = ? OR ? = '')
      GROUP BY month
      ORDER BY month ASC
    `, [year, year]);

    // Customer Grade breakdown (if column exists)
    let gradeData: any[] = [];
    try {
      gradeData = await db.all(`
        SELECT
          COALESCE(i.customer_grade, 'N/A') as name,
          ROUND(SUM(it.pre_tax_amount), 2) as value
        FROM invoice_items it
        JOIN invoices i ON it.invoice_id = i.id
        WHERE (strftime('%Y', datetime(it.timestamp/1000, 'unixepoch')) = ? OR ? = '')
        AND (strftime('%m', datetime(it.timestamp/1000, 'unixepoch')) = ? OR ? = '')
        AND i.status NOT IN ('VOIDED')
        GROUP BY 1
        ORDER BY value DESC
      `, [year, year, month, month]);
    } catch (e) {
      console.log('customer_grade column not found');
    }

    // Available years for filter
    const yearsResult = await db.all(`
      SELECT DISTINCT strftime('%Y', datetime(timestamp/1000, 'unixepoch')) as year
      FROM invoice_items
      ORDER BY year DESC
    `) as { year: string }[];
    const years = yearsResult.map(y => y.year);

    return NextResponse.json({ 
      summary, 
      rows, 
      years, 
      assignees, 
      channels: itemChannels,
      itemChannels, 
      shops,
      monthlyData, 
      gradeData 
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

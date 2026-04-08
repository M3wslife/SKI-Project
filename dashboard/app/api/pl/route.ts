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
    
    // NEW FILTERS
    const assignee = searchParams.get('assignee') || '';
    const shop = searchParams.get('shop') || '';
    const channel = searchParams.get('channel') || '';
    const statusesParam = searchParams.get('statuses') || ''; // Comma-separated
    const statuses = statusesParam ? statusesParam.split(',').filter(Boolean) : [];

    // 🟢 HYBRID CACHING STRATEGY
    // Construct a canonical cache key
    let cacheKey = `main:${year}:${month}`;
    if (assignee) cacheKey += `:filter:assignee:${assignee}`;
    if (shop) cacheKey += `:filter:shop:${shop}`;
    if (channel) cacheKey += `:filter:channel:${channel}`;
    if (statuses.length > 0) cacheKey += `:filter:statuses:${statuses.sort().join(',')}`;

    const cachedRow = await db.get("SELECT data FROM summaries WHERE category = 'pl' AND key = ?", [cacheKey]);
    if (cachedRow) {
      console.log(`[ACL] Cache hit for: ${cacheKey}`);
      const data = JSON.parse(cachedRow.data);
      
      // 🔓 QUOTA OPTIMIZATION: Get years from bundled data if possible
      let years = data.years;
      if (!years) {
        const yearsRow = await db.get("SELECT data FROM summaries WHERE category = 'pl' AND key = 'available_years'");
        years = yearsRow ? JSON.parse(yearsRow.data) : [];
      }

      return NextResponse.json({ 
        ...data,
        summary: data.totals || data.summary, 
        rows: data.dailyRows || data.rows || [],
        years,
        itemChannels: data.channels || data.itemChannels || []
      });
    }

    console.log(`[ACL] Cache miss for: ${cacheKey}. Running dynamic SQL...`);

    // DYNAMIC QUERY MODE
    // ------------------
    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (year !== 'all') {
      whereClause += " AND strftime('%Y', datetime(i.timestamp/1000, 'unixepoch')) = ?";
      params.push(year);
      if (month) {
        whereClause += " AND strftime('%m', datetime(i.timestamp/1000, 'unixepoch')) = ?";
        params.push(month);
      }
    }

    if (assignee) {
      whereClause += " AND i.assignee_name = ?";
      params.push(assignee);
    }
    if (shop) {
      whereClause += " AND i.shop_name = ?";
      params.push(shop);
    }
    if (channel) {
      whereClause += " AND ii.sale_channel = ?";
      params.push(channel);
    }
    if (statuses.length > 0) {
      const placeholders = statuses.map(() => '?').join(',');
      whereClause += ` AND i.status IN (${placeholders})`;
      params.push(...statuses);
    } else {
      // DEFAULT: Exclude VOIDED if no status filter is active
      whereClause += " AND i.status != 'VOIDED'";
    }

    // 1. Fetch Totals
    const totals = await db.get(`
      SELECT 
        COUNT(DISTINCT i.id) as total_orders,
        SUM(ii.pre_tax_amount) as total_revenue,
        SUM(ii.vat_amount) as total_vat,
        SUM(ii.net_amount) as total_net
      FROM invoices i
      JOIN invoice_items ii ON i.id = ii.invoice_id
      ${whereClause}
    `, params);

    if (totals && totals.total_revenue) {
        totals.avg_order_value = totals.total_revenue / (totals.total_orders || 1);
    } else {
        totals.total_revenue = 0;
        totals.total_orders = 0;
        totals.total_vat = 0;
        totals.total_net = 0;
        totals.avg_order_value = 0;
    }

    // 2. Fetch Daily Trend (for 'rows')
    const dailyRows = await db.all(`
      SELECT 
        date(i.timestamp/1000, 'unixepoch') as date,
        COUNT(DISTINCT i.id) as orders,
        SUM(ii.pre_tax_amount) as revenue,
        SUM(ii.vat_amount) as vat_amount,
        SUM(ii.net_amount) as net_amount
      FROM invoices i
      JOIN invoice_items ii ON i.id = ii.invoice_id
      ${whereClause}
      GROUP BY date
      ORDER BY date ASC
    `, params);

    // 3. Distribution: Assignees
    const assignees = await db.all(`
      SELECT i.assignee_name as name, SUM(ii.pre_tax_amount) as value
      FROM invoices i
      JOIN invoice_items ii ON i.id = ii.invoice_id
      ${whereClause}
      GROUP BY i.assignee_name
      ORDER BY value DESC
    `, params);

    // 4. Distribution: Shops
    const shops = await db.all(`
      SELECT i.shop_name as name, SUM(ii.pre_tax_amount) as value
      FROM invoices i
      JOIN invoice_items ii ON i.id = ii.invoice_id
      ${whereClause}
      GROUP BY i.shop_name
      ORDER BY value DESC
    `, params);

    // 5. Distribution: Channels
    const channels = await db.all(`
      SELECT ii.sale_channel as name, SUM(ii.pre_tax_amount) as value
      FROM invoices i
      JOIN invoice_items ii ON i.id = ii.invoice_id
      ${whereClause}
      GROUP BY ii.sale_channel
      ORDER BY value DESC
    `, params);

    // 6. Monthly Trend
    const monthlyData = await db.all(`
      SELECT 
        strftime('%Y-%m', datetime(i.timestamp/1000, 'unixepoch')) as month,
        SUM(ii.pre_tax_amount) as revenue,
        COUNT(DISTINCT i.id) as orders
      FROM invoices i
      JOIN invoice_items ii ON i.id = ii.invoice_id
      ${whereClause}
      GROUP BY month
      ORDER BY month ASC
    `, params);

    // 7. Grade Data
    const gradeData = await db.all(`
      SELECT i.customer_grade as name, SUM(ii.pre_tax_amount) as value
      FROM invoices i
      JOIN invoice_items ii ON i.id = ii.invoice_id
      ${whereClause}
      GROUP BY i.customer_grade
      ORDER BY value DESC
    `, params);

    const yearsRow = await db.get("SELECT data FROM summaries WHERE category = 'pl' AND key = 'available_years'");
    const years = yearsRow ? JSON.parse(yearsRow.data) : [];

    const result = { 
      summary: totals,
      rows: dailyRows,
      years,
      assignees,
      shops,
      channels,
      itemChannels: channels,
      monthlyData,
      gradeData
    };

    // 🟢 LAZY MATERIALIZATION: Save result to cache
    try {
      await db.run(`
        INSERT INTO summaries (category, key, data, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(category, key) DO UPDATE SET
          data = excluded.data,
          updated_at = CURRENT_TIMESTAMP
      `, ['pl', cacheKey, JSON.stringify(result)]);
      console.log(`[ACL] Materialized view created for: ${cacheKey}`);
    } catch (cacheErr) {
      console.warn('[ACL] Failed to store materialized view:', cacheErr);
    }

    return NextResponse.json(result);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('API Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

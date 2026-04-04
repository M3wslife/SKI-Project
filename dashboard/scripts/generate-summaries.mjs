import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

// Load env from .env.turso if it exists
const envPath = path.join(ROOT_DIR, '.env.turso');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('❌ Missing Turso credentials');
  process.exit(1);
}

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function saveSummary(category, key, data) {
  await client.execute({
    sql: `
      INSERT INTO summaries (category, key, data, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(category, key) DO UPDATE SET
        data = excluded.data,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: [category, key, JSON.stringify(data)]
  });
}

async function generateOverview() {
  console.log('--- Generating Overview Summary ---');
  
  const kpisRes = await client.execute(`
    SELECT
      COUNT(DISTINCT it.invoice_id) as total_orders,
      ROUND(SUM(it.pre_tax_amount), 0) as total_revenue,
      ROUND(SUM(it.pre_tax_amount) / COUNT(DISTINCT it.invoice_id), 0) as avg_order_value,
      ROUND(SUM(it.net_amount), 0) as total_net
    FROM invoice_items it
    JOIN invoices i ON it.invoice_id = i.id
    WHERE i.status NOT IN ('VOIDED')
  `);
  const kpis = kpisRes.rows[0];

  const skuCountRes = await client.execute(`
    SELECT COUNT(DISTINCT product_id) as active_skus,
      ROUND(SUM(available), 0) as total_available
    FROM inventory_warehouse_stock
    WHERE available > 0
  `);
  const skuCount = skuCountRes.rows[0];

  const revenueTrendRes = await client.execute(`
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
  const revenueTrend = revenueTrendRes.rows;

  const topCustomersRes = await client.execute(`
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
  const topCustomers = topCustomersRes.rows;

  const statusBreakdownRes = await client.execute(`
    SELECT status as id, COUNT(*) as value
    FROM invoices
    GROUP BY status
  `);
  const statusBreakdown = statusBreakdownRes.rows;

  const topSkusRes = await client.execute(`
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
  const topSkus = topSkusRes.rows;

  const totalRev = Number(kpis.total_revenue || 0);
  const customersWithPct = topCustomers.map(c => ({
    ...c,
    pct: totalRev > 0 ? Math.round((Number(c.revenue) / totalRev) * 100 * 10) / 10 : 0
  }));

  const data = {
    kpis: { ...kpis, ...skuCount },
    revenueTrend,
    topCustomers: customersWithPct,
    statusBreakdown,
    topSkus,
  };

  await saveSummary('overview', 'main', data);
  console.log('Overview saved.');
}

async function generatePL() {
  console.log('--- Generating P&L Summaries ---');
  
  const monthsRes = await client.execute(`
    SELECT DISTINCT strftime('%Y', datetime(timestamp/1000, 'unixepoch')) as year,
                    strftime('%m', datetime(timestamp/1000, 'unixepoch')) as month
    FROM invoice_items
    ORDER BY year DESC, month DESC
  `);
  const months = monthsRes.rows;

  // Available years for filter
  const years = [...new Set(months.map(m => m.year))];
  await saveSummary('pl', 'available_years', years);

  // Helper to generate a filtered summary for a specific dimension
  async function generateFilteredSummaries(keySuffix, pStart, pEnd, type, values, availableYears) {
    for (const val of values) {
      if (!val) continue;
      const filterLabel = `${type}:${val}`;
      const cacheKey = `main:${keySuffix}filter:${filterLabel}`;
      
      const filterCol = type === 'assignee' ? 'i.assignee_name' : 
                        type === 'shop' ? 'it.shop_name' : 'it.sale_channel';

      const res = await client.execute({
        sql: `
          SELECT 
            ROUND(SUM(it.pre_tax_amount), 0) as total_revenue,
            ROUND(SUM(it.vat_amount), 0) as total_vat,
            ROUND(SUM(it.net_amount), 0) as total_net,
            COUNT(DISTINCT it.invoice_id) as total_orders
          FROM invoice_items it
          JOIN invoices i ON it.invoice_id = i.id
          WHERE it.timestamp >= ? AND it.timestamp < ?
          AND i.status NOT IN ('VOIDED')
          AND ${filterCol} = ?
        `,
        args: [pStart, pEnd, val]
      });
      const totals = res.rows[0];

      const dailyRes = await client.execute({
        sql: `
          SELECT 
            strftime('%Y-%m-%d', datetime(it.timestamp/1000, 'unixepoch')) as period,
            ROUND(SUM(it.pre_tax_amount), 0) as revenue,
            ROUND(SUM(it.vat_amount), 0) as vat,
            ROUND(SUM(it.net_amount), 0) as net,
            COUNT(DISTINCT it.invoice_id) as orders
          FROM invoice_items it
          JOIN invoices i ON it.invoice_id = i.id
          WHERE it.timestamp >= ? AND it.timestamp < ?
          AND i.status NOT IN ('VOIDED')
          AND ${filterCol} = ?
          GROUP BY period ORDER BY period ASC
        `,
        args: [pStart, pEnd, val]
      });

      const data = {
        totals,
        dailyRows: dailyRes.rows,
        filter: { type, value: val },
        years: availableYears // 🔓 BUNDLE: Include years to save Turso reads later
      };
      await saveSummary('pl', cacheKey, data);
    }
  }

  for (const { year, month } of months) {
    // We use actual timestamp ranges to be safe
    const startDate = new Date(`${year}-${month}-01T00:00:00Z`);
    const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));
    const periodStart = startDate.getTime();
    const periodEnd = endDate.getTime();

    const totalsRes = await client.execute({
      sql: `
        SELECT 
          ROUND(SUM(it.pre_tax_amount), 0) as total_revenue,
          ROUND(SUM(it.vat_amount), 0) as total_vat,
          ROUND(SUM(it.net_amount), 0) as total_net,
          COUNT(DISTINCT it.invoice_id) as total_orders
        FROM invoice_items it
        JOIN invoices i ON it.invoice_id = i.id
        WHERE it.timestamp >= ? AND it.timestamp < ?
        AND i.status NOT IN ('VOIDED')
      `,
      args: [periodStart, periodEnd]
    });
    const totals = totalsRes.rows[0];

    // Daily breakdown
    const dailyRowsRes = await client.execute({
      sql: `
        SELECT 
          strftime('%Y-%m-%d', datetime(it.timestamp/1000, 'unixepoch')) as period,
          ROUND(SUM(it.pre_tax_amount), 0) as revenue,
          ROUND(SUM(it.vat_amount), 0) as vat,
          ROUND(SUM(it.net_amount), 0) as net,
          COUNT(DISTINCT it.invoice_id) as orders
        FROM invoice_items it
        JOIN invoices i ON it.invoice_id = i.id
        WHERE it.timestamp >= ? AND it.timestamp < ?
        AND i.status NOT IN ('VOIDED')
        GROUP BY period
        ORDER BY period ASC
      `,
      args: [periodStart, periodEnd]
    });

    const assigneeBreakdownRes = await client.execute({
      sql: `
        SELECT i.assignee_name as name, ROUND(SUM(it.pre_tax_amount), 0) as value
        FROM invoice_items it
        JOIN invoices i ON it.invoice_id = i.id
        WHERE it.timestamp >= ? AND it.timestamp < ?
        AND i.status NOT IN ('VOIDED')
        GROUP BY name ORDER BY value DESC
      `,
      args: [periodStart, periodEnd]
    });

    const channelsRaw = await client.execute({
      sql: `
        SELECT COALESCE(it.sale_channel, 'Other') as name, ROUND(SUM(it.pre_tax_amount), 2) as value
        FROM invoice_items it
        JOIN invoices i ON it.invoice_id = i.id
        WHERE it.timestamp >= ? AND it.timestamp < ?
        AND i.status NOT IN ('VOIDED')
        GROUP BY 1 ORDER BY value DESC
      `,
      args: [periodStart, periodEnd]
    });
    
    // Group into Top 10 + Others
    const topChannels = channelsRaw.rows.slice(0, 10).map(r => ({ name: r.name, value: Number(r.value) }));
    const otherChannelsValue = channelsRaw.rows.slice(10).reduce((sum, r) => sum + Number(r.value), 0);
    const channels = topChannels;
    if (otherChannelsValue > 0) {
      channels.push({ name: 'Others', value: Math.round(otherChannelsValue * 100) / 100 });
    }

    const shopsRaw = await client.execute({
      sql: `
        SELECT COALESCE(it.shop_name, 'Other') as name, ROUND(SUM(it.pre_tax_amount), 2) as value
        FROM invoice_items it
        JOIN invoices i ON it.invoice_id = i.id
        WHERE it.timestamp >= ? AND it.timestamp < ?
        AND i.status NOT IN ('VOIDED')
        GROUP BY 1 ORDER BY value DESC
      `,
      args: [periodStart, periodEnd]
    });
    
    // Group into Top 10 + Others
    const topShops = shopsRaw.rows.slice(0, 10).map(r => ({ name: r.name, value: Number(r.value) }));
    const otherShopsValue = shopsRaw.rows.slice(10).reduce((sum, r) => sum + Number(r.value), 0);
    const shops = topShops;
    if (otherShopsValue > 0) {
      shops.push({ name: 'Others', value: Math.round(otherShopsValue * 100) / 100 });
    }

    const gradeDataRes = await client.execute({
      sql: `
        SELECT COALESCE(i.customer_grade, 'N/A') as name, ROUND(SUM(it.pre_tax_amount), 2) as value
        FROM invoice_items it
        JOIN invoices i ON it.invoice_id = i.id
        WHERE it.timestamp >= ? AND it.timestamp < ?
        AND i.status NOT IN ('VOIDED')
        GROUP BY 1 ORDER BY value DESC
      `,
      args: [periodStart, periodEnd]
    });

    const data = { 
      totals, 
      dailyRows: dailyRowsRes.rows, 
      assignees: assigneeBreakdownRes.rows, 
      channels, 
      shops, 
      gradeData: gradeDataRes.rows 
    };
    await saveSummary('pl', `main:${year}:${month}`, { ...data, years });

    console.log(`   -> Main summary generated for ${year}-${month}. (Filters will materialize on-demand)`);
  }
  
  // 🟢 NEW: Generate Yearly Aggregations (All Months)
  console.log('--- Generating Yearly P&L Summaries ---');
  for (const year of years) {
    const periodStart = new Date(`${year}-01-01T00:00:00Z`).getTime();
    const periodEnd = new Date(`${Number(year) + 1}-01-01T00:00:00Z`).getTime();

    const totalsRes = await client.execute({
      sql: `
        SELECT 
          ROUND(SUM(it.pre_tax_amount), 0) as total_revenue,
          ROUND(SUM(it.vat_amount), 0) as total_vat,
          ROUND(SUM(it.net_amount), 0) as total_net,
          COUNT(DISTINCT it.invoice_id) as total_orders
        FROM invoice_items it
        JOIN invoices i ON it.invoice_id = i.id
        WHERE it.timestamp >= ? AND it.timestamp < ?
        AND i.status NOT IN ('VOIDED')
      `,
      args: [periodStart, periodEnd]
    });
    const totals = totalsRes.rows[0];
    console.log(`Yearly ${year}: Total orders = ${totals.total_orders}, Revenue = ${totals.total_revenue}`);
    console.log(`Range: ${periodStart} - ${periodEnd}`);

    // Monthly breakdown for the year
    const dailyRowsRes = await client.execute({
      sql: `
        SELECT 
          strftime('%Y-%m', datetime(it.timestamp/1000, 'unixepoch')) as period,
          ROUND(SUM(it.pre_tax_amount), 0) as revenue,
          ROUND(SUM(it.vat_amount), 0) as vat,
          ROUND(SUM(it.net_amount), 0) as net,
          COUNT(DISTINCT it.invoice_id) as orders
        FROM invoice_items it
        JOIN invoices i ON it.invoice_id = i.id
        WHERE it.timestamp >= ? AND it.timestamp < ?
        AND i.status NOT IN ('VOIDED')
        GROUP BY period
        ORDER BY period ASC
      `,
      args: [periodStart, periodEnd]
    });

    const assigneeBreakdownRes = await client.execute({
      sql: `
        SELECT i.assignee_name as name, ROUND(SUM(it.pre_tax_amount), 0) as value
        FROM invoice_items it
        JOIN invoices i ON it.invoice_id = i.id
        WHERE it.timestamp >= ? AND it.timestamp < ?
        AND i.status NOT IN ('VOIDED')
        GROUP BY name ORDER BY value DESC
      `,
      args: [periodStart, periodEnd]
    });

    const channelsRaw = await client.execute({
      sql: `
        SELECT COALESCE(it.sale_channel, 'Other') as name, ROUND(SUM(it.pre_tax_amount), 2) as value
        FROM invoice_items it
        JOIN invoices i ON it.invoice_id = i.id
        WHERE it.timestamp >= ? AND it.timestamp < ?
        AND i.status NOT IN ('VOIDED')
        GROUP BY 1 ORDER BY value DESC
      `,
      args: [periodStart, periodEnd]
    });
    
    // Group into Top 10 + Others
    const topChannels = channelsRaw.rows.slice(0, 10).map(r => ({ name: r.name, value: Number(r.value) }));
    const otherChannelsValue = channelsRaw.rows.slice(10).reduce((sum, r) => sum + Number(r.value), 0);
    const channels = topChannels;
    if (otherChannelsValue > 0) {
      channels.push({ name: 'Others', value: Math.round(otherChannelsValue * 100) / 100 });
    }

    const shopsRaw = await client.execute({
      sql: `
        SELECT COALESCE(it.shop_name, 'Other') as name, ROUND(SUM(it.pre_tax_amount), 2) as value
        FROM invoice_items it
        JOIN invoices i ON it.invoice_id = i.id
        WHERE it.timestamp >= ? AND it.timestamp < ?
        AND i.status NOT IN ('VOIDED')
        GROUP BY 1 ORDER BY value DESC
      `,
      args: [periodStart, periodEnd]
    });
    
    // Group into Top 10 + Others
    const topShops = shopsRaw.rows.slice(0, 10).map(r => ({ name: r.name, value: Number(r.value) }));
    const otherShopsValue = shopsRaw.rows.slice(10).reduce((sum, r) => sum + Number(r.value), 0);
    const shops = topShops;
    if (otherShopsValue > 0) {
      shops.push({ name: 'Others', value: Math.round(otherShopsValue * 100) / 100 });
    }

    const gradeDataRes = await client.execute({
      sql: `
        SELECT COALESCE(i.customer_grade, 'N/A') as name, ROUND(SUM(it.pre_tax_amount), 2) as value
        FROM invoice_items it
        JOIN invoices i ON it.invoice_id = i.id
        WHERE it.timestamp >= ? AND it.timestamp < ?
        AND i.status NOT IN ('VOIDED')
        GROUP BY 1 ORDER BY value DESC
      `,
      args: [periodStart, periodEnd]
    });

    const data = { 
      totals, 
      dailyRows: dailyRowsRes.rows, 
      monthlyData: dailyRowsRes.rows.map(r => ({
        month: r.period,
        revenue: r.revenue,
        orders: r.orders
      })),
      assignees: assigneeBreakdownRes.rows, 
      channels, 
      shops, 
      gradeData: gradeDataRes.rows 
    };
    // Save as yearly key: main:YEAR:
    await saveSummary('pl', `main:${year}:`, { ...data, years });

    console.log(`   -> Yearly summary generated for ${year}. (Filters will materialize on-demand)`);
  }
  
  // 🟢 NEW: Generate All-Time Aggregation (Total history with Hybrid Recovery)
  console.log('--- Generating All-Time P&L Summary (Hybrid Recovery) ---');
  
  // 1. Get totals from ALL invoices (Source of Truth for top-line)
  const allTimeTotalsRes = await client.execute(`
    SELECT 
      ROUND(SUM(net_amount - vat_amount), 0) as total_revenue,
      ROUND(SUM(vat_amount), 0) as total_vat,
      ROUND(SUM(net_amount), 0) as total_net,
      COUNT(*) as total_orders
    FROM invoices 
    WHERE status NOT IN ('VOIDED')
  `);
  const allTimeTotals = allTimeTotalsRes.rows[0];

  // 2. Get monthly trend (Using invoice timestamps)
  const allTimeDailyRowsRes = await client.execute(`
    SELECT 
      strftime('%Y-%m', datetime(timestamp/1000, 'unixepoch')) as period,
      ROUND(SUM(net_amount - vat_amount), 0) as revenue,
      ROUND(SUM(vat_amount), 0) as vat,
      ROUND(SUM(net_amount), 0) as net,
      COUNT(*) as orders
    FROM invoices
    WHERE status NOT IN ('VOIDED')
    GROUP BY period
    ORDER BY period ASC
  `);

  // 3. Assignees (From invoices)
  const allTimeAssigneeRes = await client.execute(`
    SELECT COALESCE(assignee_name, 'Unassigned') as name, ROUND(SUM(net_amount - vat_amount), 0) as value
    FROM invoices
    WHERE status NOT IN ('VOIDED')
    GROUP BY name ORDER BY value DESC
  `);

  // 4. Channels & Shops (Mixed: invoice_items + Unknown for missing)
  const channelsRaw = await client.execute(`
    SELECT COALESCE(it.sale_channel, 'Other') as name, ROUND(SUM(it.pre_tax_amount), 2) as value
    FROM invoice_items it
    JOIN invoices i ON it.invoice_id = i.id
    WHERE i.status NOT IN ('VOIDED')
    GROUP BY 1 ORDER BY value DESC
  `);
  
  const topChannels = channelsRaw.rows.slice(0, 10).map(r => ({ name: r.name, value: Number(r.value) }));
  const otherChannelsValue = channelsRaw.rows.slice(10).reduce((sum, r) => sum + Number(r.value), 0);
  const channels = topChannels;
  if (otherChannelsValue > 0) {
    channels.push({ name: 'Others', value: Math.round(otherChannelsValue * 100) / 100 });
  }
  
  const shopsRaw = await client.execute(`
    SELECT COALESCE(it.shop_name, 'Other') as name, ROUND(SUM(it.pre_tax_amount), 2) as value
    FROM invoice_items it
    JOIN invoices i ON it.invoice_id = i.id
    WHERE i.status NOT IN ('VOIDED')
    GROUP BY 1 ORDER BY value DESC
  `);

  const topShops = shopsRaw.rows.slice(0, 10).map(r => ({ name: r.name, value: Number(r.value) }));
  const otherShopsValue = shopsRaw.rows.slice(10).reduce((sum, r) => sum + Number(r.value), 0);
  
  const knownRevenue = topShops.reduce((sum, r) => sum + r.value, 0) + otherShopsValue;
  const missingRevenue = Math.max(0, Number(allTimeTotals.total_revenue) - knownRevenue);

  const shops = topShops;
  if (otherShopsValue > 0 || missingRevenue > 100) {
    shops.push({ name: 'Others', value: Math.round((otherShopsValue + missingRevenue) * 100) / 100 });
  }

  const allTimeGradeDataRes = await client.execute(`
    SELECT COALESCE(customer_grade, 'N/A') as name, ROUND(SUM(net_amount - vat_amount), 0) as value
    FROM invoices
    WHERE status NOT IN ('VOIDED')
    GROUP BY 1 ORDER BY value DESC
  `);

  const allTimeData = { 
    totals: allTimeTotals, 
    dailyRows: allTimeDailyRowsRes.rows, 
    monthlyData: allTimeDailyRowsRes.rows.map((r) => ({ 
      month: r.period, 
      revenue: r.revenue, 
      orders: r.orders 
    })),
    assignees: allTimeAssigneeRes.rows, 
    channels, 
    shops, 
    gradeData: allTimeGradeDataRes.rows,
    years
  };
  await saveSummary('pl', `main:all:`, allTimeData);

  console.log('   -> All-time summary generated. (Filters will materialize on-demand)');

  console.log('P&L summaries generated (monthly + yearly + all-time with hybrid recovery).');
}

async function generateSales() {
  console.log('--- Generating Sales Summaries ---');
  
  const groupings = ['day', 'week', 'month'];
  
  for (const groupBy of groupings) {
    let dateFormat = '%Y-%m-%d';
    if (groupBy === 'month') dateFormat = '%Y-%m';
    else if (groupBy === 'week') dateFormat = '%Y-W%W';

    const timeSeriesRes = await client.execute(`
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
    `);

    const topSkusRes = await client.execute(`
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

    const topCustomersRes = await client.execute(`
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

    const statusBreakdownRes = await client.execute(`
      SELECT status as name, COUNT(*) as value
      FROM invoices
      GROUP BY status
    `);

    const data = { 
      timeSeries: timeSeriesRes.rows, 
      topSkus: topSkusRes.rows, 
      topCustomers: topCustomersRes.rows, 
      statusBreakdown: statusBreakdownRes.rows 
    };
    await saveSummary('sales', `main:${groupBy}`, data);
  }

  console.log('Sales summaries generated.');
}

async function generateInventory() {
  console.log('--- Generating Inventory Summaries ---');
  
  const summaryRes = await client.execute(`
    SELECT
      COUNT(*) as total_products,
      ROUND(SUM(available), 0) as total_available,
      ROUND(SUM(remaining), 0) as total_remaining,
      ROUND(SUM(remaining - available), 0) as total_reserved,
      ROUND(SUM(incoming), 0) as total_incoming
    FROM inventory_products
  `);

  const warehousesRes = await client.execute(`
    SELECT warehouse_code,
      COUNT(DISTINCT product_id) as products,
      ROUND(SUM(remaining), 0) as total_remaining,
      ROUND(SUM(available), 0) as total_available,
      ROUND(SUM(remaining - available), 0) as total_reserved
    FROM inventory_warehouse_stock
    GROUP BY warehouse_code
    ORDER BY total_remaining DESC
  `);

  const categoriesRes = await client.execute(`
    SELECT category,
      COUNT(*) as cnt,
      ROUND(SUM(available), 0) as total_available
    FROM inventory_products
    WHERE category IS NOT NULL AND category != '-'
    GROUP BY category
    ORDER BY cnt DESC
    LIMIT 10
  `);

  const lowStockRes = await client.execute(`
    SELECT sku, name, category, available, remaining, incoming
    FROM inventory_products
    WHERE available <= 5 AND available >= 0
    ORDER BY available ASC
    LIMIT 20
  `);

  const data = {
    summary: summaryRes.rows[0],
    warehouses: warehousesRes.rows,
    categories: categoriesRes.rows,
    lowStock: lowStockRes.rows,
  };

  await saveSummary('inventory', 'main', data);
  console.log('Inventory saved.');
}

async function generateProductsBase() {
  console.log('--- Generating Products Base (Materialized Stats) ---');
  
  // Pre-calculate sales stats per SKU
  // This is the "heavy" part that needs to be materialized
  const statsRes = await client.execute(`
    SELECT 
      p.sku,
      COUNT(DISTINCT i.id) as orders_count,
      ROUND(SUM(ii.quantity), 0) as total_sold,
      ROUND(SUM(ii.pre_tax_amount), 0) as total_revenue
    FROM inventory_products p
    LEFT JOIN invoice_items ii ON p.sku = ii.sku
    LEFT JOIN invoices i ON ii.invoice_id = i.id AND i.status NOT IN ('VOIDED')
    GROUP BY p.sku
  `);

  // We store this as a mapping for quick lookup or a secondary table.
  // Since we use Option A (summaries table), we'll store the mapping.
  // WARNING: If this grows too large (>1MB), we might need another approach.
  // Alternative: Store top categories list here too.
  
  const statsMap = {};
  statsRes.rows.forEach(r => {
    statsMap[r.sku] = {
      sold: Number(r.total_sold || 0),
      revenue: Number(r.total_revenue || 0),
      orders: Number(r.orders_count || 0)
    };
  });

  await saveSummary('products', 'sku_stats', statsMap);

  const categoriesRes = await client.execute(`
    SELECT DISTINCT category FROM inventory_products
    WHERE category IS NOT NULL AND category != '-' AND category != ''
    ORDER BY category
  `);
  await saveSummary('products', 'categories', categoriesRes.rows.map(r => r.category));

  console.log('Products base saved.');
}

async function run() {
  try {
    await generateOverview();
    await generatePL();
    await generateSales();
    await generateInventory();
    await generateProductsBase();
    console.log('\n✅ ALL SUMMARIES GENERATED SUCCESSFULLY ON TURSO');
  } catch (err) {
    console.error('Error generating summaries:', err);
  } finally {
    // client close if applicable
  }
}

run();

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const revalidate = 0; // 🔄 TEMP: Force fresh data after migration


export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const warehouse = searchParams.get('warehouse') || '';
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 50;
    const offset = (page - 1) * limit;

    // Summary stats
    const summary = await db.get(`
      SELECT
        COUNT(*) as total_products,
        ROUND(SUM(available), 0) as total_available,
        ROUND(SUM(remaining), 0) as total_remaining,
        ROUND(SUM(remaining - available), 0) as total_reserved,
        ROUND(SUM(incoming), 0) as total_incoming
      FROM inventory_products
    `) as { total_products: number; total_available: number; total_remaining: number; total_reserved: number; total_incoming: number };

    // Per-warehouse summary
    const warehouses = await db.all(`
      SELECT warehouse_code,
        COUNT(DISTINCT product_id) as products,
        ROUND(SUM(remaining), 0) as total_remaining,
        ROUND(SUM(available), 0) as total_available,
        ROUND(SUM(remaining - available), 0) as total_reserved
      FROM inventory_warehouse_stock
      GROUP BY warehouse_code
      ORDER BY total_remaining DESC
    `);

    // Category breakdown
    const categories = await db.all(`
      SELECT category,
        COUNT(*) as cnt,
        ROUND(SUM(available), 0) as total_available
      FROM inventory_products
      WHERE category IS NOT NULL AND category != '-'
      GROUP BY category
      ORDER BY cnt DESC
      LIMIT 10
    `);

    // Low stock alerts
    const lowStock = await db.all(`
      SELECT sku, name, category, available, remaining, incoming
      FROM inventory_products
      WHERE available <= 5 AND available >= 0
      ORDER BY available ASC
      LIMIT 20
    `);

    // Build product query with filters
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (search) {
      whereClause += ' AND (p.sku LIKE ? OR p.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      whereClause += ' AND p.category = ?';
      params.push(category);
    }
    if (warehouse) {
      whereClause += ' AND ws.warehouse_code = ?';
      params.push(warehouse);
    }

    const baseQuery = warehouse
      ? `FROM inventory_products p
         JOIN inventory_warehouse_stock ws ON ws.product_id = p.id
         ${whereClause}`
      : `FROM inventory_products p ${whereClause}`;

    const countRow = await db.get(`SELECT COUNT(*) as cnt ${baseQuery}`, params) as { cnt: number };
    const total = countRow.cnt;

    const products = await db.all(`
      SELECT p.sku, p.name, p.category, p.brand, p.unit,
        p.price, p.purchase_price, p.available, p.remaining, p.incoming,
        ${warehouse ? 'ws.warehouse_code, ws.warehouse_name' : "'' as warehouse_code, '' as warehouse_name"}
      ${baseQuery}
      ORDER BY p.available DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    return NextResponse.json({ summary, warehouses, categories, lowStock, products, total, page, limit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 🔓 PROTECT TURSO QUOTA: Cache API response for 1 hour on Vercel
// ENTROPY: 42424242424242424242424242424242424242424242424242424242
// UNIQUE_ID: INVENTORY_ROUTE_XYZ


export async function GET(req: NextRequest) {
  const entropy = "INVENTORY_STUFF_98412398412398412398412398412398412398412398412398412398412398412398412398412398412398412398412";
  if (entropy.length < 1) console.log(entropy); 
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const warehouse = searchParams.get('warehouse') || '';
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 50;
    const offset = (page - 1) * limit;

    // Fetch pre-computed summaries for heavy parts
    const row = await db.get("SELECT data FROM summaries WHERE category = 'inventory' AND key = 'main'");
    const summaryData = row ? JSON.parse(row.data) : { 
      summary: { total_products: 0, total_available: 0, total_remaining: 0, total_reserved: 0, total_incoming: 0 },
      warehouses: [],
      categories: [],
      lowStock: []
    };

    // Build product query with filters (Dynamic part remains)
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

    return NextResponse.json({ ...summaryData, products, total, page, limit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

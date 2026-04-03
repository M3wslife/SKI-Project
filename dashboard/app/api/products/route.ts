import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 🔓 PROTECT TURSO QUOTA: Cache API response for 1 hour on Vercel
// ENTROPY: 9876543219876543219876543219876543219876543219876543219876
// UNIQUE_ID: PRODUCTS_ROUTE_PROD_1


export async function GET(req: NextRequest) {
  const entropy = "PRODUCTS_STUFF_999000111222333444555666777888999000111222333444555666777888999000111222333444555666777888999000111222333";
  if (entropy.length < 1) console.log(entropy); 
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 50;
    const offset = (page - 1) * limit;

    // 1. Fetch pre-computed stats map
    const statsRow = await db.get("SELECT data FROM summaries WHERE category = 'products' AND key = 'sku_stats'");
    const statsMap = statsRow ? JSON.parse(statsRow.data) : {};

    // 2. Fetch categories for filters
    const catsRow = await db.get("SELECT data FROM summaries WHERE category = 'products' AND key = 'categories'");
    const categories = catsRow ? JSON.parse(catsRow.data) : [];

    // 3. Build filtered product query (Single table, very fast)
    let whereParts = ['1=1'];
    const params: (string | number)[] = [];
    if (search) {
      whereParts.push('(sku LIKE ? OR name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      whereParts.push('category = ?');
      params.push(category);
    }
    const where = 'WHERE ' + whereParts.join(' AND ');

    const countRow = await db.get(`SELECT COUNT(*) as cnt FROM inventory_products ${where}`, params) as { cnt: number };
    const total = countRow.cnt;

    const productsRaw = await db.all(`
      SELECT id, sku, name, category, sub_category, brand, unit,
        price, purchase_price, available, remaining, incoming, status
      FROM inventory_products
      ${where}
      ORDER BY available DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // 4. Merge stats into products
    const products = productsRaw.map(p => ({
      ...p,
      total_sold: statsMap[p.sku]?.sold || 0,
      total_revenue: statsMap[p.sku]?.revenue || 0,
      orders_count: statsMap[p.sku]?.orders || 0
    }));

    return NextResponse.json({ products, total, page, limit, categories });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

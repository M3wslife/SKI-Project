import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const revalidate = 0; // 🔄 TEMP: Force fresh data after migration


export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 50;
    const offset = (page - 1) * limit;

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

    const products = await db.all(`
      SELECT p.id, p.sku, p.name, p.category, p.sub_category, p.brand, p.unit,
        p.price, p.purchase_price, p.available, p.remaining, p.incoming, p.status,
        COALESCE(SUM(ii.quantity), 0) as total_sold,
        ROUND(COALESCE(SUM(ii.pre_tax_amount), 0), 2) as total_revenue
      FROM inventory_products p
      LEFT JOIN invoice_items ii ON p.sku = ii.sku
      LEFT JOIN invoices i ON ii.invoice_id = i.id AND i.status NOT IN ('VOIDED')
      ${where.replace(/sku/g, 'p.sku').replace(/name/g, 'p.name').replace(/category/g, 'p.category')}
      GROUP BY p.id
      ORDER BY total_revenue DESC, p.available DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    // Get all categories for filter dropdown
    const categoriesResult = await db.all(`
      SELECT DISTINCT category FROM inventory_products
      WHERE category IS NOT NULL AND category != '-' AND category != ''
      ORDER BY category
    `) as { category: string }[];

    return NextResponse.json({ products, total, page, limit, categories: categoriesResult.map((c: any) => c.category) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

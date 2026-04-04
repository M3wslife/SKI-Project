import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: '.env.turso' });
dotenv.config({ path: '.env.local' });

const url = process.env.TURSO_DATABASE_URL || process.env.NEXT_PUBLIC_TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN;

if (!url) {
  console.error("❌ ERROR: TURSO_DATABASE_URL is missing from .env");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function applyIndexes() {
  console.log("🚀 Applying Critical Database Indexes to Turso...");
  
  const queries = [
    // 1. Index invoice_id for fast joins between invoices and items
    "CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)",
    
    // 2. Index timestamps for fast time-range filtering
    "CREATE INDEX IF NOT EXISTS idx_invoice_items_timestamp ON invoice_items(timestamp)",
    
    // 3. Index filterable columns on invoices
    "CREATE INDEX IF NOT EXISTS idx_invoices_assignee ON invoices(assignee_name)",
    "CREATE INDEX IF NOT EXISTS idx_invoices_shop ON invoices(shop_name)",
    "CREATE INDEX IF NOT EXISTS idx_invoices_channel ON invoices(sale_channel)",
    "CREATE INDEX IF NOT EXISTS idx_invoices_timestamp ON invoices(timestamp)",
    
    // 4. Index summaries for fast dashboard loads
    "CREATE INDEX IF NOT EXISTS idx_summaries_lookup ON summaries(category, key)"
  ];

  for (const sql of queries) {
    try {
      console.log(`📡 Executing: ${sql.substring(0, 50)}...`);
      await client.execute(sql);
      console.log("✅ Success.");
    } catch (err) {
      console.error(`❌ FAILED: ${err.message}`);
    }
  }

  console.log("\n✨ Database Optimization Complete! Your read quota usage should drop dramatically.");
  process.exit(0);
}

applyIndexes();

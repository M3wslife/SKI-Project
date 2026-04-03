import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const LOCAL_DB = path.join(ROOT_DIR, 'data', 'local.db');

// Load env from .env.turso if it exists, otherwise use process.env
const envPath = path.join(ROOT_DIR, '.env.turso');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('❌ Missing Turso credentials (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)');
  process.exit(1);
}

if (!fs.existsSync(LOCAL_DB)) {
  console.error(`❌ Local database not found at ${LOCAL_DB}`);
  process.exit(1);
}

const local = new Database(LOCAL_DB, { readonly: true });
const cloud = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

const TABLES = [
  'invoices',
  'invoice_items',
  'inventory_products',
  'inventory_warehouse_stock',
  'inventory_transfer_logs',
];

async function pushTable(table, yearFilter = null) {
  console.log(`\n📦 Pushing table: ${table}${yearFilter ? ` (Year: ${yearFilter})` : ''}...`);
  
  // Get all rows from local (with optional year filter for timestamped tables)
  let query = `SELECT * FROM "${table}"`;
  if (yearFilter && (table === 'invoices' || table === 'invoice_items')) {
    const startTs = new Date(`${yearFilter}-01-01T00:00:00Z`).getTime();
    const endTs = new Date(`${yearFilter + 1}-01-01T00:00:00Z`).getTime();
    query += ` WHERE timestamp >= ${startTs} AND timestamp < ${endTs}`;
  }
  
  const rows = local.prepare(query).all();
  if (rows.length === 0) {
    console.log(`   ℹ️ No data in local for ${table}. Skipping.`);
    return;
  }

  console.log(`   Found ${rows.length} rows locally.`);

  // Get columns
  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(',');
  const sql = `INSERT OR REPLACE INTO "${table}" (${columns.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})`;

  // Batch into chunks: 250 rows is efficient for Turso writes
  const BATCH_SIZE = 250; 
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const statements = chunk.map(row => ({
      sql,
      args: columns.map(c => row[c] === undefined ? null : row[c])
    }));

    try {
      await cloud.batch(statements, "write");
      process.stdout.write(`   Synced ${i + chunk.length}/${rows.length}\r`);
    } catch (e) {
      console.error(`\n   ❌ Batch failed at offset ${i}: ${e.message}`);
      throw e;
    }
  }
  console.log(`\n   ✅ Successfully pushed ${table}.`);
}

async function run() {
  console.log('🚀 Starting Data Push: Local ➔ Turso...');
  try {
    // Only push 2025 and 2026 data for invoices/items to save quota
    // Other tables are smaller, can push fully.
    for (const table of TABLES) {
      if (table === 'invoices' || table === 'invoice_items') {
        await pushTable(table, 2025);
        await pushTable(table, 2026);
      } else {
        await pushTable(table);
      }
    }
    console.log('\n✨ All tables pushed successfully!');
  } catch (err) {
    console.error('\n💥 PUSH FAILED:', err.message);
    process.exit(1);
  } finally {
    local.close();
  }
}

run();

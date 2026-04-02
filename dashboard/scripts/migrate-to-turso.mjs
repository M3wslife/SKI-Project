import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import path from 'path';

// 1. Config (Edit these if not using .env)
const LOCAL_DB = path.join(process.cwd(), '..', 'local.db');
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('❌ Error: Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables.');
  console.info('👉 Run with: env-cmd -f .env.local node scripts/migrate-to-turso.mjs');
  process.exit(1);
}

// 2. Open DBs
const local = new Database(LOCAL_DB);
const cloud = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

const TABLES = [
  'invoices',
  'invoice_items',
  'inventory_products',
  'inventory_warehouse_stock',
  'inventory_transfer_logs'
];

async function migrate() {
  console.log('🚀 Starting Data Migration to Turso...');

  for (const table of TABLES) {
    console.log(`\n📦 Processing table: ${table}...`);

    // Get table schema from local
    const schemaRow = local.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(table);
    if (!schemaRow) {
      console.warn(`⚠️  Skipping: ${table} not found in local db.`);
      continue;
    }

    // A. Recreate table on Turso (Fresh Sync)
    console.log(`   - Resetting cloud table...`);
    try {
      await cloud.execute(`DROP TABLE IF EXISTS ${table}`);
      await cloud.execute(schemaRow.sql.replace(/CREATE TABLE/g, 'CREATE TABLE IF NOT EXISTS'));
    } catch (e) {
      console.warn(`⚠️  Notice on DDL: ${e.message}`);
    }

    // B. Read local rows
    const rows = local.prepare(`SELECT * FROM ${table}`).all();
    console.log(`   - Found ${rows.length} rows to sync.`);

    if (rows.length === 0) continue;

    // C. Batch insert (Chunked)
    const BATCH_SIZE = 50;
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => '?').join(',');
    const sql = `INSERT INTO ${table} (${columns.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})`;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      
      const batch = chunk.map(row => {
        return {
          sql,
          args: Object.values(row).map(v => v === null ? null : v)
        };
      });

      try {
        await cloud.batch(batch, "write");
        process.stdout.write(`   ✔ Progress: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} rows sync'd\r`);
      } catch (err) {
        console.error(`\n❌ Error syncing batch at index ${i} for ${table}:`, err.message);
        throw err;
      }
    }
    console.log(`\n✅ ${table} synced successfully.`);
  }

  console.log('\n✨ Database migration complete! Your cloud dashboard is now live.');
}

migrate().catch(err => {
  console.error('\n💥 Migration FAILED:', err);
  process.exit(1);
});

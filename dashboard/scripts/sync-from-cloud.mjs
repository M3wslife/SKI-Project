import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const LOCAL_DB = path.join(ROOT_DIR, 'data', 'local.db');
const ENV_FILE = path.join(ROOT_DIR, '.env.turso');

// Manual env loading
const env = fs.readFileSync(ENV_FILE, 'utf8');
const TURSO_URL = env.match(/TURSO_DATABASE_URL=(.*)/)?.[1]?.trim();
const TURSO_TOKEN = env.match(/TURSO_AUTH_TOKEN=(.*)/)?.[1]?.trim();

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('❌ Missing Turso credentials in .env.turso');
  process.exit(1);
}

const local = new Database(LOCAL_DB);
const cloud = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

const TABLES = [
  'invoices',
  'invoice_items',
  'inventory_products',
  'inventory_warehouse_stock',
  'inventory_transfer_logs',
];

const BATCH_SIZE = 100;

async function sync() {
  console.log('🔄 Starting Data Sync: Turso ➔ Local...');
  
  for (const table of TABLES) {
    console.log(`\n📦 Syncing table: ${table}...`);
    
    // Fetch all rows from Cloud
    // To minimize quota, we'll fetch in one go if small, or could batch fetch.
    // However, libsql client fetch is usually one request for small/medium tables.
    let cloudRows;
    try {
      const result = await cloud.execute(`SELECT * FROM "${table}"`);
      cloudRows = result.rows;
      console.log(`   Fetched ${cloudRows.length} rows from Turso.`);
    } catch (e) {
      console.error(`   ❌ Failed to fetch ${table} from cloud: ${e.message}`);
      continue;
    }

    if (cloudRows.length === 0) {
      console.log(`   ℹ️  No data in cloud for ${table}. Skipping.`);
      continue;
    }

    // Get columns from the first row
    const columns = Object.keys(cloudRows[0]);
    const placeholders = columns.map(() => '?').join(',');
    const insertStmt = local.prepare(
      `INSERT OR REPLACE INTO "${table}" (${columns.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})`
    );

    // Sync in local transaction
    const syncTransaction = local.transaction((rows) => {
      for (const row of rows) {
        const values = columns.map(c => row[c] === undefined ? null : row[c]);
        insertStmt.run(...values);
      }
    });

    try {
      syncTransaction(cloudRows);
      console.log(`   ✅ Synced ${cloudRows.length} rows to local database.`);
    } catch (e) {
      console.error(`   ❌ Failed to sync ${table} to local: ${e.message}`);
    }
  }

  console.log('\n✨ Sync complete! Local database is up to date.');
}

sync().catch(err => {
  console.error('\n💥 FAILED:', err.message);
  process.exit(1);
});

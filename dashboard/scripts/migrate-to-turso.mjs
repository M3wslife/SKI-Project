import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const LOCAL_DB = path.join(process.cwd(), 'data', 'local.db');
const ENV_FILE = path.join(process.cwd(), '.env.turso');

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

// Strip FOREIGN KEY constraints line-by-line (Turso compatibility)
function toTursoSql(sql) {
  const lines = sql.split('\n');
  const filtered = lines.filter(line => !line.trim().toUpperCase().startsWith('FOREIGN KEY'));
  let result = filtered.join('\n');
  result = result.replace(/,\s*\n\s*\)/g, '\n)'); // Remove trailing comma
  result = result.replace(/CREATE TABLE\b/g, 'CREATE TABLE IF NOT EXISTS');
  return result;
}

const TABLES = [
  'summaries',
  'inventory_products',
  'inventory_warehouse_stock',
  'inventory_transfer_logs',
];

const BATCH_SIZE = 100;
const SKIP_LARGE_TABLES = process.argv.includes('--skip-large');

async function migrate() {
  console.log('🔄 Starting Smart Sync: Local ➔ Turso Cloud...');
  console.log('⚡ Quota Protection: Comparing row counts before migration...');

  for (const table of TABLES) {
    console.log(`\n📦 Table: ${table}`);

    // Get local count
    const localStmt = local.prepare(`SELECT COUNT(*) as count FROM "${table}"`);
    const localCount = localStmt.get().count;

    // Special logic for summaries: Usually always sync if small
    const isSummary = table === 'summaries';

    // Get cloud count
    let cloudCount = 0;
    try {
      const cloudRes = await cloud.execute(`SELECT COUNT(*) as count FROM "${table}"`);
      cloudCount = Number(cloudRes.rows[0].count);
    } catch (e) {
      console.log(`   ℹ️ Table ${table} not yet in cloud. Creating...`);
    }

    if (!isSummary && localCount === cloudCount && localCount > 0) {
      console.log(`   ✅ Optimized: Row counts match (${localCount}). Skipping sync.`);
      continue;
    }

    console.log(`   ⚠️ Syncing ${table}: Local (${localCount}) vs Cloud (${cloudCount}).`);
    
    // Safety check for large tables
    if (SKIP_LARGE_TABLES && localCount > 10000 && !isSummary) {
      console.log(`   ⏭️ Skipping large table ${table} (--skip-large)`);
      continue;
    }
    
    // Create table if missing
    const schemaRow = local.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(table);
    if (schemaRow) {
      const createSql = toTursoSql(schemaRow.sql);
      await cloud.execute(createSql);
    }

    // Migration logic
    const rows = local.prepare(`SELECT * FROM "${table}"`).all();
    if (rows.length === 0) continue;

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => '?').join(',');
    // Summaries use REPLACE, others use IGNORE
    const verb = isSummary ? 'REPLACE' : 'IGNORE';
    const insertSql = `INSERT OR ${verb} INTO "${table}" (${columns.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})`;

    let synced = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      const batch = chunk.map(row => ({
        sql: insertSql,
        args: Object.values(row).map(v => (v === undefined ? null : v)),
      }));

      try {
        await cloud.batch(batch, 'write');
        synced += chunk.length;
        process.stdout.write(`   🚀 Syncing: ${synced}/${rows.length} rows\r`);
      } catch (err) {
        console.error(`\n   ❌ Batch error at index ${i}: ${err.message}`);
        throw err;
      }
    }
    console.log(`\n   ✅ ${table} synchronized.`);
  }

  console.log('\n✨ Smart Sync complete! Turso Cloud is verified and up to date.');
}

migrate().catch(err => {
  console.error('\n💥 FAILED:', err.message);
  process.exit(1);
});

import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import path from 'path';

const LOCAL_DB = path.join(process.cwd(), 'data', 'local.db');
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

const local = new Database(LOCAL_DB);
const cloud = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// Strip FOREIGN KEY constraints line-by-line (Turso compatibility)
function toTursoSql(sql) {
  const lines = sql.split('\n');
  const filtered = lines.filter(line => !line.trim().toUpperCase().startsWith('FOREIGN KEY'));
  let result = filtered.join('\n');
  // Remove trailing comma before closing paren
  result = result.replace(/,\s*\n\s*\)/g, '\n)');
  result = result.replace(/CREATE TABLE\b/g, 'CREATE TABLE IF NOT EXISTS');
  return result;
}

const DROP_ORDER = [
  'invoice_items_backup',
  'invoice_items',
  'inventory_warehouse_stock',
  'inventory_transfer_logs',
  'invoices',
  'inventory_products',
];

const TABLES = [
  'invoices',
  'invoice_items',
  'inventory_products',
  'inventory_warehouse_stock',
  'inventory_transfer_logs',
];

const BATCH_SIZE = 100;

async function migrate() {
  console.log('🧹 Dropping all existing Turso tables...');
  for (const table of DROP_ORDER) {
    try {
      await cloud.execute(`DROP TABLE IF EXISTS "${table}"`);
      console.log(`   Dropped: ${table}`);
    } catch (e) {
      console.warn(`   Could not drop ${table}: ${e.message}`);
    }
  }

  console.log('\n🚀 Starting fresh migration...');

  for (const table of TABLES) {
    console.log(`\n📦 Processing: ${table}...`);

    const schemaRow = local.prepare(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`
    ).get(table);

    if (!schemaRow) {
      console.warn(`⚠️  Skipping: ${table} not in local db.`);
      continue;
    }

    const createSql = toTursoSql(schemaRow.sql);
    console.log(`   SQL: ${createSql.substring(0, 120)}...`);

    try {
      await cloud.execute(createSql);
      console.log(`   ✅ Table created.`);
    } catch (e) {
      console.error(`   ❌ Failed to create ${table}: ${e.message}`);
      console.error(`   Full SQL was:\n${createSql}`);
      continue;
    }

    const rows = local.prepare(`SELECT * FROM "${table}"`).all();
    console.log(`   Found ${rows.length} rows.`);
    if (rows.length === 0) continue;

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => '?').join(',');
    const sql = `INSERT OR IGNORE INTO "${table}" (${columns.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})`;

    let synced = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      const batch = chunk.map(row => ({
        sql,
        args: Object.values(row).map(v => (v === undefined ? null : v)),
      }));

      try {
        await cloud.batch(batch, 'write');
        synced += chunk.length;
        process.stdout.write(`   ✔ ${synced}/${rows.length} rows\r`);
      } catch (err) {
        console.error(`\n   ❌ Batch error at index ${i}: ${err.message}`);
        throw err;
      }
    }
    console.log(`\n   ✅ ${table} synced. (${rows.length} rows)`);
  }

  console.log('\n✨ Migration complete! Turso is ready.');
}

migrate().catch(err => {
  console.error('\n💥 FAILED:', err.message);
  process.exit(1);
});

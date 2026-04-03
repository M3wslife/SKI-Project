import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve('.env.turso') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  try {
    console.log('--- Summaries Check ---');
    const summariesRes = await client.execute(`
      SELECT DISTINCT category, key FROM summaries
    `);
    console.table(summariesRes.rows);

    console.log('\n--- Timestamp Range Check ---');
    const tsRes = await client.execute(`
      SELECT 
        MIN(timestamp) as min_ts, 
        MAX(timestamp) as max_ts,
        datetime(MIN(timestamp)/1000, 'unixepoch') as min_date,
        datetime(MAX(timestamp)/1000, 'unixepoch') as max_date,
        COUNT(*) as total_rows
      FROM invoice_items
    `);
    console.table(tsRes.rows);

  } catch (err) {
    console.error('Error:', err);
  }
}

main();

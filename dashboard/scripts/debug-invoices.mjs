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
    console.log('--- Invoices Table Check ---');
    const invRes = await client.execute(`
      SELECT 
        MIN(timestamp) as min_ts, 
        MAX(timestamp) as max_ts,
        datetime(MIN(timestamp)/1000, 'unixepoch') as min_date,
        datetime(MAX(timestamp)/1000, 'unixepoch') as max_date,
        COUNT(*) as total_rows
      FROM invoices
    `);
    console.table(invRes.rows);

    const yrRes = await client.execute(`
      SELECT 
        strftime('%Y', datetime(timestamp/1000, 'unixepoch')) as yr, 
        COUNT(*) as cnt
      FROM invoices 
      GROUP BY yr
    `);
    console.table(yrRes.rows);

  } catch (err) {
    console.error('Error:', err);
  }
}

main();

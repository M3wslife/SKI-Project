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
    const res = await client.execute(`
      SELECT 
        strftime('%Y', datetime(timestamp/1000, 'unixepoch')) as yr, 
        COUNT(*) as cnt, 
        ROUND(SUM(net_amount), 0) as rev 
      FROM invoices 
      GROUP BY yr
    `);
    console.table(res.rows);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();

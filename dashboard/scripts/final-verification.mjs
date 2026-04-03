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
        COUNT(*) as cnt
      FROM invoices 
      GROUP BY yr
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    
    const res2 = await client.execute(`
      SELECT 
        strftime('%Y', datetime(timestamp/1000, 'unixepoch')) as yr, 
        COUNT(*) as cnt
      FROM invoice_items 
      GROUP BY yr
    `);
    console.log(JSON.stringify(res2.rows, null, 2));

  } catch (err) {
    console.error('Error:', err);
  }
}

main();

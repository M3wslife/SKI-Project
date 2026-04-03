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
        ROUND(SUM(pre_tax_amount), 0) as rev 
      FROM invoice_items 
      GROUP BY yr
    `);
    console.table(res.rows);
    
    const total = await client.execute(`
      SELECT 
        COUNT(*) as cnt, 
        ROUND(SUM(pre_tax_amount), 0) as rev 
      FROM invoice_items
    `);
    console.log('Overall Total:', total.rows[0]);
    
  } catch (err) {
    console.error('Error:', err);
  }
}

main();

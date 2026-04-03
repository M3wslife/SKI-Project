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
        strftime('%Y', date) as yr, 
        COUNT(*) as cnt
      FROM invoices 
      GROUP BY yr
    `);
    console.table(res.rows);
    
    // Check if there are any invoices without items
    const itemless = await client.execute(`
      SELECT COUNT(*) as cnt FROM invoices i
      WHERE NOT EXISTS (SELECT 1 FROM invoice_items it WHERE it.invoice_id = i.id)
    `);
    console.log('Invoices without items:', itemless.rows[0]);
    
  } catch (err) {
    console.error('Error:', err);
  }
}

main();

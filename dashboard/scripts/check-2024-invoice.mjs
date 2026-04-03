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
      SELECT net_amount, vat_amount, total, status
      FROM invoices 
      WHERE strftime('%Y', datetime(timestamp/1000, 'unixepoch')) = '2024' 
      LIMIT 1
    `);
    console.log('2024 Invoice Sample:', res.rows[0]);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();

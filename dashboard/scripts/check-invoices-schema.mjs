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
    const res = await client.execute("SELECT * FROM invoices LIMIT 1");
    if (res.rows.length > 0) {
      console.log('Invoice columns:', Object.keys(res.rows[0]));
    } else {
      console.log('No invoices found.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();

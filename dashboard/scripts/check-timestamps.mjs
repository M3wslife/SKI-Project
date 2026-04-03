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
    const res = await client.execute("SELECT timestamp, datetime(timestamp/1000, 'unixepoch') as dt FROM invoice_items LIMIT 5");
    console.log('Timestamps:', res.rows);
    
    // Check range for Jan 2026
    const jan2026Start = new Date('2026-01-01T00:00:00Z').getTime();
    const jan2026End = new Date('2026-02-01T00:00:00Z').getTime();
    console.log('Jan 2026 Range MS:', jan2026Start, jan2026End);
    
  } catch (err) {
    console.error('Error:', err);
  }
}

main();

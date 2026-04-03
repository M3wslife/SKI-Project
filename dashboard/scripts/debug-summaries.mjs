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
    const res = await client.execute("SELECT category, key FROM summaries WHERE category = 'pl'");
    const keys = res.rows.map(r => r.key);
    console.log('Profit & Loss Keys:', keys);
    
    const year2026Keys = keys.filter(k => k.startsWith('main:2026'));
    console.log('2026 Keys:', year2026Keys);
    
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
